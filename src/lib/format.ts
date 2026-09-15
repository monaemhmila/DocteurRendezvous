const MONTHS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatShortDate(iso: string): string {
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatWeekday(iso: string): string {
  return DAYS[parseISO(iso).getDay()];
}

export function formatLongDate(iso: string): string {
  return `${formatWeekday(iso)} ${formatDate(iso)}`;
}

export function relativeDay(iso: string): string {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diff = Math.round((parseISO(iso).getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  if (diff === -1) return "Hier";
  if (diff > 1) return `Dans ${diff} jours`;
  return `Il y a ${Math.abs(diff)} jours`;
}

export function monthsSince(iso: string | null): number | null {
  if (!iso) return null;
  const days = Math.round((Date.now() - parseISO(iso).getTime()) / 86_400_000);
  return Math.floor(days / 30);
}

export function money(amount: number): string {
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
