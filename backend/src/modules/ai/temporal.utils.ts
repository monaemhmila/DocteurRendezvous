/**
 * Temporal Utilities — Deterministic Date & Weekday Resolution
 *
 * All temporal calculations use the TENANT timezone, NEVER the server's local
 * timezone. The LLM must never compute dates itself.
 *
 * Exported:
 *   - buildTemporalContext(tz, now?)   — today/tomorrow/dayAfter with weekdays
 *   - getWeekdayFr(dateIso)            — "2026-09-19" → "samedi"
 *   - getWeekdayEn(dateIso)            — "2026-09-19" → "saturday"
 *   - isoDateToWeekdayIndex(dateIso)   — 0=Sunday … 6=Saturday
 *   - getBusinessHoursForDate(dateIso, businessHours) — horaires du jour
 *   - formatDateFr(dateIso)            — "samedi 19 septembre 2026"
 */

// ─── Weekday tables ──────────────────────────────────────────────────────────
const WEEKDAYS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"] as const;
const WEEKDAYS_EN = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
] as const;

// ─── Safe default timezone ───────────────────────────────────────────────────
export const DEFAULT_TIMEZONE = "Africa/Tunis";

// ─── Core helpers ────────────────────────────────────────────────────────────

/**
 * Returns the current Date projected into the given IANA timezone.
 * All fields (year, month, day, hour, minute) reflect the *wall clock* in that timezone.
 */
export function nowInTimezone(tz: string, now?: Date): {
  year: number; month: number; day: number;
  hours: number; minutes: number; seconds: number;
  date: Date;
} {
  const d = now ?? new Date();
  // Use Intl.DateTimeFormat to resolve parts in the target timezone
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => {
    const p = parts.find((p) => p.type === type);
    return p ? parseInt(p.value, 10) : 0;
  };

  return {
    year: get("year"),
    month: get("month"),   // 1-based
    day: get("day"),
    hours: get("hour"),
    minutes: get("minute"),
    seconds: get("second"),
    date: d,
  };
}

/**
 * Format a Date's wall-clock in a timezone as "YYYY-MM-DD".
 */
