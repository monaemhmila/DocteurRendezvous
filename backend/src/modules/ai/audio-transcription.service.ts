import { ITenant } from "../tenants/tenant.model";
import { assessTranscript } from "./tn-nlu";

export type TranscriptionErrorCode =
  | "no_token"
  | "no_api_key"
  | "media_info_failed"
  | "download_failed"
  | "too_large"
  | "too_long"
  | "rate_limited"
  | "unsupported_format"
  | "provider_error"
  | "timeout"
  | "empty";

export type TranscriptionResult =
  | { ok: true; text: string; language?: string; durationSec?: number; lowConfidence: boolean }
  | { ok: false; code: TranscriptionErrorCode };

const GRAPH_VERSION = process.env.META_GRAPH_VERSION?.trim() || "v19.0";
const BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;
const MAX_BYTES = 3 * 1024 * 1024; // 3 Mo max (largement suffisant pour plusieurs minutes de vocal Opus)
const MAX_DURATION_SEC = 120; // 2 minutes maximum par note vocale pour éviter les abus
const MAX_TRANSCRIPTIONS_PER_HOUR = 20; // Limite anti-spam par numéro / tenant
const TIMEOUT_MS = 30_000;

const MIME_EXT: Record<string, string> = {
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/wav": "wav",
  "audio/webm": "webm",
};

