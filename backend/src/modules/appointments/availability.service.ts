import { Appointment } from "./appointment.model";
import { Tenant } from "../tenants/tenant.model";
import { User } from "../users/user.model";
import {
  nowInTimezone,
  toIsoDate,
  getWeekdayFr,
  getWeekdayEn,
  formatDateFr,
  getBusinessHoursForDate,
  formatBusinessHoursBlocks,
  DEFAULT_TIMEZONE,
  DayBusinessHours,
} from "../ai/temporal.utils";

export type DayAvailabilityStatus =
  | "OPEN_WITH_AVAILABILITY"
  | "OPEN_FULL"
  | "CLOSED"
  | "PAST";

export interface GetAvailableSlotsResult {
  status: DayAvailabilityStatus;
  slots: Array<{ startTime: string; endTime: string }>;
  date?: string;
  weekdayFr?: string;
  weekdayEn?: string;
  /**
   * Human-readable business hours string for this day.
   * Built deterministically from the same resolveDaySchedule() call.
   * Use this in ai.service.ts for display — NEVER recompute from rawBH in parallel.
   * Examples: "08:30-12:30, 14:00-18:30" | "FERMÉ"
   */
  businessHoursStr?: string;
  isClosed?: boolean;
  isPastDate?: boolean;
  error?: string;
}

export interface NextBookableDayResult {
  date: string;
  weekdayFr: string;
  weekdayEn: string;
  dateFr: string;
  slotsCount: number;
  firstSlot?: { startTime: string; endTime: string };
  slots?: Array<{ startTime: string; endTime: string }>;
}

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// ─── SINGLE SOURCE OF TRUTH — Phase 6.14 ────────────────────────────────────
//
// resolveDaySchedule() is the ONE place where tenant business hours are resolved.
// Both getAvailableSlots() and findNextBookableDay() MUST go through here.
// ai.service.ts MUST use slotsResult.businessHoursStr — never recompute from rawBH.
//
// PRIVATE — not exported. Tests verify the public contract via getAvailableSlots()
// and findNextBookableDay(), not the internal function.
// ─────────────────────────────────────────────────────────────────────────────
interface DaySchedule {
  tenant: any;
  tenantTimezone: string;
  weekdayFr: string;
  weekdayEn: string;
  dayBH: DayBusinessHours;
  businessHoursStr: string;
  isClosed: boolean;
  todayIso: string;
  currentMins: number;
  isPast: boolean;
}

async function resolveDaySchedule(
  tenantId: string,
  date: string
): Promise<DaySchedule | { earlyReturn: GetAvailableSlotsResult }> {
  const tenant = await Tenant.findById(tenantId).lean();
  if (!tenant) {
    return {
      earlyReturn: {
        status: "CLOSED",
        slots: [],
        date,
        error: "tenant_not_found",
      },
    };
  }

  const tenantTimezone = (tenant as any)?.timezone || DEFAULT_TIMEZONE;
  const weekdayFr = getWeekdayFr(date);
  const weekdayEn = getWeekdayEn(date);

  const tzNow = nowInTimezone(tenantTimezone);
  const todayIso = toIsoDate(tenantTimezone, tzNow.date);
  const currentMins = tzNow.hours * 60 + tzNow.minutes;

  if (date < todayIso) {
    return {
      earlyReturn: {
        status: "PAST",
        slots: [],
        date,
        weekdayFr,
        weekdayEn,
        businessHoursStr: "PASSÉ",
        isPastDate: true,
      },
    };
  }

  const rawBusinessHours = tenant.settings?.businessHours;
  if (
    !rawBusinessHours ||
    (typeof rawBusinessHours === "object" &&
      Object.keys(rawBusinessHours).length === 0)
  ) {
    return {
      earlyReturn: {
        status: "CLOSED",
        slots: [],
        date,
        weekdayFr,
        weekdayEn,
        businessHoursStr: "FERMÉ",
        isClosed: true,
        error: "business_hours_not_configured",
      },
    };
  }

  const dayBH = getBusinessHoursForDate(date, rawBusinessHours);
  const businessHoursStr = formatBusinessHoursBlocks(dayBH);
  const isClosed = dayBH.isClosed || dayBH.blocks.length === 0;

  if (isClosed) {
    return {
      earlyReturn: {
        status: "CLOSED",
        slots: [],
        date,
        weekdayFr,
        weekdayEn,
        businessHoursStr,
        isClosed: true,
        error: "no_business_hours_for_day",
      },
    };
  }

  return {
    tenant,
    tenantTimezone,
    weekdayFr,
    weekdayEn,
    dayBH,
    businessHoursStr,
    isClosed: false,
    todayIso,
    currentMins,
    isPast: false,
  };
}

