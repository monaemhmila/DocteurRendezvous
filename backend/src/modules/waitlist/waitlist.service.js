"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitlistService = void 0;
const waitlist_model_1 = require("./waitlist.model");
const appointment_model_1 = require("../appointments/appointment.model");
const followup_model_1 = require("../followups/followup.model");
exports.waitlistService = {
    async createEntry(data, tenantId) {
        const entry = new waitlist_model_1.WaitlistEntry({ ...data, tenantId });
        await entry.save();
        return entry;
    },
    async listEntries(tenantId) {
        return waitlist_model_1.WaitlistEntry.find({ tenantId, status: "active" }).sort({ priority: -1, createdAt: 1 });
    },
    async cancelEntry(entryId, tenantId) {
        const entry = await waitlist_model_1.WaitlistEntry.findOneAndUpdate({ _id: entryId, tenantId }, { status: "cancelled" }, { returnDocument: 'after' });
        if (!entry)
            throw new Error("WaitlistEntry not found or does not belong to tenant");
        // Cancel any pending slot offers for this entry
        await followup_model_1.FollowUpTask.updateMany({ waitlistEntryId: entry._id, tenantId, status: { $in: ["pending", "in_progress"] } }, { status: "cancelled", notes: "Waitlist entry cancelled" });
        return entry;
    },
    async findCandidatesAndOfferSlot(tenantId, sourceAppointment) {
        // Look for active waitlist candidates
        // Check if an offer already exists for this slot
        const existingOffer = await followup_model_1.FollowUpTask.findOne({
            tenantId,
            sourceAppointmentId: sourceAppointment._id,
            status: { $in: ["pending", "in_progress"] }
        });
        if (existingOffer)
            return null; // Offer already in progress
        // Find all waitlist candidates who already received an offer for this exact slot
        const previousOffers = await followup_model_1.FollowUpTask.find({
            tenantId,
            sourceAppointmentId: sourceAppointment._id
        }).select("waitlistEntryId");
        const excludedEntryIds = previousOffers
            .map(o => o.waitlistEntryId)
            .filter(id => id != null);
        // Find candidates, excluding those who already received an offer
        const candidates = await waitlist_model_1.WaitlistEntry.find({
            tenantId,
            status: "active",
            ...(excludedEntryIds.length > 0 ? { _id: { $nin: excludedEntryIds } } : {})
        });
        console.log("CANDIDATES FOUND:", candidates.map(c => ({ treatment: c.treatment, _id: c._id })));
        if (candidates.length === 0)
            return null;
        // Filter by preferences
        // Append T12:00:00Z to avoid timezone shifts changing the weekday
        const slotDate = new Date(sourceAppointment.date + "T12:00:00Z");
        const dayName = slotDate.toLocaleDateString("en-US", { weekday: 'long', timeZone: 'UTC' }); // e.g., "Friday"
        // We could parse startTime to morning/afternoon but for simplicity we keep all open if preferredTimeRanges is empty
        let eligible = candidates.filter(c => {
            // If preferredDays is set, it must include dayName
            if (c.preferredDays && c.preferredDays.length > 0) {
                if (!c.preferredDays.includes(dayName))
                    return false;
            }
            return true;
        });
        console.log("ELIGIBLE CANDIDATES:", eligible.map(c => ({ treatment: c.treatment, _id: c._id })));
        if (eligible.length === 0)
            return null;
        // Sort by priority and wait time
        const priorityWeights = { high: 50, medium: 25, low: 0 };
        eligible.sort((a, b) => {
            let scoreA = 100 + (priorityWeights[a.priority] || 0);
            let scoreB = 100 + (priorityWeights[b.priority] || 0);
            // +1 point per day waiting
            const daysWaitingA = Math.floor((Date.now() - a.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            const daysWaitingB = Math.floor((Date.now() - b.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            scoreA += daysWaitingA;
            scoreB += daysWaitingB;
            if (scoreA !== scoreB) {
                return scoreB - scoreA; // Descending
            }
            // Tie-breaker: oldest createdAt
            return a.createdAt.getTime() - b.createdAt.getTime();
        });
        const topCandidate = eligible[0];
        // Create the FollowUpTask offer
        try {
            const task = await followup_model_1.FollowUpTask.create({
                tenantId,
                patientId: topCandidate.patientId,
                waitlistEntryId: topCandidate._id,
                sourceAppointmentId: sourceAppointment._id,
                type: "slot_fill_offer",
                priority: topCandidate.priority,
                scheduledFor: new Date()
            });
            return task;
        }
        catch (err) {
            if (err.code === 11000) {
                console.error("E11000 Duplicate Key Error:", err.message);
                // Concurrency catch: another offer was just created
                return null;
            }
            throw err;
        }
    },
    async fulfillWaitlistEntry(waitlistEntryId, tenantId, doctorId, date, startTime, endTime, taskId) {
        const entry = await waitlist_model_1.WaitlistEntry.findOne({ _id: waitlistEntryId, tenantId, status: "active" });
        if (!entry)
            throw new Error("WaitlistEntry not found or not active");
        const task = await followup_model_1.FollowUpTask.findOne({ _id: taskId, tenantId, waitlistEntryId: entry._id, status: { $in: ["pending", "in_progress"] } });
        if (!task)
            throw new Error("Active FollowUpTask for this WaitlistEntry not found");
        // Try to book the appointment
        try {
            const appointment = new appointment_model_1.Appointment({
                tenantId,
                patientId: entry.patientId,
                doctorId,
                date,
                startTime,
                endTime,
                treatment: entry.treatment,
                status: "scheduled"
            });
            await appointment.save();
            // Successfully booked!
            entry.status = "fulfilled";
            entry.fulfilledByAppointmentId = appointment._id;
            await entry.save();
            task.status = "completed";
            task.completedAt = new Date();
            await task.save();
            return appointment;
        }
        catch (err) {
            if (err.code === 11000) {
                // Someone else booked this exact slot!
                throw new Error("409 Conflict: Slot is already booked.");
            }
            throw err;
        }
    }
};
//# sourceMappingURL=waitlist.service.js.map