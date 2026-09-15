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
        // We assume businessHours is structured like:
        // { "monday": [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }], ... }
        // OR something simpler like { start: "09:00", end: "18:00" } across the board.
        // If it's missing or empty, we strictly decline to invent hours.
        if (!tenant.settings?.businessHours || Object.keys(tenant.settings.businessHours).length === 0) {
            return { error: "business_hours_not_configured" };
        }
        // Determine day of week for the requested date (e.g., "monday")
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            throw new Error("Invalid date format");
        }
        const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const dayOfWeek = days[dateObj.getDay()];
        let dayHours = tenant.settings.businessHours[dayOfWeek];
        // Fallback: if it's a simple flat object like { start: "09:00", end: "18:00" } 
        if (!dayHours && tenant.settings.businessHours.start && tenant.settings.businessHours.end) {
            dayHours = [tenant.settings.businessHours];
        }
        if (!dayHours || !Array.isArray(dayHours) || dayHours.length === 0) {
            return { error: "no_business_hours_for_day" };
        }
        // 2. Resolve Doctor (Dentist/Owner)
        const doctor = await user_model_1.User.findOne({
            tenantId,
            role: { $in: ["dentist", "clinic_owner"] }
        }).lean();
        if (!doctor) {
            return { error: "no_doctor_configured" };
        }
        const doctorId = doctor._id.toString();
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
                // We step by the duration block (or 30 mins)
                // Let's step by a fixed 30 mins interval for nice slots, or durationMin if greater
                const step = Math.max(30, durationMin);
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
            const hasOverlap = existingAppointments.some(appt => {
                return appt.startTime < slot.endTime && appt.endTime > slot.startTime;
            });
            return !hasOverlap;
        });
        // 6. Apply time preference if any
        if (timePreference === "morning") {
            availableSlots = availableSlots.filter(s => parseTime(s.startTime) < 720); // before 12:00
        }
        else if (timePreference === "afternoon") {
            availableSlots = availableSlots.filter(s => parseTime(s.startTime) >= 720); // 12:00+
        }
        // 7. Limit output to a reasonable number (e.g. 5)
        // Send back just enough slots for the AI to present a choice, preserving order.
        return { slots: availableSlots.slice(0, 5) };
    }
};
//# sourceMappingURL=availability.service.js.map