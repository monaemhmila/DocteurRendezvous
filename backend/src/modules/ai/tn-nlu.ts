/**
 * tn-nlu.ts — couche DÉTERMINISTE pour l'assistant WhatsApp (dérija tunisienne).
 *
 * Principe : tout ce qui décide d'une ACTION (oui/non, heure, langue, état d'une
 * confirmation) est calculé ici, par le code. Le LLM sert seulement à comprendre
 * une demande ouverte et à répondre aux questions d'information.
 *
 * Aucune dépendance externe.
 */

export type Lang = "fr" | "tn-arabizi" | "ar" | "ar-msa" | "en";

/* ════════════════════════ Normalisation ════════════════════════ */

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F\u0640]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/(.)\1{2,}/gu, "$1$1") // "leeee" -> "lee"
    .replace(/[’`]/g, "'")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ════════════════════════ Oui / Non ════════════════════════ */

const YES = new Set([
  "oui", "ey", "eyh", "eyy", "ay", "ouais", "behi", "behy", "behey", "mriguel", "mrigel",
  "mriguell", "mrigl", "ok", "okay", "okey", "oki", "daccord", "d'accord", "confirme",
  "confirmer", "confirmi", "yes", "yep", "yeah", "sure", "tamem", "tamam", "sah",
  "نعم", "ايه", "اي", "اه", "اوكي", "موافق", "باهي", "مريقل", "نوكد", "اكد", "اكيد",
]);

const NO = new Set([
  "non", "no", "nn", "nope", "nah", "le", "lee", "la", "laa",
  "لا", "لاء", "موش", "مانيش", "ماني",
]);

// Négations "fortes" : suffisent même dans une phrase longue ("menhebech nbadel").
const NEG_STRONG = new Set([
  "menhebech", "menhebch", "manhebech", "manhebch", "mnhebch", "mnhebech", "nhebech", "nhebch",
  "مانيش", "منحبش", "ماني",
]);

// Mots d'accompagnement sans valeur de décision.
const FILLER = new Set([
  "w", "wa", "et", "merci", "chokran", "shokran", "aychek", "3aychek", "3ichek", "barak",
  "allah", "fik", "svp", "stp", "please", "plz", "belehy", "belehi", "aman", "min", "fadhlek",
  "el", "hedha", "hetha", "taw", "tawa", "tawwa", "bien", "bon", "parfait", "docteur",
  "doctour", "dr", "ya", "madame", "monsieur", "rendezvous", "rendez-vous", "rdv",
  "شكرا", "يعطيك", "الصحة",
]);

export type YesNo = "yes" | "no" | "ambiguous";

export function parseYesNo(text: string): YesNo {
  const n = normalize(text);
  if (!n) return "ambiguous";
  const tokens = n.split(" ");

  // "mouch behi", "pas d'accord", "non ok" -> non
  if (/(?:^| )(?:mouch|mech|mich|pas|non) (?:behi|behy|mriguel|mrigel|ok|d'accord|daccord|bon)(?: |$)/.test(n)) {
    return "no";
  }
  if (/(?:^| )ma n?hebch?(?: |$)/.test(n)) return "no";

  const strongNo = tokens.some((t) => NEG_STRONG.has(t));
  const hasYes = tokens.some((t) => YES.has(t));
  const hasNo = tokens.some((t) => NO.has(t));
  const onlyYes = tokens.every((t) => YES.has(t) || FILLER.has(t));
  const onlyNo = tokens.every((t) => NO.has(t) || FILLER.has(t));

  if (strongNo && !hasYes) return "no";
  if (hasYes && onlyYes && !strongNo) return "yes";
  if (hasNo && onlyNo) return "no";
  return "ambiguous"; // ex: "ey mouch lyoum", "oui mais mercredi", "efhem"
}

/* ════════════════════════ Heures en dérija ════════════════════════ */

const WORD_HOURS: Record<string, number> = {
  // 1-4 : ambigus ("wahed" = un/quelqu'un, "el arb3a" = mercredi) -> exigent un suffixe ("w nos") ou "sa3a"
  wahed: 1, wa7ed: 1, wahda: 1, wa7da: 1,
  zouz: 2, zouj: 2, zoz: 2,
  thletha: 3, tleta: 3, thlatha: 3, tlata: 3, thleta: 3,
  arb3a: 4, arba3a: 4,
  // 5-12
  khamsa: 5, "5amsa": 5, khemsa: 5,
  setta: 6, sitta: 6, seta: 6,
  sab3a: 7, seb3a: 7,
  thmenya: 8, thmania: 8, thmeniya: 8, thmanya: 8, tmenya: 8, tmania: 8, thmenia: 8, thmaniya: 8,
  tes3a: 9, tessa3: 9, tessa3a: 9, tessa: 9, tis3a: 9, taz3a: 9, tez3a: 9, tess3a: 9, tiss3a: 9,
  "3achra": 10, "3ashra": 10, achra: 10, "3achera": 10,
  ahdech: 11, hdech: 11, "7dech": 11, ahdach: 11, "7dach": 11,
  tnach: 12, tnash: 12, tnech: 12,
};
const RISKY = new Set([
  "wahed", "wa7ed", "wahda", "wa7da", "zouz", "zouj", "zoz",
  "thletha", "tleta", "thlatha", "tlata", "thleta", "arb3a", "arba3a"
]);

const HOUR_WORDS = Object.keys(WORD_HOURS)
  .sort((a, b) => b.length - a.length)
  .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

const TIME_RE = new RegExp(
  `(?<![\\p{L}\\p{N}:.,])(?<h>${HOUR_WORDS}|\\d{1,2})` +
    `(?:\\s*(?<hl>h(?:eures?)?)\\s*(?<hm>\\d{2})?|[:.,](?<m>\\d{1,2}))?` +
    `(?:\\s*(?:w|et|&)\\s*(?<half>nos|nsf|nus|nous|demi|demie)` +
    `|\\s*(?:w|et|&)\\s*(?<q>roub3|rob3|rbe3|quart)` +
    `|\\s*(?:ella|ila|illa|moins)\\s*(?:le\\s+)?(?<mq>roub3|rob3|rbe3|quart))?` +
    `(?![\\p{L}\\p{N}])`,
  "giu"
);

const PREFIX_RE =
  /(?:^|[\s,;:!?(])(?:l|el|a|à|3la|ala|ll|lel|vers|pour|m3a|sa3a|saa3a|nheb|n7eb|nhab|theb|t7eb|veux|voudrais|khalih|khalli|khali|fi)\s*$/;
const SA3A_RE = /(?:sa3a|saa3a|sa3et)\s*$/;
const NEGATION_BEFORE_RE = /(?:mech|mouch|mich|pas|non|sans)\s*(?:l|el|a|à|3la)?\s*$/;
const MONTH_AFTER_RE =
  /^(?:janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre|janv|fevr|sept|oct|nov|dec)\b/;
const SUFFIX_TIME_RE =
  /^\s*(?:sbeh|sba7|sab7|l3chiya|3chiya|3chia|la3chiya|matin|soir|apres-midi|après-midi|pm|am|mta3|mte3)\b/;

export interface TimeMatch {
  hhmm: string;
  hour: number;
  minute: number;
  negated: boolean;
  index: number;
  text: string;
}
export interface TimeOpts {
  /** Les heures strictement inférieures sont lues l'après-midi (défaut 8 : "5" -> 17h, "9" -> 9h). */
  pmBelow?: number;
}

function resolveHour(h: number, ctx: string, pmBelow: number): number | null {
  if (h < 0 || h > 23) return null;
  if (h >= 13 || h === 0) return h;
  const am = /(sbeh|sba7|sab7|matin|\bam\b)/.test(ctx);
  const pm = /(3chiya|l3chiya|3chia|ba3d|apres|après|midi|soir|\bpm\b)/.test(ctx);
  if (am && !pm) return h;
  if (pm && !am) return h === 12 ? 12 : h + 12;
  if (h === 12) return 12;
  return h < pmBelow ? h + 12 : h;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function extractTimes(text: string, opts: TimeOpts = {}): TimeMatch[] {
  const pmBelow = opts.pmBelow ?? 8;
  const src = text.toLowerCase();
  const out: TimeMatch[] = [];

  for (const m of src.matchAll(TIME_RE)) {
    const g = m.groups ?? {};
    const idx = m.index ?? 0;
    const end = idx + m[0].length;
    const hRaw = g.h;
    const isWord = WORD_HOURS[hRaw.toLowerCase()] !== undefined;
    const explicit = Boolean(g.hl || g.m || g.half || g.q || g.mq);
    const before = src.slice(0, idx);
    const after = src.slice(end);

    let hour = isWord ? WORD_HOURS[hRaw.toLowerCase()] : parseInt(hRaw, 10);
    let minute = 0;
    if (g.hm) minute = parseInt(g.hm, 10);
    else if (g.m !== undefined) {
      if (g.m.length === 2) minute = parseInt(g.m, 10);
      else if (g.m === "5") minute = 30; // "8.5" -> 8h30
      else continue;
    }
    if (g.half) minute = 30;
    if (g.q) minute = 15;
    if (g.mq) { hour -= 1; minute = 45; }

    if (!explicit) {
      if (isWord) {
        if (RISKY.has(hRaw) && !SA3A_RE.test(before)) continue;
      } else {
        const hasTimeSuffix = SUFFIX_TIME_RE.test(after);
        const bareMessage = /^\s*$/.test(before) && /^\s*[.!?]*\s*$/.test(after);
        if (!bareMessage && !PREFIX_RE.test(before) && !hasTimeSuffix) continue;
        if (MONTH_AFTER_RE.test(normalize(after.slice(0, 16)))) continue; // "l 12 octobre" = date
      }
    }
    if (minute > 59) continue;
    const hh = resolveHour(hour, src, pmBelow);
    if (hh === null) continue;

    out.push({
      hhmm: `${pad(hh)}:${pad(minute)}`,
      hour: hh,
      minute,
      negated: NEGATION_BEFORE_RE.test(before.slice(-18)),
      index: idx,
      text: m[0],
    });
  }
  return out;
}

/** Première heure demandée qui n'est pas niée ("nheb 9 mech 8 w nos" -> 09:00). */
export function pickWantedTime(text: string, opts: TimeOpts = {}): TimeMatch | null {
  return extractTimes(text, opts).find((t) => !t.negated) ?? null;
}

/* ════════════════════════ Dates / heures affichées ════════════════════════ */

const WEEKDAYS: Record<Lang, string[]> = {
  "tn-arabizi": ["el a7ad", "el tnin", "ethletha", "el arb3a", "el khmis", "el jem3a", "essebt"],
  fr: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  ar: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
  "ar-msa": ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
};
const MONTHS: Record<Lang, string[]> = {
  fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
  "tn-arabizi": ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  ar: ["جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان", "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
  "ar-msa": ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
};

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "2026-10-12" -> "ghodwa (el tnin 12 octobre)" | "nhar el jem3a 16 octobre" ... Jamais de format ISO au patient. */
export function formatDate(iso: string, lang: Lang, todayIso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const wd = WEEKDAYS[lang][d.getUTCDay()];
  const label = `${wd} ${d.getUTCDate()} ${MONTHS[lang][d.getUTCMonth()]}`;
  const rel = iso === todayIso ? 0 : iso === addDays(todayIso, 1) ? 1 : -1;
  const words: Record<Lang, [string, string, string]> = {
    "tn-arabizi": ["lyoum", "ghodwa", "nhar"],
    fr: ["aujourd'hui", "demain", "le"],
    en: ["today", "tomorrow", "on"],
    ar: ["اليوم", "غدوة", "نهار"],
    "ar-msa": ["اليوم", "غداً", "يوم"],
  };
  const [today, tomorrow, other] = words[lang];
  if (rel === 0) return `${today} (${label})`;
  if (rel === 1) return `${tomorrow} (${label})`;
  return `${other} ${label}`;
}

/** "09:30" -> "9h30", "09:00" -> "9h" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return m === 0 ? `${h}h` : `${h}h${pad(m)}`;
}

/* ════════════════════════ Langue : détection, verrou, validation ════════════════════════ */

const FR_WORDS = new Set([
  "bonjour", "bonsoir", "je", "j'ai", "vous", "nous", "est", "sont", "pour", "avec", "dans", "sur",
  "que", "qui", "pas", "mon", "mes", "votre", "vos", "svp", "merci", "voudrais", "souhaite", "veux",
  "peux", "puis", "demain", "aujourd'hui", "mais", "un", "une", "des", "les", "du", "au", "aux",
  "comment", "quand", "quel", "quelle", "combien", "disponible", "besoin", "bien",
]);
const EN_WORDS = new Set([
  "the", "is", "are", "i", "you", "my", "your", "appointment", "please", "hello", "hi", "thanks",
  "thank", "want", "would", "can", "tomorrow", "today", "need", "what", "when", "how", "with", "for", "and",
]);
const TN_WORDS = new Set([
  "ghodwa", "lyoum", "taw", "tawa", "tawwa", "nheb", "n7eb", "theb", "t7eb", "mte3i", "mte3ek", "mta3",
  "mte3", "aleh", "3leh", "chnowa", "chnia", "kifech", "wa9t", "wa9tech", "ey", "mriguel", "aychek",
  "weldi", "weldek", "benti", "3andi", "3andek", "ena", "enti", "huwa", "win", "leh", "yezzi", "famma",
  "fama", "famech", "barcha", "haka", "hakka", "hak", "haya", "sbeh", "sba7", "l3chiya", "el", "w",
  "bech", "besh", "mouch", "mech", "nji", "tji", "yji", "najem", "tnajem", "9olli", "9oul", "aman",
  "belehy", "belehi", "aslema", "aslama", "salem", "marhba", "yarhem", "rabbi", "inchallah",
  "inchaallah", "hamdoullah", "sahit", "ma3neha", "mafhemtch", "fhemt", "sma3t", "3aychek", "behi", "behy",
]);

const ARABIC_RE = /[\u0600-\u06FF]/g;
const TIME_TOKEN_RE = /^\d{1,2}(?:h|eme|e|er|min|mn)\d*$/;

/** Langue d'un message TAPÉ. null = trop court / pas assez d'indices pour voter. */
export function detectMessageLang(text: string): Lang | null {
  const t = text.trim();
  const letters = (t.match(/\p{L}/gu) ?? []).length;
  if (!letters) return null;
  const arabic = (t.match(ARABIC_RE) ?? []).length;
  if (arabic / letters > 0.5) return "ar";

  const tokens = normalize(t).split(" ").filter(Boolean);
  const n = tokens.length;
  if (n < 2) return null;
  let fr = 0, en = 0, tn = 0;
  for (const tok of tokens) {
    if (FR_WORDS.has(tok)) fr++;
    if (EN_WORDS.has(tok)) en++;
    if (TN_WORDS.has(tok) || (/[a-z]/.test(tok) && /[2356789]/.test(tok) && !TIME_TOKEN_RE.test(tok))) tn++;
  }
  if (fr >= 2 && fr / n >= 0.25 && fr > tn) return "fr";
  if (en >= 2 && en / n >= 0.4 && en > tn) return "en";
  if (tn >= 1) return "tn-arabizi";
  if (n >= 4 && fr < 2) return "tn-arabizi";
  return null;
}

/**
 * Verrou de langue collant. À appeler avec les messages TAPÉS du patient seulement.
 */
export function computeLanguageLock(prev: Lang | undefined, typedMessages: string[], fallback: Lang): Lang {
  const votes = typedMessages.map(detectMessageLang).filter((v): v is Lang => v !== null);
  if (votes.length === 0) return prev ?? fallback;
  if (!prev) {
    const counts = new Map<Lang, number>();
    for (const v of votes.slice(-5)) counts.set(v, (counts.get(v) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  const last2 = votes.slice(-2);
  if (last2.length === 2 && last2[0] === last2[1] && last2[0] !== prev) return last2[0];
  return prev;
}

const FR_STRICT = new Set([
  "le", "la", "les", "des", "un", "une", "est", "sont", "pour", "avec", "dans", "vous", "votre", "vos",
  "je", "nous", "que", "qui", "mais", "besoin", "autre", "chose", "n'hesitez", "n'hesite", "demander",
  "tu", "ton", "ta", "tes", "suis", "sera", "avez", "souhaitez", "voulez", "pouvez", "peux", "aider",
]);
const FOREIGN_DIALECT = ["smahli", "chhal", "daba", "wakha", "bzaf", "3afak", "3afek", "3ashan", "homesh", "innah", "ahlan"];

export interface ReplyCheck { ok: boolean; problems: string[] }

/** Contrôle de la réponse du LLM AVANT envoi. Si !ok : utiliser un modèle (TPL). */
export function validateReplyLanguage(reply: string, lang: Lang): ReplyCheck {
  const problems: string[] = [];
  const hasArabic = ARABIC_RE.test(reply);
  ARABIC_RE.lastIndex = 0;
  const tokens = normalize(reply).split(" ").filter(Boolean);

  if (lang === "tn-arabizi") {
    if (hasArabic) problems.push("arabic_script_in_arabizi");
    const fr = tokens.filter((t) => FR_STRICT.has(t));
    if (new Set(fr).size >= 2) problems.push("french_sentence_in_arabizi");
    if (FOREIGN_DIALECT.some((w) => tokens.includes(w))) problems.push("foreign_dialect_word");
  } else if (lang === "fr") {
    if (hasArabic) problems.push("arabic_script_in_french");
    if (/\b(tu|ton|ta|tes|toi|n'hésite|n'hesite)\b/i.test(reply)) problems.push("tutoiement");
    if (tokens.some((t) => ["maandich", "mouchkil", "marhba", "behy"].includes(t))) problems.push("tunisian_word_in_french");
  } else if (lang === "ar" || lang === "ar-msa") {
    const latin = (reply.match(/[a-z]{3,}/gi) ?? []).filter((w) => !/^(rendez|vous|cabinet|secretariat)$/i.test(w));
    if (latin.length >= 2) problems.push("latin_words_in_arabic");
  } else if (lang === "en") {
    if (hasArabic) problems.push("arabic_script_in_english");
    const fr = tokens.filter((t) => FR_STRICT.has(t));
    if (new Set(fr).size >= 3) problems.push("french_sentence_in_english");
  }
  // Script mélangé dans un même mot : "Nعتذر"
  if (/[A-Za-z][\u0600-\u06FF]|[\u0600-\u06FF][A-Za-z]/.test(reply)) problems.push("mixed_script_word");
  return { ok: problems.length === 0, problems };
}

/* ════════════════════════ Qualité d'une transcription vocale ════════════════════════ */

export interface AsrMeta {
  language?: string;           // verbose_json.language (ex: "arabic")
  minAvgLogprob?: number;      // min des segments[].avg_logprob
  maxCompressionRatio?: number;
  maxNoSpeechProb?: number;
}
const NON_TUNISIAN_MARKERS = new Set([
  "homesh", "innah", "limadha", "lakin", "hadha", "hatha", "madha", "kayfa", "ayna", "daba", "bzaf",
  "zaf", "wakha", "3afak", "3ashan",
  "ماذا", "لماذا", "لكن", "إنه", "اين",
]);

/** Si suspect : ne déclencher AUCUNE action, demander d'écrire. */
export function assessTranscript(text: string, meta: AsrMeta = {}): { suspect: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const tokens = normalize(text).split(" ").filter(Boolean);
  if (tokens.length < 2) reasons.push("too_short");
  if (meta.language && !["arabic", "french", "english"].includes(meta.language.toLowerCase())) reasons.push("language_unexpected");
  if (meta.minAvgLogprob !== undefined && meta.minAvgLogprob < -0.8) reasons.push("low_logprob");
  if (meta.maxCompressionRatio !== undefined && meta.maxCompressionRatio > 2.2) reasons.push("high_compression");
  if (meta.maxNoSpeechProb !== undefined && meta.maxNoSpeechProb > 0.5) reasons.push("no_speech");
  if (tokens.some((t) => NON_TUNISIAN_MARKERS.has(t))) reasons.push("non_tunisian_markers");
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  if ([...freq.values()].some((c) => c >= 4)) reasons.push("repetition");
  return { suspect: reasons.length > 0, reasons };
}

/* ════════════════════════ Modèles de messages (jamais générés par le LLM) ════════════════════════ */

import { TPL, t, type TplParams, type Tpl } from "./tn-templates";
export { TPL, t, type TplParams, type Tpl };

/* ════════════════════════ Confirmation d'action : machine à états ════════════════════════ */

export interface PendingAction {
  kind: "reschedule" | "book" | "cancel";
  appointmentId?: string;
  who: string;          // prénom affiché dans les messages
  date: string;         // YYYY-MM-DD
  fromTime?: string;    // HH:MM — rendez-vous actuel
  toTime?: string;      // HH:MM — créneau proposé
  asks: number;         // relances déjà faites
  expiresAt: number;    // epoch ms
}

export type Resolution =
  | { type: "execute"; action: PendingAction }                       // exécuter EXACTEMENT cette action stockée
  | { type: "keep"; reply: string }                                  // rien ne change, effacer l'état
  | { type: "counter"; action: PendingAction; reply: string }        // nouveau créneau, à reconfirmer (aucune écriture)
  | { type: "reask"; action: PendingAction; reply: string }
  | { type: "escalate"; reply: string }
  | { type: "expired"; reply: string };

export const MAX_REASKS = 2;
export const PENDING_TTL_MS = 20 * 60_000;

export interface ResolveCtx { lang: Lang; todayIso: string; now: number; time?: TimeOpts }

export function confirmationText(p: PendingAction, lang: Lang, todayIso: string): string {
  const params: TplParams = {
    who: p.who,
    date: formatDate(p.date, lang, todayIso),
    from: p.fromTime ? formatTime(p.fromTime) : undefined,
    to: p.toTime ? formatTime(p.toTime) : undefined,
    time: p.fromTime ? formatTime(p.fromTime) : p.toTime ? formatTime(p.toTime) : undefined,
  };
  return t(lang, p.kind === "reschedule" ? "confirmReschedule" : p.kind === "book" ? "confirmBook" : "confirmCancel", params);
}

export function resolvePending(p: PendingAction, text: string, ctx: ResolveCtx): Resolution {
  const { lang, todayIso, now } = ctx;
  if (now > p.expiresAt) return { type: "expired", reply: t(lang, "expired") };

  const yn = parseYesNo(text);
  const wanted = p.kind === "cancel" ? null : pickWantedTime(text, ctx.time);

  const keep = (): Resolution => ({
    type: "keep",
    reply: p.kind === "book"
      ? t(lang, "nothingBooked")
      : t(lang, "keep", { who: p.who, date: formatDate(p.date, lang, todayIso), time: formatTime(p.fromTime ?? p.toTime ?? "00:00") }),
  });

  if (yn === "yes") return { type: "execute", action: p };
  if (wanted && wanted.hhmm === p.toTime && yn !== "no") return { type: "execute", action: p }; // "9 w nos mriguel"
  if (wanted && p.fromTime && wanted.hhmm === p.fromTime) return keep();                         // "khalih el 9"

  if (wanted && wanted.hhmm !== p.toTime) {
    const next: PendingAction = { ...p, kind: p.kind === "cancel" ? "reschedule" : p.kind, toTime: wanted.hhmm, asks: 0, expiresAt: now + PENDING_TTL_MS };
    return { type: "counter", action: next, reply: confirmationText(next, lang, todayIso) };
  }
  if (yn === "no") return keep();

  if (p.asks >= MAX_REASKS) return { type: "escalate", reply: t(lang, "escalate") };
  const next = { ...p, asks: p.asks + 1 };
  return { type: "reask", action: next, reply: `${t(lang, "reask")}\n${confirmationText(next, lang, todayIso)}` };
}