export function toIsoDate(tz: string, d: Date): string {
  const p = nowInTimezone(tz, d);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/**
 * Return weekday index (0=Sunday) for a pure ISO date string "YYYY-MM-DD".
 * Uses UTC to avoid timezone shifts on the date-only string.
 */
export function isoDateToWeekdayIndex(dateIso: string): number {
  const d = new Date(dateIso + "T12:00:00Z"); // noon UTC avoids DST edge
  return d.getUTCDay();
}

export function getWeekdayFr(dateIso: string): string {
  return WEEKDAYS_FR[isoDateToWeekdayIndex(dateIso)];
}

export function getWeekdayEn(dateIso: string): string {
  return WEEKDAYS_EN[isoDateToWeekdayIndex(dateIso)];
}

/**
 * "samedi 19 septembre 2026"
 */
export function formatDateFr(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const weekday = getWeekdayFr(dateIso);
  const monthName = MONTHS_FR[m - 1];
  return `${weekday} ${d} ${monthName} ${y}`;
}

// ─── Add N calendar days to an ISO date ──────────────────────────────────────
function addDays(dateIso: string, n: number): string {
  const d = new Date(dateIso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ─── Temporal Context ────────────────────────────────────────────────────────

export interface TemporalContext {
  /** ISO datetime "2026-09-19T15:52" */
  currentDateTime: string;
  /** ISO date "2026-09-19" */
  currentDate: string;
  /** "15:52" */
  currentTime: string;
  /** French weekday "samedi" */
  currentWeekdayFr: string;
  /** English weekday "saturday" */
  currentWeekdayEn: string;

  /** Tomorrow ISO "2026-09-20" */
  tomorrow: string;
  tomorrowWeekdayFr: string;
  tomorrowWeekdayEn: string;

  /** Day after tomorrow ISO "2026-09-21" */
  dayAfterTomorrow: string;
  dayAfterTomorrowWeekdayFr: string;
  dayAfterTomorrowWeekdayEn: string;

  /** The IANA timezone used */
  timezone: string;
}

/**
 * Build the full temporal context for the AI prompt.
 * All dates/weekdays are deterministic and timezone-aware.
 */
export function buildTemporalContext(tz?: string, now?: Date): TemporalContext {
  const timezone = tz || DEFAULT_TIMEZONE;
  const n = nowInTimezone(timezone, now);

  const currentDate = `${n.year}-${String(n.month).padStart(2, "0")}-${String(n.day).padStart(2, "0")}`;
  const currentTime = `${String(n.hours).padStart(2, "0")}:${String(n.minutes).padStart(2, "0")}`;

  const tomorrow = addDays(currentDate, 1);
  const dayAfterTomorrow = addDays(currentDate, 2);

  return {
    currentDateTime: `${currentDate}T${currentTime}`,
    currentDate,
    currentTime,
    currentWeekdayFr: getWeekdayFr(currentDate),
    currentWeekdayEn: getWeekdayEn(currentDate),
    tomorrow,
    tomorrowWeekdayFr: getWeekdayFr(tomorrow),
    tomorrowWeekdayEn: getWeekdayEn(tomorrow),
    dayAfterTomorrow,
    dayAfterTomorrowWeekdayFr: getWeekdayFr(dayAfterTomorrow),
    dayAfterTomorrowWeekdayEn: getWeekdayEn(dayAfterTomorrow),
    timezone,
  };
}

// ─── Business hours for a specific date ──────────────────────────────────────

export interface DayBusinessHours {
  blocks: Array<{ start: string; end: string }>;
  isClosed: boolean;
  weekdayFr: string;
  weekdayEn: string;
}

/**
 * Resolve the real business hours for a specific date from the tenant config.
 *
 * Supports both formats:
 *   - Flat: { start: "09:00", end: "18:00" }           → same hours every day, Sunday closed
 *   - Per-day: { monday: [{start,end}], sunday: [], … } → per-day config
 */
export function getBusinessHoursForDate(dateIso: string, businessHours: any): DayBusinessHours {
  const weekdayEn = getWeekdayEn(dateIso);
  const weekdayFr = getWeekdayFr(dateIso);

  if (!businessHours) {
    return { blocks: [], isClosed: true, weekdayFr, weekdayEn };
  }

  // Per-day format: { monday: [...], tuesday: [...], ... }
  if (businessHours[weekdayEn] !== undefined) {
    const dayConfig = businessHours[weekdayEn];
    if (!Array.isArray(dayConfig) || dayConfig.length === 0) {
      return { blocks: [], isClosed: true, weekdayFr, weekdayEn };
    }
    const blocks = dayConfig
      .filter((b: any) => b && b.start && b.end)
      .map((b: any) => ({ start: b.start, end: b.end }));
    return { blocks, isClosed: blocks.length === 0, weekdayFr, weekdayEn };
  }

  // Flat format: { start: "09:00", end: "18:00" }
  if (businessHours.start && businessHours.end) {
    // Flat format means same hours every day EXCEPT Sunday
    if (weekdayEn === "sunday") {
      return { blocks: [], isClosed: true, weekdayFr, weekdayEn };
    }
    return {
      blocks: [{ start: businessHours.start, end: businessHours.end }],
      isClosed: false,
      weekdayFr,
      weekdayEn,
    };
  }

  return { blocks: [], isClosed: true, weekdayFr, weekdayEn };
}

/**
 * Format business hours blocks for display: "08:30-12:30, 14:00-18:30" or "FERMÉ"
 */
export function formatBusinessHoursBlocks(bh: DayBusinessHours): string {
  if (bh.isClosed || bh.blocks.length === 0) return "FERMÉ";
  return bh.blocks.map((b) => `${b.start}-${b.end}`).join(", ");
}

/**
 * Build a full per-day summary of all 7 weekdays for the prompt.
 */
export function summarizeAllBusinessHours(businessHours: any): string {
  if (!businessHours) return "Non configuré";

  const lines: string[] = [];
  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const dayFr: Record<string, string> = {
    monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi",
    thursday: "Jeudi", friday: "Vendredi", saturday: "Samedi", sunday: "Dimanche",
  };

  for (const dayEn of dayOrder) {
    // Build a synthetic date for this weekday to reuse getBusinessHoursForDate
    // We use a known reference week: 2026-09-14 = Monday
    const refDates: Record<string, string> = {
      monday: "2026-09-14", tuesday: "2026-09-15", wednesday: "2026-09-16",
      thursday: "2026-09-17", friday: "2026-09-18", saturday: "2026-09-19", sunday: "2026-09-20",
    };
    const bh = getBusinessHoursForDate(refDates[dayEn], businessHours);
    lines.push(`${dayFr[dayEn]}: ${formatBusinessHoursBlocks(bh)}`);
  }

  return lines.join("\n");
}
