import { Patient } from "../patients/patient.model";

// ──────────────────────────────────────────────────────────────────────────────
// Time normalization
// ──────────────────────────────────────────────────────────────────────────────
export function normalizeTime(timeStr?: string): string {
  if (!timeStr) return "09:00";
  const clean = timeStr.trim().toLowerCase().replace("h", ":");
  const parts = clean.split(":");
  const h = (parts[0] || "9").padStart(2, "0");
  const m = (parts[1] || "00").padStart(2, "0");
  return `${h}:${m}`;
}

export function formatTimeRange(start: string, end: string): string {
  return `${start} - ${end}`;
}

export function extractTimeFromMessage(text: string): string | null {
  const lower = text.toLowerCase().trim();
  // Phase 3: Deterministic extraction covering formats like "10h30", "10 h 30", "10:30", "10h", "10 h", "à 10h30"

  // Format: 10 h 30 or 10h30 or 14h 30
  const m1 = lower.match(/\b(\d{1,2})\s*h\s*(\d{2})\b/);
  if (m1) {
    const h = m1[1].padStart(2, "0");
    const min = m1[2];
    return `${h}:${min}`;
  }

  // Format: 10:30, 9:00
  const m3 = lower.match(/\b(\d{1,2}):(\d{2})\b/);
  if (m3) {
    const h = m3[1].padStart(2, "0");
    const min = m3[2];
    return `${h}:${min}`;
  }

  // Format: 10h, 9h, 14h (hour only, minutes = 00), with or without spaces
  const m2 = lower.match(/\b(\d{1,2})\s*h\b/);
  if (m2) {
    const h = m2[1].padStart(2, "0");
    return `${h}:00`;
  }

  // Format: "9 w nos", "10 w nos" (Tunisian for 'and a half' -> :30)
  const m4 = lower.match(/\b(\d{1,2})\s*w\s*nos\b/);
  if (m4) {
    const h = m4[1].padStart(2, "0");
    return `${h}:30`;
  }

  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Patient helpers
// ──────────────────────────────────────────────────────────────────────────────
export function extractPatientNameFromText(text: string): { firstName?: string; lastName?: string } | null {
  if (!text) return null;
  const match1 = text.match(/(?:je m'appelle|moi c'est|mon nom est|je suis)\s+([A-Za-zÀ-ÿ\-]+)\s+([A-Za-zÀ-ÿ\-]+)/i);
  if (match1) {
    return { firstName: match1[1], lastName: match1[2] };
  }
  const match2 = text.match(/(?:nom\s*(?:et\s*pr[ée]nom)?)\s*[:\-]\s*([A-Za-zÀ-ÿ\-]+)\s+([A-Za-zÀ-ÿ\-]+)/i);
  if (match2) {
    return { firstName: match2[1], lastName: match2[2] };
  }
  return null;
}

export function isPlaceholderPatient(p: any): boolean {
  if (!p || !p.firstName || p.firstName === "Patient" || p.lastName === "WhatsApp") return true;
  // Status "lead" means auto-created from WhatsApp - not a confirmed identity
  if (p.status === "lead") return true;
  // No last name means identity is incomplete (WhatsApp only gives display name)
  if (!p.lastName) return true;
  // Emoji in first name or last name suggests WhatsApp display name, not real civil identity
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/u;
  if (emojiRegex.test(p.firstName) || emojiRegex.test(p.lastName)) return true;

  // If the lastName is just a single character or punctuation, it's not a real last name
  if (p.lastName.trim().length < 2) return true;

  return false;
}

// ──────────────────────────────────────────────────────────────────────────────
// Language Detection (Phase 6.17.1)
// ──────────────────────────────────────────────────────────────────────────────
export const TUNISIAN_ARABIZI_KEYWORDS = new Set([
  // الموافقة والتحية
  "ey", "ee", "eey", "behy", "behi", "bahi", "bahy", "mrigel", "mrigla", "marhba",
  "mar7bé", "mar7be", "mar7ba", "aslema", "asslema", "ahlan", "sbeh el khir",
  "sbeh ennour", "masa el khir", "masa ennour", "tesba7 ala khir", "y3aychek",
  "aychek", "ya3aychek", "chokrane", "chokran", "barakallah fik", "rabbi y3aychek",
  // الأسئلة
  "chnowa", "chnoua", "chnouwa", "chneya", "chkoun", "chkouni", "kifech", "kifeh",
  "kifach", "win", "fwin", "we9tech", "wa9tech", "wa9t", "9adech", "3lech",
  "aléch", "alech", "3lah", "chneya rayek", "chnowa rayek", "kifech na3mel", "chnowa na3mel",
  // الضمائر والكلمات اليومية
  "ena", "eni", "ana", "inti", "enti", "ente", "houwa", "hiya", "ahna", "7na",
  "hom", "houma", "mte3i", "mta3i", "mte3ek", "mta3ek", "mte3ou", "mta3ou",
  "mte3ha", "mta3ha", "mte3na", "mta3na", "mte3hom", "mta3hom", "andi", "3andi",
  "andek", "3andek", "andou", "3andou", "andha", "3andha", "andna", "3andna",
  "andhom", "3andhom", "mouch", "mech", "mish", "mouchi", "fama", "famma",
  "thama", "thamma", "famech", "fammach", "mafamech", "ma3adech",
  // الوقت والتاريخ
  "taw", "tawa", "tawwa", "lyoum", "l youm", "ghodwa", "ghedwa", "ba3d ghodwa",
  "bar7", "ber7", "sbeh", "sbe7", "l3chiya", "la3chiya", "lil", "elli", "nhar",
  "nharha", "nharin", "jem3a", "esbet", "sebt", "ahad", "ithnin", "thletha",
  "larb3a", "larb3", "khamis", "thnin", "jme3a", "jewi", "mars", "avril", "mai",
  "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
  // الحجز والمواعيد
  "rendez-vous", "rendez vous", "rdv", "rendez", "maw3ed", "maw3edek",
  "maw3ed mte3i", "nheb na3mel rendez-vous", "n7eb na3mel rendez-vous",
  "nheb na7جز", "n7eb na7جز", "nheb n9ayed", "n7eb n9ayed", "n9ayed",
  "n9ayedlek", "na9yed", "na9yedli", "nekhou maw3ed", "nakhou maw3ed",
  "na5ou maw3ed", "najem na5ou", "najem nakhou", "najmou", "najem",
  "bech na5ou", "bch nakhou", "bech nji", "bch nji", "nheb nji", "n7eb nji",
  "theb", "t7eb", "t7ebbou", "na3mel", "na3mil", "na3addi", "nji",
  "nejjem nji", "ynajem", "ynajjem", "mawjoud", "mawjoudch", "aw9at", "wa9t feragh", "blasa",
  // تغيير أو إلغاء الموعد
  "nbaddel", "nبدل", "nbadal", "n7eb nbaddel", "nheb nbaddel", "nbaddel el maw3ed",
  "nheb nreporti", "n7eb nreporti", "nreporti", "nraja3", "nrajja3", "n5alliha",
  "nkhalliha", "nلغيه", "nelghi", "nلغي", "nheb nelghi", "n7eb nelghi",
  "nheb nwa9ef", "n7eb nwa9ef", "ma najemch nji", "ma najemch", "mech bech nji",
  "baddelouli", "badalouli",
  // أسماء أفراد العائلة
  "weldi", "ibni", "benti", "bنتي", "binti", "bent i", "ommi", "omi", "momi",
  "bouya", "baba", "beya", "mraتي", "marti", "merti", "rajli", "rajel i",
  "khouya", "5ouya", "okhti", "o5ti", "jaddi", "jedd i", "jeddati", "jeddi",
  "3ammi", "3amti", "5ali", "5alti", "sahbi", "sa7bi", "s7abi", "sa7bti",
  "qaribi", "9ribi", "famillti", "3ayelti",
  // كلمات الطلب واللطف
  "belehy", "belehi", "bellehi", "bellehy", "brabi", "barra", "aman",
  "min fadhlik", "men fadhlik", "law sama7t", "sama7ni", "samahni", "sema7ni",
  "sma7ni", "3afsek", "afek", "ya3tik essa7a", "rabbi yfadhelik", "nchallah",
  "inchallah", "inchaallah",
  // كلمات المحادثة اليومية
  "hakka", "haka", "hakkaكا", "khater", "5ater", "ama", "amma", "walla",
  "wallah", "bel7a9", "belha9", "s7i7", "sa7i7", "bravo", "barcha", "barsha",
  "yesser", "yeser", "chwaya", "chweya", "chway", "kol", "koll", "kol chay",
  "kolchi", "zeda", "m3a", "ma3a", "ba3d", "9bal", "tawa", "taw", "yezzi",
  "zid", "zidni", "a3tini", "atini", "9olli", "9oul li", "a7kili", "ahkili",
  "nchouf", "nchoufou", "nchouflek", "nethabt", "net2aked", "fhemtek", "fhemt",
  "ma fhemtch", "s7it", "mrigel", "mrigla",
  // التأكيد أو الموافقة
  "na3am", "naam", "nwa9ef", "nأكد", "nأكدلك", "n2aked", "n2akedlek",
  "confirmi", "ey na5ou", "ey nji", "ey behy",
  // كلمات الرفض أو التصحيح
  "laa", "lee", "mouch haka", "mech haka", "mouch hedha",
  "mech hedha", "ghalet", "ghalta", "salla7", "salla7li",
  "nعاود", "n3awed", "na3awed", "men lowel", "mel lowel",
  // مفردات المكان والخدمات
  "tbib", "tabib", "sekretaria", "sbitar", "numro", "tri9", "9riba", "ba3ida",
  // المشاعر أو طلب المساعدة
  "ta3eb", "ta3bana", "waja3", "waj3a", "yوجعني", "yoj3ni", "nesta7a9",
  "n7eb nes2el", "nheb nes2el", "s2el", "souel", "mochkel", "mouchkla",
  "moshkel", "m3a9ed", "ma fhemtch", "fhemni", "fassarli", "awdha7li",
  "3aweni", "a3aweni", "najem tes3edni", "tnajem tsa3edni"
]);

export const FRENCH_LANGUAGE_KEYWORDS = new Set([
  "pour", "votre", "vous", "je", "merci", "bonjour", "oui", "non", "desole", "désolé",
  "parfait", "bien", "sur", "sûr", "le", "la", "les", "mon", "ma", "mes", "ton",
  "ta", "tes", "rendez-vous", "rendezvous", "rdv", "un", "une", "des", "du", "de",
  "est", "sont", "nous", "avec", "dans", "demain", "aujourd'hui",
  "aujourdhui", "veux", "voudrais", "prendre", "consultation", "docteur",
  "s'il", "plait", "plaît", "svp", "cabinet", "disponibilite", "horaires", "quand",
]);

export const TIME_TOKEN_REGEX = /^\d{1,2}h\d{0,2}$/i;
export const ARABIZI_DIGIT_TOKEN_REGEX = /^(?=.*[a-z])(?=.*[3579])[a-z3579]+$/;
export const ARABIC_SCRIPT_REGEX = /[\u0600-\u06FF]/;

export function detectLanguageFromText(text: string, currentLanguage?: string): "fr" | "ar" | "arabizi" {
  if (!text) return (currentLanguage as "fr" | "ar" | "arabizi") || "fr";
  if (ARABIC_SCRIPT_REGEX.test(text)) return "ar";

  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const tokens = normalized.match(/[a-z0-9'-]+/g) || [];
  if (tokens.length === 0) return (currentLanguage as "fr" | "ar" | "arabizi") || "fr";

  let tunisianScore = 0;
  let frenchScore = 0;

  for (const token of tokens) {
    if (TIME_TOKEN_REGEX.test(token)) continue;
    if (TUNISIAN_ARABIZI_KEYWORDS.has(token)) {
      tunisianScore += 2;
    } else if (ARABIZI_DIGIT_TOKEN_REGEX.test(token)) {
      tunisianScore += 1;
    } else if (FRENCH_LANGUAGE_KEYWORDS.has(token)) {
      frenchScore += 1;
    }
  }

  if (currentLanguage === "arabizi") tunisianScore += 3;
  if (currentLanguage === "fr") frenchScore += 3;

  if (tunisianScore > frenchScore) return "arabizi";
  if (frenchScore >= tunisianScore && frenchScore > 0) return "fr";
  
  return (currentLanguage as "fr" | "ar" | "arabizi") || "fr";
}

// ──────────────────────────────────────────────────────────────────────────────
// Family relation detection
// ──────────────────────────────────────────────────────────────────────────────
export const FAMILY_KEYWORDS = [
  "mon fils", "ma fille", "mon enfant", "mes enfants", "mon bebe", "mon nourrisson",
  "mon garcon", "ma petite fille", "mon petit garcon", "ma femme", "mon mari",
  "mon epouse", "mon epoux", "ma compagne", "mon compagnon", "ma conjointe", "mon conjoint",
  "ma mere", "mon pere", "mes parents", "ma maman", "mon papa", "mon frere", "ma soeur",
  "mes freres", "mes soeurs", "ma grand mere", "mon grand pere", "ma tante", "mon oncle",
  "mon neveu", "ma niece", "weldi", "l weldi", "lweldi", "l weldy", "lweldy", "benti",
  "l benti", "lbenti", "l benty", "lbenty", "rajli", "ragli", "l rajli", "lrajli",
  "marti", "merti", "l marti", "lmarti", "khouya", "khoya", "l khouya", "lkhouya",
  "okhti", "okhty", "l okhti", "lokhti", "omi", "oummi", "l omi", "lomi", "baba",
  "bouya", "l baba", "lbaba"
];

export function normalizeFamilyText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export const FAMILY_KEYWORD_PATTERNS = FAMILY_KEYWORDS.map(
  (keyword) => new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`)
);

export function hasFamilyKeyword(text: string): boolean {
  const normalizedText = normalizeFamilyText(text);
  return FAMILY_KEYWORD_PATTERNS.some((pattern) => pattern.test(normalizedText));
}

export function isSelfConfirmation(text: string): boolean {
  const normalizedText = normalizeFamilyText(text);
  const SELF_PATTERNS = [/\bpour moi\b/, /\bc'est pour moi\b/, /\bc'est moi\b/, /^\s*moi\s*$/];
  return SELF_PATTERNS.some((pattern) => pattern.test(normalizedText));
}

// ──────────────────────────────────────────────────────────────────────────────
// Confirmation message builder
// ──────────────────────────────────────────────────────────────────────────────
export async function buildConfirmationMessage(
  type: "booking" | "reschedule",
  appointment: { date: string; startTime: string; endTime: string; treatment: string },
  patientFirstName: string,
  conversationId: string | null,
  language?: string
): Promise<string> {
  try {
    const providerUrl = process.env.AI_PROVIDER_URL?.trim()?.replace(/^['"]/g, "").replace(/['"]$/g, "");
    const apiKey = process.env.AI_API_KEY?.trim()?.replace(/^['"]/g, "").replace(/['"]$/g, "");
    const model = process.env.AI_MODEL?.trim()?.replace(/^['"]/g, "").replace(/['"]$/g, "");

    if (!providerUrl || !apiKey || !model) {
      return _neutralConfirmation(type, appointment, patientFirstName);
    }

    let historyMessages: { role: "user" | "assistant"; content: string }[] = [];
    if (conversationId) {
      const { Message } = await import("../communications/communication.model");
      const recent = await Message.find({ conversationId })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean();
      historyMessages = recent
        .reverse()
        .map((m: any) => ({
          role: (m.direction === "inbound" ? "user" : "assistant") as "user" | "assistant",
          content: m.content || "",
        }))
        .filter((m: any) => m.content);
    }

    const actionDesc = type === "booking"
      ? `The appointment for ${patientFirstName} has just been CONFIRMED: date=${appointment.date}, time=${appointment.startTime}-${appointment.endTime}, treatment=${appointment.treatment}.`
      : `The appointment for ${patientFirstName} has just been RESCHEDULED: new date=${appointment.date}, new time=${appointment.startTime}-${appointment.endTime}, treatment=${appointment.treatment}.`;

    const langLockMap: Record<string, string> = {
      fr: "FRANÇAIS",
      arabizi: "ARABIZI TUNISIEN (caractères latins uniquement)",
      ar: "ARABE TUNISIEN (lettres arabes uniquement)",
      en: "ANGLAIS",
    };
    const targetLanguageStr = language && langLockMap[language] ? langLockMap[language] : "la même langue que le patient";

    const systemInstruction = `You are a WhatsApp assistant for a medical clinic. Write a single warm confirmation sentence in ${targetLanguageStr}. Include the date, time range, and treatment. No JSON. No extra formatting. Natural and friendly tone. NEVER USE "Mabrouk" ou "L'ma3oud el 9dim".`;

    const messages = [
      { role: "system" as const, content: systemInstruction },
      ...historyMessages,
      { role: "user" as const, content: `[SYSTEM: ${actionDesc} Generate the confirmation message now.]` },
    ];

    const response = await fetch(`${providerUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 120 }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return _neutralConfirmation(type, appointment, patientFirstName);
    }

    const data = await response.json() as any;
    const reply: string | undefined = data?.choices?.[0]?.message?.content?.trim();
    return reply || _neutralConfirmation(type, appointment, patientFirstName);
  } catch (e) {
    console.error("[AI] buildConfirmationMessage failed:", e);
    return _neutralConfirmation(type, appointment, patientFirstName);
  }
}

export function _neutralConfirmation(
  type: "booking" | "reschedule",
  appointment: { date: string; startTime: string; endTime: string; treatment: string },
  patientFirstName: string
): string {
  const verb = type === "booking" ? "confirmé" : "modifié";
  return `${patientFirstName} — rendez-vous ${verb} : ${appointment.date} ${appointment.startTime}-${appointment.endTime} (${appointment.treatment}).`;
}
