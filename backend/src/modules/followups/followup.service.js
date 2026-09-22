"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.followupService = exports.FOLLOWUP_CONFIG = void 0;
const followup_model_1 = require("./followup.model");
const patient_model_1 = require("../patients/patient.model");
const recovery_model_1 = require("../recovery/recovery.model");
// Centralized Configuration Defaults
exports.FOLLOWUP_CONFIG = {
    MAX_ATTEMPTS_DEFAULT: 3,
    INACTIVE_MONTHS_DEFAULT: 6,
    OVERDUE_CHECKUP_MONTHS_DEFAULT: 12,
    // Cooldown window (days) that prevents re-detecting a new automatic patient-level
    // Recovery (inactive_patient, overdue_checkup) after the previous one for the same
    // patient reached a terminal state. Does NOT apply to appointment-driven events
    // (no_show, cancellation).
    RECOVERY_REDETECTION_COOLDOWN_DAYS: 30,
};
const TASK_ALLOWED_TRANSITIONS = {
    pending: ["in_progress", "completed", "cancelled", "expired"],
    in_progress: ["completed", "cancelled", "expired"],
    completed: [],
    cancelled: [],
    expired: [],
};
function validateTaskTransition(currentStatus, nextStatus) {
    if (["completed", "cancelled", "expired"].includes(currentStatus)) {
        throw new Error(`Invalid task status transition from terminal state '${currentStatus}' to '${nextStatus}'`);
    }
    if (currentStatus === nextStatus)
        return;
    const allowed = TASK_ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
        throw new Error(`Invalid task status transition from '${currentStatus}' to '${nextStatus}'`);
    }
}
async function validateOwnership(tenantId, patientId, recoveryId) {
    const patient = await patient_model_1.Patient.findOne({ _id: patientId, tenantId });
    if (!patient) {
        throw new Error("Patient not found or does not belong to authenticated tenant");
    }
    if (recoveryId) {
        const recovery = await recovery_model_1.Recovery.findOne({ _id: recoveryId, tenantId });
        if (!recovery)
            throw new Error("Recovery opportunity not found or does not belong to authenticated tenant");
        if (recovery.patientId.toString() !== patientId)
            throw new Error("Recovery opportunity does not match specified patient");
    }
}
async function validateWaitlistOwnership(tenantId, patientId, waitlistEntryId) {
    const patient = await patient_model_1.Patient.findOne({ _id: patientId, tenantId });
    if (!patient)
        throw new Error("Patient not found or does not belong to authenticated tenant");
    const { WaitlistEntry } = await import("../waitlist/waitlist.model");
    const entry = await WaitlistEntry.findOne({ _id: waitlistEntryId, tenantId });
    if (!entry)
        throw new Error("WaitlistEntry not found or does not belong to authenticated tenant");
    if (entry.patientId.toString() !== patientId)
        throw new Error("WaitlistEntry does not match specified patient");
}
exports.followupService = {
    createTask: async (data, tenantId) => {
        if (!data.patientId || (!data.recoveryId && !data.waitlistEntryId)) {
            throw new Error("patientId and either recoveryId or waitlistEntryId are required to create a FollowUpTask");
        }
        if (data.recoveryId) {
            await validateOwnership(tenantId, data.patientId.toString(), data.recoveryId.toString());
        }
        else if (data.waitlistEntryId) {
            await validateWaitlistOwnership(tenantId, data.patientId.toString(), data.waitlistEntryId.toString());
        }
        // Check duplicate pending task for same target
        const existingPending = await followup_model_1.FollowUpTask.findOne({
            tenantId,
            ...(data.recoveryId ? { recoveryId: data.recoveryId } : { waitlistEntryId: data.waitlistEntryId }),
            status: { $in: ["pending", "in_progress"] },
        });
        if (existingPending) {
            return existingPending;
        }
        try {
            const task = new followup_model_1.FollowUpTask({
                ...data,
                tenantId,
            });
            return await task.save();
        }
        catch (err) {
            if (err.code === 11000) {
                const fallback = await followup_model_1.FollowUpTask.findOne({
                    tenantId,
                    ...(data.recoveryId ? { recoveryId: data.recoveryId } : { waitlistEntryId: data.waitlistEntryId }),
                    type: data.type,
                });
                if (fallback)
                    return fallback;
            }
            throw err;
        }
    },
    getTasks: async (tenantId, filters) => {
        const query = { tenantId };
        if (filters?.status)
            query.status = filters.status;
        if (filters?.priority)
            query.priority = filters.priority;
        if (filters?.type)
            query.type = filters.type;
        return followup_model_1.FollowUpTask.find(query)
            .populate("patientId", "firstName lastName phone email")
            .populate("recoveryId", "type status priority estimatedValue bookedValue")
            .populate("waitlistEntryId", "treatment status priority preferredDays preferredTimeRanges")
            .populate("sourceAppointmentId")
            .sort({ scheduledFor: 1 });
    },
    getTaskById: async (id, tenantId) => {
        return followup_model_1.FollowUpTask.findOne({ _id: id, tenantId })
            .populate("patientId")
            .populate("recoveryId")
            .populate("waitlistEntryId");
    },
    completeTask: async (id, tenantId, notes) => {
        const task = await followup_model_1.FollowUpTask.findOne({ _id: id, tenantId });
        if (!task) {
            throw new Error("FollowUpTask not found or does not belong to authenticated tenant");
        }
        validateTaskTransition(task.status, "completed");
        task.status = "completed";
        task.completedAt = new Date();
        if (notes)
            task.notes = notes;
        return task.save();
    },
    /**
     * Find and complete the active FollowUpTask associated with a given recoveryId.
     * Idempotent: if no active task exists, returns null without error.
     * Used internally when a Recovery is booked or visited so we reuse the existing
     * task rather than creating a new one.
     */
    completeTaskForRecovery: async (recoveryId, tenantId, notes) => {
        const task = await followup_model_1.FollowUpTask.findOne({
            tenantId,
            recoveryId,
            status: { $in: ["pending", "in_progress"] },
        });
        if (!task)
            return null; // Idempotent: no active task — nothing to do
        validateTaskTransition(task.status, "completed");
        task.status = "completed";
        task.completedAt = new Date();
        if (notes)
            task.notes = notes;
        return task.save();
    },
    logAttempt: async (data, tenantId) => {
        if (!data.recoveryId && !data.waitlistEntryId) {
            throw new Error("Either recoveryId or waitlistEntryId is required");
        }
        let recovery = null;
        if (data.recoveryId) {
            recovery = await recovery_model_1.Recovery.findOne({ _id: data.recoveryId, tenantId });
            if (!recovery)
                throw new Error("Recovery opportunity not found or does not belong to authenticated tenant");
        }
        let waitlistEntry = null;
        if (data.waitlistEntryId) {
            const { WaitlistEntry } = await import("../waitlist/waitlist.model");
            waitlistEntry = await WaitlistEntry.findOne({ _id: data.waitlistEntryId, tenantId });
            if (!waitlistEntry)
                throw new Error("WaitlistEntry not found or does not belong to authenticated tenant");
        }
        let task;
        if (data.taskId) {
            task = await followup_model_1.FollowUpTask.findOne({ _id: data.taskId, tenantId });
            if (!task)
                throw new Error("FollowUpTask not found or does not belong to authenticated tenant");
            if (data.recoveryId && task.recoveryId?.toString() !== data.recoveryId) {
                throw new Error("Task does not match specified recovery opportunity");
            }
            if (data.waitlistEntryId && task.waitlistEntryId?.toString() !== data.waitlistEntryId) {
                throw new Error("Task does not match specified waitlist entry");
            }
        }
        else {
            task = await followup_model_1.FollowUpTask.findOne({
                tenantId,
                ...(data.recoveryId ? { recoveryId: data.recoveryId } : { waitlistEntryId: data.waitlistEntryId }),
                status: { $in: ["pending", "in_progress"] },
            });
        }
        const currentAttempts = await followup_model_1.FollowUpAttempt.countDocuments({
            tenantId,
            ...(data.recoveryId ? { recoveryId: data.recoveryId } : { waitlistEntryId: data.waitlistEntryId }),
        });
        const attemptNumber = currentAttempts + 1;
        const outcome = data.outcome || "no_answer";
        const attempt = new followup_model_1.FollowUpAttempt({
            tenantId,
            recoveryId: data.recoveryId,
            waitlistEntryId: data.waitlistEntryId,
            taskId: task?._id,
            attemptNumber,
            channel: data.channel || "phone",
            outcome,
            notes: data.notes,
            performedAt: new Date(),
        });
        await attempt.save();
        // Update task attemptCount and status atomically
        if (task) {
            task.attemptCount = attemptNumber;
            if (task.status === "pending") {
                validateTaskTransition(task.status, "in_progress");
                task.status = "in_progress";
            }
            await task.save();
        }
        // Update parent entity (Recovery or Waitlist)
        if (recovery) {
            recovery.lastContactedAt = new Date();
            await recovery.save();
        }
        // Outcome lifecycle transitions
        if (outcome === "spoken_agreed") {
            if (recovery && ["identified", "queued", "contacted"].includes(recovery.status)) {
                recovery.status = "responded";
                await recovery.save();
            }
            // Task remains active pending booking
            return attempt;
        }
        if (outcome === "spoken_declined") {
            if (recovery && !["visited", "no_response", "dismissed"].includes(recovery.status)) {
                recovery.status = "dismissed";
                await recovery.save();
            }
            // If WaitlistEntry, it stays active! Only the task is cancelled
            if (task && ["pending", "in_progress"].includes(task.status)) {
                validateTaskTransition(task.status, "cancelled");
                task.status = "cancelled";
                await task.save();
            }
            return attempt;
        }
        if (outcome === "invalid_number") {
            return attempt;
        }
        if (attemptNumber >= exports.FOLLOWUP_CONFIG.MAX_ATTEMPTS_DEFAULT &&
            ["no_answer", "left_voicemail"].includes(outcome)) {
            if (recovery && ["contacted", "queued", "identified"].includes(recovery.status)) {
                recovery.status = "no_response";
                await recovery.save();
            }
            if (task && ["pending", "in_progress"].includes(task.status)) {
                validateTaskTransition(task.status, "expired");
                task.status = "expired";
                await task.save();
            }
        }
        return attempt;
    },
    getAttemptsForRecovery: async (recoveryId, tenantId) => {
        // Validate recovery ownership first
        const recovery = await recovery_model_1.Recovery.findOne({ _id: recoveryId, tenantId });
        if (!recovery) {
            throw new Error("Recovery opportunity not found or does not belong to authenticated tenant");
        }
        return followup_model_1.FollowUpAttempt.find({ tenantId, recoveryId }).sort({ attemptNumber: 1 });
    },
    getAttemptsForWaitlistEntry: async (waitlistEntryId, tenantId) => {
        const { WaitlistEntry } = await import("../waitlist/waitlist.model");
        const entry = await WaitlistEntry.findOne({ _id: waitlistEntryId, tenantId });
        if (!entry) {
            throw new Error("WaitlistEntry not found or does not belong to authenticated tenant");
        }
        return followup_model_1.FollowUpAttempt.find({ tenantId, waitlistEntryId }).sort({ attemptNumber: 1 });
    },
};
//# sourceMappingURL=followup.service.js.map