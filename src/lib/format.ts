
export function parseISO(iso: string | null | undefined): Date {
  if (!iso) return new Date("");
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y || 2026, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

function getLang(): "fr" | "en" | "ar" {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("medical_ai_lang");
    if (saved === "ar" || saved === "en") return saved;
  }
  return "fr";
}

const MONTHS: Record<"fr" | "en" | "ar", string[]> = {
  fr: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ar: ["جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان", "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
};

const DAYS: Record<"fr" | "en" | "ar", string[]> = {
  fr: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  ar: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
};

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  const lang = getLang();
  return `${d.getDate()} ${MONTHS[lang][d.getMonth()]} ${d.getFullYear()}`;
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  const lang = getLang();
  return `${d.getDate()} ${MONTHS[lang][d.getMonth()]}`;
}

export function formatWeekday(iso: string | null | undefined): string {
  if (!iso) return "—";
  const lang = getLang();
  return DAYS[lang][parseISO(iso).getDay()] || "—";
}

export function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const lang = getLang();
  if (lang === "ar") {
    return `${formatWeekday(iso)} ${formatDate(iso)}`;
  }
  return `${formatWeekday(iso)} ${formatDate(iso)}`;
}

export function relativeDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const lang = getLang();
  try {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const parsed = parseISO(iso);
    if (isNaN(parsed.getTime())) return "—";
    const diff = Math.round((parsed.getTime() - today.getTime()) / 86_400_000);
    
    if (diff === 0) return lang === "ar" ? "اليوم" : lang === "en" ? "Today" : "Aujourd'hui";
    if (diff === 1) return lang === "ar" ? "غداً" : lang === "en" ? "Tomorrow" : "Demain";
    if (diff === -1) return lang === "ar" ? "أمس" : lang === "en" ? "Yesterday" : "Hier";
    
    if (diff > 1) {
      return lang === "ar" ? `بعد ${diff} أيام` : lang === "en" ? `In ${diff} days` : `Dans ${diff} jours`;
    }
    return lang === "ar" ? `منذ ${Math.abs(diff)} أيام` : lang === "en" ? `${Math.abs(diff)} days ago` : `Il y a ${Math.abs(diff)} jours`;
  } catch (e) {
    return "—";
  }
}

export function monthsSince(iso: string | null): number | null {
  if (!iso) return null;
  const days = Math.round((Date.now() - parseISO(iso).getTime()) / 86_400_000);
  return Math.floor(days / 30);
}

export function money(amount: number): string {
  const lang = getLang();
  if (lang === "ar") {
    return `${amount.toLocaleString("ar-TN")} د.ت`;
  }
  return `${amount.toLocaleString("fr-FR")} DT`;
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfWeek(iso: string): string {
  const d = parseISO(iso);
  const shift = (d.getDay() + 6) % 7;
  return addDays(iso, -shift);
}
