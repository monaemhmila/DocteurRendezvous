"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.availabilityService = void 0;
const appointment_model_1 = require("./appointment.model");
const tenant_model_1 = require("../tenants/tenant.model");
const user_model_1 = require("../users/user.model");
function parseTime(timeStr) {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
}
function formatTime(mins) {
    const h = Math.floor(mins / 60).toString().padStart(2, "0");
    const m = (mins % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
}
exports.availabilityService = {
    checkAvailability: async (params) => {
        const { tenantId, doctorId, date, startTime, endTime } = params;
        // Strict temporal validation: cannot book in the past
        const now = new Date();
        const todayIso = now.toISOString().slice(0, 10);
        const currentMins = now.getHours() * 60 + now.getMinutes();
        if (date < todayIso) {
            return false; // Cannot book dates in the past
        }
        if (date === todayIso && parseTime(startTime) <= currentMins) {
            return false; // Cannot book past time slots today
        }
        // A very simple availability check: find any overlapping appointments
        // Overlap condition: existing.startTime < new.endTime AND existing.endTime > new.startTime
        // In our system, time is represented as "HH:MM", which is comparable as strings
        const overlapping = await appointment_model_1.Appointment.findOne({
            tenantId,
            doctorId,
            date,
            status: { $nin: ["cancelled", "no_show"] }, // cancelled or no show don't take up time
            $and: [
                { startTime: { $lt: endTime } },
                { endTime: { $gt: startTime } },
            ],
        });
        return !overlapping; // If no overlapping appointment is found, it's available
    },
    getAvailableSlots: async (params) => {
        const { tenantId, date, durationMin, timePreference } = params;
        // 1. Fetch real business hours from Tenant
        const tenant = await tenant_model_1.Tenant.findById(tenantId).lean();
        if (!tenant)
            throw new Error("Tenant not found");
        const defaultHours = {
            monday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
            tuesday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
            wednesday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
            thursday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
            friday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
            saturday: [{ start: "09:00", end: "13:00" }],
            sunday: [],
        };
        let businessHours = tenant.settings?.businessHours;
        if (businessHours !== undefined && typeof businessHours === "object" && Object.keys(businessHours).length === 0) {
            return { error: "business_hours_not_configured" };
        }
        if (!businessHours || typeof businessHours === "string") {
            businessHours = defaultHours;
        }
        // Determine day of week for the requested date (e.g., "monday")
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            throw new Error("Invalid date format");
        }
        const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        // Using getUTCDay() to prevent timezone shifting since date string is YYYY-MM-DD
        const dayOfWeek = days[dateObj.getUTCDay()];
        let dayHours = businessHours[dayOfWeek];
        // Fallback: if it's a simple flat object like { start: "09:00", end: "18:00" } 
        if (!dayHours && businessHours.start && businessHours.end) {
            dayHours = [businessHours];
        }
        if (!dayHours || !Array.isArray(dayHours) || dayHours.length === 0) {
            return { error: "no_business_hours_for_day" };
        }
        // 2. Resolve Doctor deterministically
        const owners = await user_model_1.User.find({ tenantId, role: "clinic_owner" }).select("_id").lean();
        let doctorId;
        if (owners.length > 0) {
            doctorId = owners[0]._id.toString();
        }
        else {
            const dentists = await user_model_1.User.find({ tenantId, role: "dentist" }).select("_id").lean();
            if (dentists.length > 0) {
                doctorId = dentists[0]._id.toString();
            }
            else {
                const anyUser = await user_model_1.User.findOne({ tenantId }).select("_id").lean();
                if (anyUser) {
                    doctorId = anyUser._id.toString();
                }
                else {
                    return { error: "no_doctor_configured" };
                }
            }
        }
        // 3. Generate candidate slots based on business hours and durationMin
        const candidateSlots = [];
        for (const block of dayHours) {
            if (!block.start || !block.end)
                continue;
            let currentMin = parseTime(block.start);
            const endMin = parseTime(block.end);
            while (currentMin + durationMin <= endMin) {
                candidateSlots.push({
                    startTime: formatTime(currentMin),
                    endTime: formatTime(currentMin + durationMin)
                });
                // Step by 15 mins for short procedures (<=20m), or 30 mins for standard/longer procedures
                const step = durationMin <= 20 ? 15 : 30;
                currentMin += step;
            }
        }
        if (candidateSlots.length === 0) {
            return { error: "no_slots_fit_duration" };
        }
        // 4. Fetch all existing appointments for that doctor on that date
        // We only care about active appointments (not cancelled/no_show)
        const existingAppointments = await appointment_model_1.Appointment.find({
            tenantId,
            doctorId,
            date,
            status: { $nin: ["cancelled", "no_show"] }
        }).lean();
        // 5. Filter candidate slots using the strict overlap logic
        let availableSlots = candidateSlots.filter((slot) => {
            // Overlap logic: existing.startTime < new.endTime AND existing.endTime > new.startTime
            const hasOverlap = existingAppointments.some((appt) => {
                return appt.startTime < slot.endTime && appt.endTime > slot.startTime;
            });
            return !hasOverlap;
        });
        // 5.1 CRITICAL: Filter out past slots if requested date is TODAY (or in the past)
        const now = new Date();
        const todayIso = now.toISOString().slice(0, 10);
        const currentMins = now.getHours() * 60 + now.getMinutes();
        if (date < todayIso) {
            // Past date: no slots available
            return { slots: [], isPastDate: true };
        }
        if (date === todayIso) {
            // For today, only allow slots starting in the future (minimum 15 mins buffer)
            const bufferMins = 15;
            availableSlots = availableSlots.filter((s) => parseTime(s.startTime) >= currentMins + bufferMins);
        }
        // 6. Apply time preference if any
        if (timePreference === "morning") {
            availableSlots = availableSlots.filter((s) => parseTime(s.startTime) < 720); // before 12:00
        }
        else if (timePreference === "afternoon") {
            availableSlots = availableSlots.filter((s) => parseTime(s.startTime) >= 720); // 12:00+
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
            for (const block of dayHours) {
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
        // Sort primarily by Compaction Score (descending), tie-break by time (ascending)
        scoredSlots.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return a.timeMins - b.timeMins;
        });
        // 8. Limit output to a reasonable number of compact choices (e.g. 5)
        return { slots: scoredSlots.map((s) => s.slot).slice(0, 5) };
    },
};
//# sourceMappingURL=availability.service.js.map