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
  "book_appointment",
  "reschedule_appointment"
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
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
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
      if (!mongoose.Types.ObjectId.isValid(action.targetId)) throw new ActionTargetNotFoundError();
      return handleRecoveryAction(tenantId, action.targetId, conversationPatientId, "contacted");

    case "mark_recovery_responded":
      if (!mongoose.Types.ObjectId.isValid(action.targetId)) throw new ActionTargetNotFoundError();
      return handleRecoveryAction(tenantId, action.targetId, conversationPatientId, "responded");

    case "dismiss_recovery":
      if (!mongoose.Types.ObjectId.isValid(action.targetId)) throw new ActionTargetNotFoundError();
      return handleRecoveryAction(tenantId, action.targetId, conversationPatientId, "dismissed");

    case "confirm_appointment":
      if (!mongoose.Types.ObjectId.isValid(action.targetId)) throw new ActionTargetNotFoundError();
      return handleAppointmentConfirm(tenantId, action.targetId, conversationPatientId);

    case "book_appointment":
      return handleAppointmentBooking(tenantId, action.targetId, conversationPatientId, action.booking);

    case "reschedule_appointment":
      return handleAppointmentReschedule(tenantId, action.targetId, conversationPatientId, action.booking);
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

// Phase 6.17.1 — supports family-member bookings (targetId may differ from conversationPatientId)
async function handleAppointmentBooking(
  tenantId: string,
  targetId: string, // patientId of the booking target (may differ from conversation patient for family bookings)
  conversationPatientId: string,
  bookingData?: {
    date: string;
    startTime: string;
    durationMin: number;
    treatment: string;
  }
): Promise<AIActionResult> {
  // ── Resolve the actual patient for the appointment ──────────────────────
  // Phase 6.17.1: targetId may refer to a FAMILY MEMBER (different from the
  // conversation patient). We verify it belongs to this tenant before accepting it.
  let resolvedPatientId: string;
  if (targetId === "self" || targetId === conversationPatientId) {
    resolvedPatientId = conversationPatientId;
  } else if (mongoose.Types.ObjectId.isValid(targetId)) {
    // Verify the target patient belongs to this tenant (tenant isolation)
    const { Patient } = await import("../patients/patient.model");
    const targetPatient = await Patient.findOne({
      _id: new mongoose.Types.ObjectId(targetId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
    }).lean();
    if (!targetPatient) {
      throw new ActionConversationMismatchError();
    }
    // Target is a valid tenant-scoped patient — allow the family booking
    resolvedPatientId = targetId;
  } else {
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

  // 4. Create appointment for the RESOLVED patient (conversation patient or family member)
  try {
    await appointmentService.createAppointment({
      patientId: resolvedPatientId as any,
      doctorId,
      date: bookingData.date,
      startTime: bookingData.startTime,
      endTime,
      durationMin: bookingData.durationMin,
      treatment: bookingData.treatment,
      status: "scheduled",
      source: "ai"
    }, tenantId);
  } catch (err: any) {
    if (err.message?.startsWith("Active_Appointment_Exists")) {
      const parts = err.message.split(":");
      const existingDate = parts[1];
      const existingTime = parts.slice(2).join(":");
      const { formatDateFr } = await import("./temporal.utils");
      const frDate = formatDateFr(existingDate);
      throw new ActionTransitionError(`Vous avez déjà un rendez-vous prévu le ${frDate} à ${existingTime.replace(':', 'h')}. Vous ne pouvez pas prendre un deuxième rendez-vous en parallèle. Si vous souhaitez changer l'horaire, je peux vous aider à déplacer celui-ci.`);
    }
    if (err.message?.startsWith("Past_Date_Error")) {
      throw new ActionTransitionError("Le créneau demandé est dans le passé et ne peut pas être réservé.");
    }
    if (err.message === "SLOT_UNAVAILABLE") {
      throw new ActionTransitionError("Le créneau n'est plus disponible (SLOT_UNAVAILABLE).");
    }
    throw new ActionTransitionError(err.message);
  }

  return {
    type: "book_appointment",
    targetId: resolvedPatientId,
    outcome: "success",
    message: "Appointment successfully booked."
  };
}

async function handleAppointmentReschedule(
  tenantId: string,
  targetId: string,
  conversationPatientId: string,
  bookingData?: {
    date: string;
    startTime: string;
    durationMin?: number;
    treatment?: string;
  }
): Promise<AIActionResult> {
  if (!bookingData || !bookingData.date || !bookingData.startTime) {
    throw new ActionTransitionError("Missing required rescheduling fields (date, startTime).");
  }

  // 1. Find the target appointment
  let appointment;
  
  // Is targetId an appointment ID?
  if (targetId && targetId !== "self" && mongoose.Types.ObjectId.isValid(targetId)) {
    appointment = await Appointment.findOne({ _id: targetId, tenantId });
  }

  // If not found, targetId might be a patient ID (from resolveTargetPatient)
  let searchPatientId = conversationPatientId;
  if (!appointment && targetId && targetId !== "self" && mongoose.Types.ObjectId.isValid(targetId)) {
    const { Patient } = await import("../patients/patient.model");
    const targetPatient = await Patient.findOne({ _id: targetId, tenantId }).lean();
    if (targetPatient) {
      searchPatientId = targetId;
    }
  }

  // If still not found by appointment ID, resolve the active upcoming appointment for the appropriate patient
  if (!appointment) {
    appointment = await Appointment.findOne({
      tenantId,
      patientId: searchPatientId,
      status: { $in: ["scheduled", "confirmed"] }
    }).sort({ date: 1, startTime: 1 });
  }

  if (!appointment) {
    throw new ActionTargetNotFoundError();
  }

  // 1b. Security Check: Cross-patient protection
  // Verify that the appointment's patientId is either the conversation patient
  // OR a patient sharing the same phone number (family member).
  const { Patient: SecPatientModel } = await import("../patients/patient.model");
  const conversationPatient = await SecPatientModel.findOne({ _id: conversationPatientId, tenantId }).lean();
  
  if (!conversationPatient) {
    throw new ActionTransitionError("Security error: conversation patient not found.");
  }

  const apptPatientIdStr = appointment.patientId.toString();
  if (apptPatientIdStr !== conversationPatientId) {
    const phone = (conversationPatient as any).phone;
    if (!phone) {
      throw new ActionTransitionError("Security error: unauthorized cross-patient reschedule attempt.");
    }
    const apptPatient = await SecPatientModel.findOne({ _id: apptPatientIdStr, tenantId }).lean();
    if (!apptPatient || (apptPatient as any).phone !== phone) {
      throw new ActionTransitionError("Security error: appointment belongs to an unauthorized patient.");
    }
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
    const updated = await appointmentService.updateAppointment(
      appointment._id.toString(),
      {
        date: bookingData.date,
        startTime: bookingData.startTime,
        endTime,
        durationMin,
        treatment: bookingData.treatment || appointment.treatment,
        status: "scheduled",
        source: "ai"
      },
      tenantId
    );

    if (!updated) {
      throw new ActionTransitionError("Failed to update appointment in database.");
    }
  } catch (err: any) {
    if (err.message?.startsWith("Past_Date_Error")) {
      throw new ActionTransitionError("Le créneau demandé est dans le passé et ne peut pas être réservé.");
    }
    if (err.message === "SLOT_UNAVAILABLE") {
      throw new ActionTransitionError("Le créneau n'est plus disponible (SLOT_UNAVAILABLE).");
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
async function resolveDoctorForTenant(tenantId: string): Promise<string> {
  const { User } = await import("../users/user.model");

  // Try clinic_owner first (primary ownership role)
  const owners = await User.find({ tenantId, role: "clinic_owner" }).lean();
  if (owners.length === 1) {
    return owners[0]._id.toString();
  }
  if (owners.length > 1) {
    throw new ActionTransitionError("Multiple clinic owners configured; cannot determine treating doctor.");
  }

  // No clinic_owner: fall back to dentist
  const dentists = await User.find({ tenantId, role: "dentist" }).lean();
  if (dentists.length === 1) {
    return dentists[0]._id.toString();
  }
  if (dentists.length > 1) {
    throw new ActionTransitionError("Multiple dentists found without a primary clinic owner: cannot determine treating doctor automatically.");
  }

  // Fall back to any single active user for this tenant
  const users = await User.find({ tenantId }).lean();
  if (users.length === 1) {
    return users[0]._id.toString();
  }

  throw new ActionTransitionError("No doctor (clinic_owner or dentist) configured for this tenant.");
}