export const availabilityService = {
  checkAvailability: async (params: {
    tenantId: string;
    doctorId: string;
    date: string;
    startTime: string;
    endTime: string;
    session?: any;
  }) => {
    const { tenantId, doctorId, date, startTime, endTime, session } = params;

    // 1. Resolve schedule and check if the clinic is open
    const schedule = await resolveDaySchedule(tenantId, date);
    if ("earlyReturn" in schedule) return false;
    const { dayBH, isPast } = schedule;

    if (isPast) return false;

    // 2. Validate time format and bounds
    const startMins = parseTime(startTime);
    const endMins = parseTime(endTime);
    if (isNaN(startMins) || isNaN(endMins) || startMins >= endMins) return false;

    // 3. Ensure the slot is strictly within business hours and not during a break
    let isWithinBlock = false;
    for (const block of dayBH.blocks) {
      const blockStart = parseTime(block.start);
      const blockEnd = parseTime(block.end);
      if (startMins >= blockStart && endMins <= blockEnd) {
        isWithinBlock = true;
        break;
      }
    }
    
    if (!isWithinBlock) return false;

    // 4. Check for overlapping appointments
    let query = Appointment.findOne({
      tenantId,
      doctorId,
      date,
      status: { $nin: ["cancelled", "no_show"] },
      $and: [
        { startTime: { $lt: endTime } },
        { endTime: { $gt: startTime } },
      ],
    });
    
    if (session) {
      query = query.session(session);
    }
    
    const overlapping = await query;

    return !overlapping;
  },

  getAvailableSlots: async (params: {
    tenantId: string;
    date: string;
    durationMin: number;
    timePreference?: string;
  }): Promise<GetAvailableSlotsResult> => {
    const { tenantId, date, durationMin, timePreference } = params;

    // 1. SINGLE SOURCE OF TRUTH — use resolveDaySchedule() exclusively.
    // This guarantees that business hours are computed identically here
    // and inside findNextBookableDay() — no parallel divergent paths.
    const schedule = await resolveDaySchedule(tenantId, date);
    if ("earlyReturn" in schedule) return schedule.earlyReturn;

    const { tenant, weekdayFr, weekdayEn, dayBH, businessHoursStr, todayIso, currentMins } = schedule;

    // 2. Resolve Doctor deterministically
    const owners = await User.find({ tenantId, role: "clinic_owner" }).select("_id").lean();
    let doctorId: string;

    if (owners.length > 0) {
      doctorId = owners[0]._id.toString();
    } else {
      const dentists = await User.find({ tenantId, role: "dentist" }).select("_id").lean();
      if (dentists.length > 0) {
        doctorId = dentists[0]._id.toString();
      } else {
        const anyUser = await User.findOne({ tenantId }).select("_id").lean();
        if (anyUser) {
          doctorId = anyUser._id.toString();
        } else {
          return {
            status: "CLOSED",
            slots: [],
            date,
            weekdayFr,
            weekdayEn,
            error: "no_doctor_configured",
          };
        }
      }
    }

    // 3. Generate candidate slots based on business hours and durationMin
    const candidateSlots: { startTime: string; endTime: string }[] = [];
    for (const block of dayBH.blocks) {
      if (!block.start || !block.end) continue;
      
      let currentMin = parseTime(block.start);
      const endMin = parseTime(block.end);

      while (currentMin + durationMin <= endMin) {
        candidateSlots.push({
          startTime: formatTime(currentMin),
          endTime: formatTime(currentMin + durationMin),
        });
        // Step by 15 mins for short procedures (<=20m), or 30 mins for standard/longer procedures
        const step = durationMin <= 20 ? 15 : 30;
        currentMin += step;
      }
    }

    if (candidateSlots.length === 0) {
      return {
        status: "CLOSED",
        slots: [],
        date,
        weekdayFr,
        weekdayEn,
        error: "no_slots_fit_duration",
      };
    }

    // 4. Fetch all existing appointments for that doctor on that date
    // We only care about active appointments (not cancelled/no_show)
    const existingAppointments = await Appointment.find({
      tenantId,
      doctorId,
      date,
      status: { $nin: ["cancelled", "no_show"] },
    }).lean();

    // 5. Filter candidate slots using the strict overlap logic
    let availableSlots = candidateSlots.filter((slot) => {
      // Overlap logic: existing.startTime < new.endTime AND existing.endTime > new.startTime
      const hasOverlap = existingAppointments.some((appt) => {
        return appt.startTime < slot.endTime && appt.endTime > slot.startTime;
      });
      return !hasOverlap;
    });

    // 5.1 CRITICAL: Filter out past slots if requested date is TODAY
    if (date === todayIso) {
      // For today, only allow slots starting with a minimal buffer (5 mins)
      // A 15-min buffer was too aggressive and caused near-future slots (e.g. 14h00 at 13h47)
      // to be excluded, resulting in a false OPEN_FULL when the afternoon session was actually available.
      const bufferMins = 5;
      availableSlots = availableSlots.filter(
        (s) => parseTime(s.startTime) >= currentMins + bufferMins
      );
    }

    // 6. Apply time preference if any
    if (timePreference === "morning") {
      availableSlots = availableSlots.filter((s) => parseTime(s.startTime) < 720); // before 12:00
    } else if (timePreference === "afternoon") {
      availableSlots = availableSlots.filter((s) => parseTime(s.startTime) >= 720); // 12:00+
    }

    // If no slots available after filtering, this day is OPEN but FULL
    if (availableSlots.length === 0) {
      return {
        status: "OPEN_FULL",
        slots: [],
        date,
        weekdayFr,
        weekdayEn,
      };
    }

    // 7. ANTI-GRUYÈRE ALGORITHM: Score and sort slots for schedule compaction
    // Prioritizes slots that stick to existing appointments or start/end of sessions to avoid swiss-cheese holes.
    const scoredSlots = availableSlots.map((slot) => {
      let score = 0;
      const slotStart = slot.startTime;
      const slotEnd = slot.endTime;

      // Check adjacency to existing appointments
      for (const appt of existingAppointments) {
        if (appt.endTime === slotStart) {
          score += 50; // Directly follows an existing appointment
        }
        if (appt.startTime === slotEnd) {
          score += 50; // Directly precedes an existing appointment
        }
      }

      // Check boundary of business blocks (start of morning or afternoon, end of day)
      for (const block of dayBH.blocks) {
        if (block.start === slotStart) {
          score += 35; // Fills from the start of the morning/afternoon block
        }
        if (block.end === slotEnd) {
          score += 25; // Fills up to the end of the block
        }
      }

      // Small-gap penalty: if a slot leaves an unusable 15-min hole
      for (const appt of existingAppointments) {
        const gapBefore = parseTime(slotStart) - parseTime(appt.endTime);
        if (gapBefore > 0 && gapBefore < 30) {
          score -= 30; // Small isolated hole before
        }
        const gapAfter = parseTime(appt.startTime) - parseTime(slotEnd);
        if (gapAfter > 0 && gapAfter < 30) {
          score -= 30; // Small isolated hole after
        }
      }
      
      const timeMins = parseTime(slotStart);

      // Specific timePreference scoring
      if (timePreference && timePreference !== "morning" && timePreference !== "afternoon") {
        const prefMins = parseTime(timePreference);
        if (!isNaN(prefMins)) {
          const diff = Math.abs(timeMins - prefMins);
          // High penalty for slots that are far from the requested specific time
          score -= diff; 
        }
      }

      return { slot, score, timeMins };
    });

    // 8. Return all available slots in chronological order.
    // Anti-Gruyère scores are used internally only (e.g. for auto-booking compaction).
    // For patient-facing display, ALL slots must be shown in time order — no artificial cap.
    // A slice(0, 5) was previously here but hid valid slots (e.g. 16h30-17h30 with 14h-18h30 hours).
    scoredSlots.sort((a, b) => a.timeMins - b.timeMins);

    // businessHoursStr is included so ai.service.ts can use it for display
    // without needing to recompute from rawBH independently (Phase 6.14 SOT).
    return {
      status: "OPEN_WITH_AVAILABILITY",
      slots: scoredSlots.map((s) => s.slot),
      date,
      weekdayFr,
      weekdayEn,
      businessHoursStr,
    };
  },

  findNextBookableDay: async (params: {
    tenantId: string;
    startDateIso: string;
    durationMin: number;
    maxDaysAhead?: number;
  }): Promise<NextBookableDayResult | null> => {
    const { tenantId, startDateIso, durationMin, maxDaysAhead = 14 } = params;

    let currentIso = startDateIso;
    for (let i = 1; i <= maxDaysAhead; i++) {
      // Add 1 day
      const d = new Date(currentIso + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() + 1);
      currentIso = d.toISOString().slice(0, 10);

      const result = await availabilityService.getAvailableSlots({
        tenantId,
        date: currentIso,
        durationMin,
      });

      if (result.status === "OPEN_WITH_AVAILABILITY" && result.slots && result.slots.length > 0) {
        return {
          date: currentIso,
          weekdayFr: getWeekdayFr(currentIso),
          weekdayEn: getWeekdayEn(currentIso),
          dateFr: formatDateFr(currentIso),
          slotsCount: result.slots.length,
          firstSlot: result.slots[0],
          slots: result.slots,
        };
      }
    }

    return null;
  },
};