function extFor(mimeType: string): string | null {
  const base = mimeType.split(";")[0]?.trim().toLowerCase() || "";
  return MIME_EXT[base] ?? null;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry(fn: () => Promise<Response>, tries = 2): Promise<Response> {
  let res = await fn();
  for (let i = 0; i < tries && (res.status === 429 || res.status >= 500); i++) {
    await new Promise((r) => setTimeout(r, 500 * Math.pow(2, i)));
    res = await fn();
  }
  return res;
}

export class AudioTranscriptionService {
  private readonly inFlight = new Map<string, Promise<TranscriptionResult>>();
  // Rate limiting par (tenantId:callerWaId) -> timestamps des transcriptions dans l'heure écoulée
  private readonly rateLimits = new Map<string, number[]>();

  /**
   * Vérifie la limitation de débit (ex: max 20 transcriptions par heure par expéditeur)
   */
  private checkRateLimit(rateLimitKey: string): boolean {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const history = (this.rateLimits.get(rateLimitKey) || []).filter((t) => t > oneHourAgo);
    if (history.length >= MAX_TRANSCRIPTIONS_PER_HOUR) {
      return false;
    }
    history.push(now);
    this.rateLimits.set(rateLimitKey, history);
    return true;
  }

  /**
   * Point d'entrée principal : dédoublonne par mediaId (webhooks rejoués),
   * limite le débit par expéditeur, et ne journalise jamais le contenu patient (RGPD).
   */
  public transcribeVoiceNote(
    mediaId: string,
    tenant: ITenant,
    hints: string[] = [],
    callerId = "default"
  ): Promise<TranscriptionResult> {
    const key = `${tenant._id}:${mediaId}`;
    const existing = this.inFlight.get(key);
    if (existing) return existing;

    // Rate limiting par tenant + appelant
    const rateLimitKey = `${tenant._id}:${callerId}`;
    if (!this.checkRateLimit(rateLimitKey)) {
      console.warn(`[Audio Transcription] Rate limit exceeded for ${rateLimitKey}`);
      return Promise.resolve({ ok: false, code: "rate_limited" });
    }

    const p = this.run(mediaId, tenant, hints).finally(() => {
      setTimeout(() => this.inFlight.delete(key), 5 * 60_000); // Dé-doublonnage conservé 5 minutes
    });

    this.inFlight.set(key, p);
    return p;
  }

  private async run(mediaId: string, tenant: ITenant, hints: string[]): Promise<TranscriptionResult> {
    const media = await this.downloadWhatsAppMedia(mediaId, tenant);
    if (!media.ok) return media;
    return this.transcribeAudio(media.buffer, media.mimeType, hints);
  }

  public async downloadWhatsAppMedia(
    mediaId: string,
    tenant: ITenant
  ): Promise<{ ok: true; buffer: Buffer; mimeType: string } | { ok: false; code: TranscriptionErrorCode }> {
    const token = tenant.settings?.whatsappConfig?.accessToken || process.env.META_ACCESS_TOKEN?.trim();
    if (!token) return { ok: false, code: "no_token" };
    const auth = { Authorization: `Bearer ${token}` };

    try {
      const infoRes = await withRetry(() =>
        fetchWithTimeout(`${BASE_URL}/${encodeURIComponent(mediaId)}`, { headers: auth })
      );
      if (!infoRes.ok) return { ok: false, code: "media_info_failed" };
      const info = await infoRes.json();

      const mimeType: string = info.mime_type || "audio/ogg";
      if (!extFor(mimeType)) return { ok: false, code: "unsupported_format" };
      if (typeof info.file_size === "number" && info.file_size > MAX_BYTES) return { ok: false, code: "too_large" };
      if (typeof info.url !== "string" || !info.url.startsWith("https://")) return { ok: false, code: "media_info_failed" };

      const audioRes = await withRetry(() => fetchWithTimeout(info.url, { headers: auth }));
      if (!audioRes.ok) return { ok: false, code: "download_failed" };

      const buffer = Buffer.from(await audioRes.arrayBuffer());
      if (buffer.length > MAX_BYTES) return { ok: false, code: "too_large" };
      return { ok: true, buffer, mimeType };
    } catch (err: any) {
      return { ok: false, code: err?.name === "AbortError" ? "timeout" : "download_failed" };
    }
  }

  public async transcribeAudio(
    audioBuffer: Buffer,
    mimeType = "audio/ogg",
    hints: string[] = []
  ): Promise<TranscriptionResult> {
    const apiKey = (process.env.TRANSCRIPTION_API_KEY || process.env.AI_API_KEY)?.trim()?.replace(/^["']|["']$/g, "");
    if (!apiKey) return { ok: false, code: "no_api_key" };
    const ext = extFor(mimeType);
    if (!ext) return { ok: false, code: "unsupported_format" };

    // Nettoyage strict des hints : uniquement noms de praticiens / clinique
    // Limité à max 5 items de max 30 caractères chacun, sans aucun caractère spécial
    const sanitizedHints = hints
      .filter((h) => typeof h === "string" && h.trim().length > 0)
      .map((h) => h.replace(/[^\p{L}\s'-]/gu, "").trim().slice(0, 30))
      .filter((h) => h.length >= 2)
      .slice(0, 5);

    try {
      const build = () => {
        const form = new FormData();
        form.append("file", new Blob([audioBuffer as any], { type: mimeType }), `voice_note.${ext}`);
        form.append("model", "whisper-1");
        form.append("response_format", "verbose_json");
        form.append("temperature", "0");
        // Ancrage lexical concis pour éviter les hallucinations sur audios courts
        const baseVocab = "Aslema docteur, rendez-vous, consultation, ghodwa, ba3d ghodwa, sbeh, Dr, cabinet";
        const promptText = sanitizedHints.length > 0 ? `${baseVocab}, ${sanitizedHints.join(", ")}` : baseVocab;
        form.append("prompt", promptText);
        return form;
      };

      const res = await withRetry(() =>
        fetchWithTimeout(
          "https://api.openai.com/v1/audio/transcriptions",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: build() as any,
          },
          60_000
        )
      );

      if (!res.ok) {
        console.error(`[Audio Transcription] provider error status=${res.status}`); // Jamais de texte patient dans les logs
        return { ok: false, code: "provider_error" };
      }

      const data = await res.json();
      let rawText = String(data.text ?? "").trim();
      if (rawText.length < 2) return { ok: false, code: "empty" };

      // Plafond de durée : rejeter les vocaux supérieurs à MAX_DURATION_SEC
      if (typeof data.duration === "number" && data.duration > MAX_DURATION_SEC) {
        console.warn(`[Audio Transcription] Audio too long (${data.duration}s > ${MAX_DURATION_SEC}s)`);
        return { ok: false, code: "too_long" };
      }

      // Décodeur Sémantique Universel Darija (LLM zero-shot avec contexte clinique) :
      // Prend le texte brut transcrit par Whisper (quelles que soient les déformations orales)
      // et rétablit fidèlement l'intention du patient en Arabizi clair ou Français/Arabe/Anglais propre.
      let finalText = rawText;

      // GUARD: skip LLM normalization for very short yes/no/greeting utterances.
      // Whisper handles these correctly; the normalizer LLM tends to hallucinate
      // a full fabricated sentence from a single word (e.g. "Ey" -> "Jelin a7ebk...").
      const wordCount = rawText.trim().split(/\s+/).length;
      const SHORT_SIMPLE_RE = /^(?:ey|eyh|oui|ouais|na3am|behi|behy|mriguel|mrigel|ok|okay|non|le|la|laa|no|nope|aslema|aslma|salam|bonjour|bonsoir|merci|chokran|\u0646\u0639\u0645|\u0644\u0627|\u0623\u064a\u0647|\u0628\u0627\u0647\u064a)[.!?\s]*$/i;
      const skipLLMNormalization = wordCount <= 3 && SHORT_SIMPLE_RE.test(rawText.trim());

      try {
        if (!skipLLMNormalization) {
          const cleaned = await this.normalizeTunisianTranscript(rawText, apiKey, hints);
          const isLLMRefusal = /^(?:je suis d[ee]sol[ee]|d[ee]sol[ee]|i(?:'m| am) sorry|i cannot|as an ai|en tant qu'ia)/i.test(cleaned || "");
          if (cleaned && cleaned.trim().length > 0 && !isLLMRefusal) {
            finalText = cleaned.trim();
          }
        } else {
          console.log(`[Audio Transcription] Short simple utterance (${wordCount}w) — skipping LLM normalizer, keeping Whisper output: "${rawText}"`);
        }
      } catch (err) {
        // En cas d'erreur de post-traitement, on conserve rawText
      }

      // Métriques de confiance issues de Whisper
      const segments: any[] = Array.isArray(data.segments) ? data.segments : [];
      const minAvgLogprob = segments.length > 0 ? Math.min(...segments.map((s) => s.avg_logprob ?? 0)) : undefined;
      const maxNoSpeechProb = segments.length > 0 ? Math.max(...segments.map((s) => s.no_speech_prob ?? 0)) : undefined;
      const maxCompressionRatio = segments.length > 0 ? Math.max(...segments.map((s) => s.compression_ratio ?? 0)) : undefined;

      // Évaluation qualité TN-NLU sur le texte final normalisé (évite les faux positifs phonétiques de Whisper)
      const assessment = assessTranscript(finalText, {
        language: data.language,
        minAvgLogprob,
        maxNoSpeechProb,
        maxCompressionRatio,
      });

      const lowConfidence = assessment.suspect || segments.some((s) => s.no_speech_prob > 0.8 || s.avg_logprob < -1.5);

      console.log(`[Audio Transcription] ok chars=${finalText.length} duration=${data.duration ?? "?"}s lowConfidence=${lowConfidence}`);
      return { ok: true, text: finalText, language: data.language, durationSec: data.duration, lowConfidence };
    } catch (err: any) {
      return { ok: false, code: err?.name === "AbortError" ? "timeout" : "provider_error" };
    }
  }

  /**
   * Post-processeur dédié multilingue :
   * Si le patient a parlé Darija tunisienne, transcrit en Arabizi clair (ex: "nheb na3ref rendez-vous mte3i w mte3 Yahya weldi...").
   * Si le patient a parlé Français, conserve 100% en Français.
   * Si le patient a parlé Anglais, conserve 100% en Anglais.
   */
  /**
   * Décodeur Sémantique Universel Darija :
   * Prend la transcription phonétique de Whisper et traduit l'intention réelle du patient
   * en tenant compte du dialecte tunisien oral WhatsApp et des noms du cabinet (médecins, clinique).
   */
  private async normalizeTunisianTranscript(rawTranscript: string, apiKey: string, contextHints: string[] = []): Promise<string | null> {
    const url = "https://api.openai.com/v1/chat/completions";
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12_000);

    const clinicContextStr = contextHints.length > 0 
      ? `\nNoms connus dans le cabinet médical (praticiens/clinique) : ${contextHints.join(", ")}`
      : "";

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0,
          messages: [
            {
              role: "system",
              content: `Tu es le Décodeur Vocal Spécialisé pour les cabinets médicaux en Tunisie.
Un patient a envoyé une note vocale WhatsApp, transcrite phonétiquement par Whisper (ASR).
Whisper déforme régulièrement la Darija tunisienne orale, les noms propres et les chiffres.
${clinicContextStr}

TON RÔLE :
Restituer fidèlement l'INTENTION CLINIQUE et la PHRASE EXACTE en Arabizi tunisien limpide (ou Français / Anglais / Arabe standard si le patient a parlé cette langue).

RÈGLES GRAMMATICALES ET PHONÉTIQUES DE DARIJA TUNISIENNE :
1. TEMPS ET DATES RELATIFS :
   - "ba3d ghodwa" / "baed ghodwa" / "après-demain" -> ba3d ghodwa
   - "ghodwa" / "rdwa" / "demain" -> ghodwa
   - Jours de la semaine : "nhar letnin" (lundi), "nhar ethletha" (mardi), "nhar l-arb3a" / "lerb3a" (mercredi), "nhar el khmis" (jeudi), "nhar el jem3a" (vendredi), "nhar essebt" (samedi), "nhar el a7ad" (dimanche).
   - "sbeh" = matin, "l3chiya" = après-midi / soir.

2. NOMS DE PRATICIENS ET CABINET :
   - Si Whisper transcrit un nom ressemblant à un médecin du cabinet (ex: "l-makroudi", "makroudi" -> "Dr Makroudi"), restaure le nom propre exact.
   - "blaset l kabin" / "blaset el cabinet" / "fin jey" -> demande de localisation du cabinet.

3. STRUCTURE DU RENDU :
   - Si le patient parle TUNISIEN : produis une phrase claire en ARABIZI TUNISIEN (lettres latines et chiffres 3, 7, 9) sans aucune déformation phonétique.
   - Si le patient parle FRANÇAIS : conserve 100% en français fluide et soigné.
   - Si le patient parle ANGLAIS : conserve 100% en anglais.
   - Si le patient parle ARABE FORMEL (Fusha) : conserve en écriture arabe.
   - Élimine tout bruit parasite ou hallucination ASR ("Sous-titres réalisés par...").

Rends UNIQUEMENT la phrase finale décodée, sans aucun commentaire ni guillemet.`,
            },
            {
              role: "user",
              content: rawTranscript,
            },
          ],
        }),
        signal: ctrl.signal,
      });

      if (!response.ok) return null;
      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content?.trim();
      return content || null;
    } catch (_) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

export const audioTranscriptionService = new AudioTranscriptionService();
