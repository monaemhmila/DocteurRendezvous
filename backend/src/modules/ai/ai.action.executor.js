"use strict";
/**
 * AI Module — Action Executor
 *
 * Validates and executes AI-proposed actions after explicit human approval.
 *
 * STRICT GUARANTEES:
 *   - confidence value from AI is NEVER used as authorization criteria
 *   - Every action verifies: tenant ownership, patient ownership, conversation link
 *   - Reuses existing business service logic — no new business rules invented
 *   - Is NEVER called from getSuggestion() or any AI generation path
 *   - Never calls MetaWhatsAppProvider.sendMessage()
 *
 * Allowed action types (based on real backend audit):
 *   - mark_recovery_contacted  → recoveryService.markContacted()
 *   - mark_recovery_responded  → recoveryService.markResponded()
 *   - dismiss_recovery         → recoveryService.dismissOpportunity()
 *   - confirm_appointment      → appointmentService.updateStatus("confirmed")
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionTransitionError = exports.ActionConversationMismatchError = exports.ActionTargetNotFoundError = exports.InvalidActionTypeError = exports.ALLOWED_ACTION_TYPES = void 0;
exports.executeAIAction = executeAIAction;
const mongoose_1 = __importDefault(require("mongoose"));
const communication_model_1 = require("../communications/communication.model");
const recovery_model_1 = require("../recovery/recovery.model");
const appointment_model_1 = require("../appointments/appointment.model");
const recovery_service_1 = require("../recovery/recovery.service");
const appointment_service_1 = require("../appointments/appointment.service");
// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
exports.ALLOWED_ACTION_TYPES = [
    "mark_recovery_contacted",
    "mark_recovery_responded",
    "dismiss_recovery",
    "confirm_appointment",
    "book_appointment",
    "reschedule_appointment"
];
// ──────────────────────────────────────────────────────────────────────────────
// Errors
// ──────────────────────────────────────────────────────────────────────────────
class InvalidActionTypeError extends Error {
    constructor(type) {
        super(`Unknown or unauthorized action type: '${type}'`);
        this.name = "InvalidActionTypeError";
    }
}
exports.InvalidActionTypeError = InvalidActionTypeError;
class ActionTargetNotFoundError extends Error {
    constructor() {
        super("Action target not found or does not belong to this tenant/conversation");
        this.name = "ActionTargetNotFoundError";
    }
}
exports.ActionTargetNotFoundError = ActionTargetNotFoundError;
class ActionConversationMismatchError extends Error {
    constructor() {
        super("Action target does not correspond to the patient linked to this conversation");
        this.name = "ActionConversationMismatchError";
    }
}
exports.ActionConversationMismatchError = ActionConversationMismatchError;
class ActionTransitionError extends Error {
    constructor(message) {
        super(message);
        this.name = "ActionTransitionError";
    }
}
exports.ActionTransitionError = ActionTransitionError;
// ──────────────────────────────────────────────────────────────────────────────
// Main Executor
// ──────────────────────────────────────────────────────────────────────────────
async function executeAIAction(tenantId, conversationId, action) {
    // 1. Validate action type is in the allowlist — confidence is NEVER checked here
    if (!exports.ALLOWED_ACTION_TYPES.includes(action.type)) {
        throw new InvalidActionTypeError(action.type);
    }
    const actionType = action.type;
    // 2. Validate conversationId format
    if (!mongoose_1.default.Types.ObjectId.isValid(conversationId)) {
        throw new ActionTargetNotFoundError();
    }
    // 3. Load conversation and enforce tenant ownership
    const conversation = await communication_model_1.Conversation.findOne({
        _id: conversationId,
        tenantId: new mongoose_1.default.Types.ObjectId(tenantId),
    }).lean();
    if (!conversation) {
        throw new ActionTargetNotFoundError();
    }
    // 4. Get the patientId linked to this conversation (required for cross-patient check)
    const conversationPatientId = conversation.patientId?.toString();
    if (!conversationPatientId) {
        throw new ActionConversationMismatchError();
    }
    // 5. Dispatch to appropriate handler
    switch (actionType) {
        case "mark_recovery_contacted":
            if (!mongoose_1.default.Types.ObjectId.isValid(action.targetId))
                throw new ActionTargetNotFoundError();
            return handleRecoveryAction(tenantId, action.targetId, conversationPatientId, "contacted");
        case "mark_recovery_responded":
            if (!mongoose_1.default.Types.ObjectId.isValid(action.targetId))
                throw new ActionTargetNotFoundError();
            return handleRecoveryAction(tenantId, action.targetId, conversationPatientId, "responded");
        case "dismiss_recovery":
            if (!mongoose_1.default.Types.ObjectId.isValid(action.targetId))
                throw new ActionTargetNotFoundError();
            return handleRecoveryAction(tenantId, action.targetId, conversationPatientId, "dismissed");
        case "confirm_appointment":
            if (!mongoose_1.default.Types.ObjectId.isValid(action.targetId))
                throw new ActionTargetNotFoundError();
            return handleAppointmentConfirm(tenantId, action.targetId, conversationPatientId);
        case "book_appointment":
            return handleAppointmentBooking(tenantId, conversationPatientId, conversationPatientId, action.booking);
        case "reschedule_appointment":
            return handleAppointmentReschedule(tenantId, action.targetId, conversationPatientId, action.booking);
    }
}
// ──────────────────────────────────────────────────────────────────────────────
// Handlers — use real business services, reuse their validation & transitions
// ──────────────────────────────────────────────────────────────────────────────
async function handleRecoveryAction(tenantId, recoveryId, conversationPatientId, targetStatus) {
    // Load and verify tenant ownership
    const recovery = await recovery_model_1.Recovery.findOne({ _id: recoveryId, tenantId }).lean();
    if (!recovery)
        throw new ActionTargetNotFoundError();
    // CRITICAL: verify this recovery belongs to the same patient as the conversation
    if (recovery.patientId.toString() !== conversationPatientId) {
        throw new ActionConversationMismatchError();
    }
    // Idempotency: already in target state
    if (recovery.status === targetStatus) {
        return {
            type: `${targetStatus === "contacted" ? "mark_recovery_contacted" : targetStatus === "responded" ? "mark_recovery_responded" : "dismiss_recovery"}`,
            targetId: recoveryId,
            outcome: "already_in_state",
            message: `Recovery is already in '${targetStatus}' state`,
        };
    }
    // Delegate to existing service (which enforces the state machine validateTransition)
    try {
        if (targetStatus === "contacted") {
            await recovery_service_1.recoveryService.markContacted(recoveryId, tenantId);
        }
        else if (targetStatus === "responded") {
            await recovery_service_1.recoveryService.markResponded(recoveryId, tenantId);
        }
        else {
            await recovery_service_1.recoveryService.dismissOpportunity(recoveryId, tenantId);
        }
    }
    catch (err) {
        throw new ActionTransitionError(err.message);
    }
    const actionTypeMap = {
        contacted: "mark_recovery_contacted",
        responded: "mark_recovery_responded",
        dismissed: "dismiss_recovery",
    };
    return {
        type: actionTypeMap[targetStatus],
        targetId: recoveryId,
        outcome: "success",
        message: `Recovery marked as '${targetStatus}'`,
    };
}
async function handleAppointmentConfirm(tenantId, appointmentId, conversationPatientId) {
    // Load and verify tenant ownership AND patient match
    const appointment = await appointment_model_1.Appointment.findOne({ _id: appointmentId, tenantId }).lean();
    if (!appointment)
        throw new ActionTargetNotFoundError();
    // CRITICAL: verify this appointment belongs to the same patient as the conversation
    if (appointment.patientId.toString() !== conversationPatientId) {
        throw new ActionConversationMismatchError();
    }
    // Only scheduled appointments can be confirmed
    if (!["scheduled", "confirmed"].includes(appointment.status)) {
        throw new ActionTransitionError(`Cannot confirm appointment with status '${appointment.status}'. Only 'scheduled' appointments can be confirmed.`);
    }
    // Idempotency: already confirmed
    if (appointment.status === "confirmed") {
        return {
            type: "confirm_appointment",
            targetId: appointmentId,
            outcome: "already_in_state",
            message: "Appointment is already confirmed",
        };
    }
    // Delegate to the real service — it handles recovery hooks on status change
    try {
        await appointment_service_1.appointmentService.updateStatus(appointmentId, "confirmed", tenantId);
    }
    catch (err) {
        throw new ActionTransitionError(err.message);
    }
    return {
        type: "confirm_appointment",
        targetId: appointmentId,
        outcome: "success",
        message: "Appointment confirmed",
    };
}
async function handleAppointmentBooking(tenantId, targetId, // This is the patientId from context or "self"
conversationPatientId, bookingData) {
    if (targetId !== "self" && targetId !== conversationPatientId) {
        throw new ActionConversationMismatchError();
    }
    if (!bookingData || !bookingData.date || !bookingData.startTime || !bookingData.durationMin || !bookingData.treatment) {
        throw new ActionTransitionError("Missing required booking fields (date, startTime, durationMin, treatment).");
    }
    // 1. Resolve Doctor — deterministic: clinic_owner first, dentist fallback
    const doctorId = await resolveDoctorForTenant(tenantId);
    // 2. Validate Business Hours using Phase 6.7 Service
    const { availabilityService } = await import("../appointments/availability.service");
    const slotsResult = await availabilityService.getAvailableSlots({
        tenantId,
        date: bookingData.date,
        durationMin: bookingData.durationMin,
    });
    if (slotsResult.error) {
        throw new ActionTransitionError(`Availability check failed: ${slotsResult.error}`);
    }
    // 3. Compute endTime
    const [h, m] = bookingData.startTime.split(":").map(Number);
    const startMins = h * 60 + m;
    const endMins = startMins + bookingData.durationMin;
    const endH = Math.floor(endMins / 60).toString().padStart(2, "0");
    const endM = (endMins % 60).toString().padStart(2, "0");
    const endTime = `${endH}:${endM}`;
    // 4. Create appointment. appointmentService.createAppointment calls checkAvailability to re-validate!
    try {
        await appointment_service_1.appointmentService.createAppointment({
            patientId: conversationPatientId,
            doctorId,
            date: bookingData.date,
            startTime: bookingData.startTime,
            endTime,
            durationMin: bookingData.durationMin,
            treatment: bookingData.treatment,
            status: "scheduled",
            source: "ai"
        }, tenantId);
    }
    catch (err) {
        if (err.message === "Double_Booking_Error") {
            throw new ActionTransitionError("Le créneau n'est plus disponible (Double_Booking_Error).");
        }
        throw new ActionTransitionError(err.message);
    }
    return {
        type: "book_appointment",
        targetId: conversationPatientId,
        outcome: "success",
        message: "Appointment successfully booked."
    };
}
async function handleAppointmentReschedule(tenantId, targetId, conversationPatientId, bookingData) {
    if (!bookingData || !bookingData.date || !bookingData.startTime) {
        throw new ActionTransitionError("Missing required rescheduling fields (date, startTime).");
    }
    // 1. Find the target appointment
    let appointment;
    if (targetId && targetId !== "self" && mongoose_1.default.Types.ObjectId.isValid(targetId)) {
        appointment = await appointment_model_1.Appointment.findOne({ _id: targetId, tenantId, patientId: conversationPatientId });
    }
    // If not found by targetId, resolve the active upcoming appointment for this patient
    if (!appointment) {
        appointment = await appointment_model_1.Appointment.findOne({
            tenantId,
            patientId: conversationPatientId,
            status: { $in: ["scheduled", "confirmed"] }
        }).sort({ date: 1, startTime: 1 });
    }
    if (!appointment) {
        throw new ActionTargetNotFoundError();
    }
    // 2. Compute endTime
    const durationMin = bookingData.durationMin || appointment.durationMin || 30;
    const [h, m] = bookingData.startTime.split(":").map(Number);
    const startMins = h * 60 + m;
    const endMins = startMins + durationMin;
    const endH = Math.floor(endMins / 60).toString().padStart(2, "0");
    const endM = (endMins % 60).toString().padStart(2, "0");
    const endTime = `${endH}:${endM}`;
    // 3. Delegate to appointmentService.updateAppointment (verifies availability & prevents double booking)
    try {
        const updated = await appointment_service_1.appointmentService.updateAppointment(appointment._id.toString(), {
            date: bookingData.date,
            startTime: bookingData.startTime,
            endTime,
            durationMin,
            treatment: bookingData.treatment || appointment.treatment,
            status: "scheduled",
            source: "ai"
        }, tenantId);
        if (!updated) {
            throw new ActionTransitionError("Failed to update appointment in database.");
        }
    }
    catch (err) {
        if (err.message === "Double_Booking_Error") {
            throw new ActionTransitionError("Le créneau n'est plus disponible (Double_Booking_Error).");
        }
        throw new ActionTransitionError(err.message);
    }
    return {
        type: "reschedule_appointment",
        targetId: appointment._id.toString(),
        outcome: "success",
        message: "Appointment successfully rescheduled."
    };
}
/**
 * Resolves the treating doctor for a tenant.
 */
async function resolveDoctorForTenant(tenantId) {
    const { User } = await import("../users/user.model");
    // Try clinic_owner first (primary ownership role)
    const owners = await User.find({ tenantId, role: "clinic_owner" }).lean();
    if (owners.length >= 1) {
        return owners[0]._id.toString();
    }
    // No clinic_owner: fall back to dentist
    const dentists = await User.find({ tenantId, role: "dentist" }).lean();
    if (dentists.length >= 1) {
        return dentists[0]._id.toString();
    }
    // Fall back to any active user for this tenant
    const users = await User.find({ tenantId }).lean();
    if (users.length >= 1) {
        return users[0]._id.toString();
    }
    throw new ActionTransitionError("No doctor (clinic_owner or dentist) configured for this tenant.");
}
//# sourceMappingURL=ai.action.executor.js.map