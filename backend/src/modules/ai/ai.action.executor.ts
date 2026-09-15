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

import mongoose from "mongoose";
import { Conversation } from "../communications/communication.model";
import { Recovery } from "../recovery/recovery.model";
import { Appointment } from "../appointments/appointment.model";
import { recoveryService } from "../recovery/recovery.service";
import { appointmentService } from "../appointments/appointment.service";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export const ALLOWED_ACTION_TYPES = [
  "mark_recovery_contacted",
  "mark_recovery_responded",
  "dismiss_recovery",
  "confirm_appointment",
  "book_appointment"
] as const;

export type AllowedActionType = typeof ALLOWED_ACTION_TYPES[number];

export interface AIActionRequest {
  type: string;    // validated to AllowedActionType below
  targetId: string;
  booking?: {
    date: string;
    startTime: string;
    durationMin: number;
    treatment: string;
  };
}

export interface AIActionResult {
  type: AllowedActionType;
  targetId: string;
  outcome: "success" | "already_in_state";
  message: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Errors
// ──────────────────────────────────────────────────────────────────────────────

export class InvalidActionTypeError extends Error {
  constructor(type: string) {
    super(`Unknown or unauthorized action type: '${type}'`);
    this.name = "InvalidActionTypeError";
  }
}

export class ActionTargetNotFoundError extends Error {
  constructor() {
    super("Action target not found or does not belong to this tenant/conversation");
    this.name = "ActionTargetNotFoundError";
  }
}

export class ActionConversationMismatchError extends Error {
  constructor() {
    super("Action target does not correspond to the patient linked to this conversation");
    this.name = "ActionConversationMismatchError";
  }
}

export class ActionTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionTransitionError";
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Executor
// ──────────────────────────────────────────────────────────────────────────────

export async function executeAIAction(
  tenantId: string,
  conversationId: string,
  action: AIActionRequest
): Promise<AIActionResult> {

  // 1. Validate action type is in the allowlist — confidence is NEVER checked here
  if (!ALLOWED_ACTION_TYPES.includes(action.type as AllowedActionType)) {
    throw new InvalidActionTypeError(action.type);
  }
  const actionType = action.type as AllowedActionType;

  // 2. Validate conversationId format
  if (!mongoose.Types.ObjectId.isValid(conversationId) || !mongoose.Types.ObjectId.isValid(action.targetId)) {
    throw new ActionTargetNotFoundError();
  }

  // 3. Load conversation and enforce tenant ownership
  const conversation = await Conversation.findOne({
    _id: conversationId,
    tenantId: new mongoose.Types.ObjectId(tenantId),
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
      return handleRecoveryAction(tenantId, action.targetId, conversationPatientId, "contacted");

    case "mark_recovery_responded":
      return handleRecoveryAction(tenantId, action.targetId, conversationPatientId, "responded");

    case "dismiss_recovery":
      return handleRecoveryAction(tenantId, action.targetId, conversationPatientId, "dismissed");

    case "confirm_appointment":
      return handleAppointmentConfirm(tenantId, action.targetId, conversationPatientId);

    case "book_appointment":
      return handleAppointmentBooking(tenantId, action.targetId, conversationPatientId, action.booking);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Handlers — use real business services, reuse their validation & transitions
// ──────────────────────────────────────────────────────────────────────────────

async function handleRecoveryAction(
  tenantId: string,
  recoveryId: string,
  conversationPatientId: string,
  targetStatus: "contacted" | "responded" | "dismissed"
): Promise<AIActionResult> {
  // Load and verify tenant ownership
  const recovery = await Recovery.findOne({ _id: recoveryId, tenantId }).lean();
  if (!recovery) throw new ActionTargetNotFoundError();

  // CRITICAL: verify this recovery belongs to the same patient as the conversation
  if (recovery.patientId.toString() !== conversationPatientId) {
    throw new ActionConversationMismatchError();
  }

  // Idempotency: already in target state
  if (recovery.status === targetStatus) {
    return {
      type: `${targetStatus === "contacted" ? "mark_recovery_contacted" : targetStatus === "responded" ? "mark_recovery_responded" : "dismiss_recovery"}` as AllowedActionType,
      targetId: recoveryId,
      outcome: "already_in_state",
      message: `Recovery is already in '${targetStatus}' state`,
    };
  }

  // Delegate to existing service (which enforces the state machine validateTransition)
  try {
    if (targetStatus === "contacted") {
      await recoveryService.markContacted(recoveryId, tenantId);
    } else if (targetStatus === "responded") {
      await recoveryService.markResponded(recoveryId, tenantId);
    } else {
      await recoveryService.dismissOpportunity(recoveryId, tenantId);
    }
  } catch (err: any) {
    throw new ActionTransitionError(err.message);
  }

  const actionTypeMap: Record<string, AllowedActionType> = {
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

async function handleAppointmentConfirm(
  tenantId: string,
  appointmentId: string,
  conversationPatientId: string
): Promise<AIActionResult> {
  // Load and verify tenant ownership AND patient match
  const appointment = await Appointment.findOne({ _id: appointmentId, tenantId }).lean();
  if (!appointment) throw new ActionTargetNotFoundError();

  // CRITICAL: verify this appointment belongs to the same patient as the conversation
  if (appointment.patientId.toString() !== conversationPatientId) {
    throw new ActionConversationMismatchError();
  }

  // Only scheduled appointments can be confirmed
  if (!["scheduled", "confirmed"].includes(appointment.status)) {
    throw new ActionTransitionError(
      `Cannot confirm appointment with status '${appointment.status}'. Only 'scheduled' appointments can be confirmed.`
    );
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
    await appointmentService.updateStatus(appointmentId, "confirmed", tenantId);
  } catch (err: any) {
    throw new ActionTransitionError(err.message);
  }

  return {
    type: "confirm_appointment",
    targetId: appointmentId,
    outcome: "success",
    message: "Appointment confirmed",
  };
}

async function handleAppointmentBooking(
  tenantId: string,
  targetId: string, // This is the patientId from context
  conversationPatientId: string,
  bookingData?: {
    date: string;
    startTime: string;
    durationMin: number;
    treatment: string;
  }
): Promise<AIActionResult> {
  if (targetId !== conversationPatientId) {
    throw new ActionConversationMismatchError();
  }

  if (!bookingData || !bookingData.date || !bookingData.startTime || !bookingData.durationMin || !bookingData.treatment) {
    throw new ActionTransitionError("Missing required booking fields (date, startTime, durationMin, treatment).");
  }

  // 1. Resolve Doctor — deterministic: clinic_owner first, dentist fallback, refuse if ambiguous
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
    await appointmentService.createAppointment({
      patientId: conversationPatientId as any,
      doctorId,
      date: bookingData.date,
      startTime: bookingData.startTime,
      endTime,
      durationMin: bookingData.durationMin,
      treatment: bookingData.treatment,
      status: "scheduled"
    }, tenantId);
  } catch (err: any) {
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

/**
 * Resolves the unique treating doctor for a tenant.
 *
 * Rules (deterministic — no arbitrary first-found):
 *   1. Exactly one User with role 'clinic_owner' for this tenant → use it.
 *   2. Zero clinic_owners but exactly one 'dentist' → use it.
 *   3. Any other combination (0 or >1 in either category) → throw ActionTransitionError
 *      refusing the automatic booking (no arbitrary dentist selection, no confirmation).
 *
 * This prevents silent arbitrary selection when a tenant has multiple practitioners.
 */
async function resolveDoctorForTenant(tenantId: string): Promise<string> {
  const { User } = await import("../users/user.model");

  // Try clinic_owner first (primary ownership role)
  const owners = await User.find({ tenantId, role: "clinic_owner" }).lean();
  if (owners.length === 1) {
    return owners[0]._id.toString();
  }
  if (owners.length > 1) {
    throw new ActionTransitionError(
      "Multiple clinic owners found for this tenant. Cannot determine unique doctor for booking. Please ensure only one clinic owner is configured."
    );
  }

  // No clinic_owner: fall back to dentist
  const dentists = await User.find({ tenantId, role: "dentist" }).lean();
  if (dentists.length === 1) {
    return dentists[0]._id.toString();
  }
  if (dentists.length > 1) {
    throw new ActionTransitionError(
      "Multiple dentists found for this tenant. Cannot determine unique doctor. Please configure a single clinic owner."
    );
  }

  throw new ActionTransitionError("No doctor (clinic_owner or dentist) configured for this tenant.");
}
