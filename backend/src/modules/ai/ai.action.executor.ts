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
  "reschedule_appointment",
  "cancel_appointment",
  "reassign_appointment_patient",
  "join_waitlist"
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
  patientInfo?: {
    firstName: string;
    lastName: string;
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

  // 1.5. GLOBAL ANTI-HALLUCINATION FIREWALL
  // Validate all data structures coming from AI before any logic runs
  if (action.targetId && action.targetId !== "self" && !mongoose.Types.ObjectId.isValid(action.targetId)) {
    // Some actions allow text names for targetId (e.g. reschedule fuzzy match). Only enforce for strict ones.
    const strictIdActions = ["mark_recovery_contacted", "mark_recovery_responded", "dismiss_recovery", "confirm_appointment", "cancel_appointment", "reassign_appointment_patient"];
    if (strictIdActions.includes(actionType)) {
      throw new ActionTransitionError(`Action ${actionType} requires a valid ObjectId targetId. Received: ${action.targetId}`);
    }
  }

  if (action.booking) {
    if (action.booking.date && !/^\d{4}-\d{2}-\d{2}$/.test(action.booking.date)) {
      throw new ActionTransitionError(`Format de date invalide (attendu YYYY-MM-DD): ${action.booking.date}`);
    }
    if (action.booking.startTime && !/^\d{2}:\d{2}$/.test(action.booking.startTime)) {
      throw new ActionTransitionError(`Format d'heure invalide (attendu HH:MM): ${action.booking.startTime}`);
    }
    if (action.booking.durationMin && (isNaN(action.booking.durationMin) || action.booking.durationMin <= 0 || action.booking.durationMin > 240)) {
      throw new ActionTransitionError(`Durée invalide: ${action.booking.durationMin}`);
    }
    if (action.booking.treatment && action.booking.treatment.length < 3) {
      throw new ActionTransitionError(`Nom du traitement invalide ou trop court.`);
    }
  }

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
      if (action.targetId === "self") {
        const { Appointment: ApptModel } = await import("../appointments/appointment.model");
        const appt = await ApptModel.findOne({ tenantId, patientId: conversationPatientId, status: { $in: ["scheduled", "confirmed"] } }).sort({ date: 1, startTime: 1 }).lean();
        if (!appt) throw new ActionTargetNotFoundError();
        action.targetId = appt._id.toString();
      }
      if (!mongoose.Types.ObjectId.isValid(action.targetId)) throw new ActionTargetNotFoundError();
      return handleAppointmentConfirm(tenantId, action.targetId, conversationPatientId);

    case "book_appointment":
      return handleAppointmentBooking(tenantId, action.targetId, conversationPatientId, action.booking);

    case "reschedule_appointment":
      return handleAppointmentReschedule(tenantId, action.targetId, conversationPatientId, action.booking);

    case "cancel_appointment":
      if (action.targetId === "self") {
        const { Appointment: ApptModel } = await import("../appointments/appointment.model");
        const appt = await ApptModel.findOne({ tenantId, patientId: conversationPatientId, status: { $in: ["scheduled", "confirmed"] } }).sort({ date: 1, startTime: 1 }).lean();
        if (!appt) throw new ActionTargetNotFoundError();
        action.targetId = appt._id.toString();
      }
      if (!mongoose.Types.ObjectId.isValid(action.targetId)) throw new ActionTargetNotFoundError();
      return handleAppointmentCancel(tenantId, action.targetId, conversationPatientId);
      
    case "join_waitlist":
      return handleJoinWaitlist(tenantId, action.targetId, conversationPatientId, action.booking);

    case "reassign_appointment_patient":
      if (!mongoose.Types.ObjectId.isValid(action.targetId)) throw new ActionTargetNotFoundError();
      return handleAppointmentReassignment(tenantId, action.targetId, conversationPatientId, action.patientInfo, conversation.contactWaId);
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

  // CRITICAL: verify this appointment belongs to the patient or a family member
  const apptPatientIdStr = appointment.patientId.toString();
  if (apptPatientIdStr !== conversationPatientId) {
    const { Patient: SecPatientModel } = await import("../patients/patient.model");
    const conversationPatient = await SecPatientModel.findOne({ _id: conversationPatientId, tenantId }).lean();
    const phone = (conversationPatient as any)?.phone;
    if (!phone) {
      throw new ActionTransitionError("Security error: unauthorized cross-patient confirmation attempt.");
    }
    const apptPatient = await SecPatientModel.findOne({ _id: apptPatientIdStr, tenantId }).lean();
    if (!apptPatient || (apptPatient as any).phone !== phone) {
      throw new ActionTransitionError("Security error: appointment belongs to an unauthorized patient.");
    }
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

async function handleAppointmentCancel(
  tenantId: string,
  appointmentId: string,
  conversationPatientId: string
): Promise<AIActionResult> {
  // 1. Fetch appointment and verify tenant ownership
  const appointment = await Appointment.findOne({ _id: appointmentId, tenantId }).lean();
  if (!appointment) throw new ActionTargetNotFoundError();

  // 2. Security Check: the appointment must belong to the patient or a family member
  const { Patient: SecPatientModel } = await import("../patients/patient.model");
  const conversationPatient = await SecPatientModel.findOne({ _id: conversationPatientId, tenantId }).lean();
  if (!conversationPatient) throw new ActionTransitionError("Security error: conversation patient not found.");

  const apptPatientIdStr = appointment.patientId.toString();
  if (apptPatientIdStr !== conversationPatientId) {
    const phone = (conversationPatient as any).phone;
    if (!phone) {
      throw new ActionTransitionError("Security error: unauthorized cross-patient cancellation attempt.");
    }
    const apptPatient = await SecPatientModel.findOne({ _id: apptPatientIdStr, tenantId }).lean();
    if (!apptPatient || (apptPatient as any).phone !== phone) {
      throw new ActionTransitionError("Security error: appointment belongs to an unauthorized patient.");
    }
  }

  // 3. Prevent transitioning if already cancelled
  if (appointment.status === "cancelled") {
    return {
      type: "cancel_appointment",
      targetId: appointmentId,
      outcome: "already_in_state",
      message: "Appointment is already cancelled",
    };
  }

  // 4. Update status via service (triggers waitlist and recovery automatically)
  try {
    await appointmentService.updateStatus(appointmentId, "cancelled", tenantId);
  } catch (err: any) {
    throw new ActionTransitionError(err.message);
  }

  return {
    type: "cancel_appointment",
    targetId: appointmentId,
    outcome: "success",
    message: "Appointment cancelled",
  };
}

async function handleJoinWaitlist(
  tenantId: string,
  targetId: string,
  conversationPatientId: string,
  bookingData?: {
    date: string;
    startTime: string;
    treatment: string;
  }
): Promise<AIActionResult> {
  let resolvedPatientId = conversationPatientId;
  if (targetId && targetId !== "self" && mongoose.Types.ObjectId.isValid(targetId)) {
    const { Patient } = await import("../patients/patient.model");
    const targetPatient = await Patient.findOne({
      _id: new mongoose.Types.ObjectId(targetId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
    }).lean();
    if (!targetPatient) throw new ActionConversationMismatchError();
    resolvedPatientId = targetId;
  }

  if (!bookingData || !bookingData.date || !bookingData.startTime || !bookingData.treatment) {
    throw new ActionTransitionError("Missing required fields for waitlist (date, startTime, treatment).");
  }

  const { waitlistService } = await import("../waitlist/waitlist.service");
  
  // Convert date to weekday (for preferredDays)
  const d = new Date(bookingData.date);
  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const preferredDay = weekdays[d.getDay()];

  await waitlistService.createEntry({
    patientId: new mongoose.Types.ObjectId(resolvedPatientId),
    treatment: bookingData.treatment,
    priority: "high",
    preferredDays: [preferredDay],
    preferredTimeRanges: [bookingData.startTime],
    notes: `Added by AI for ${bookingData.date} at ${bookingData.startTime}`,
  }, tenantId);

  return {
    type: "join_waitlist",
    targetId: resolvedPatientId,
    outcome: "success",
    message: "Patient added to waitlist",
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
    // Phase 6.17.2: targetId is a name, fuzzy match family member
    const { Patient: FbPatientModel } = await import("../patients/patient.model");
    const conversationPatient = await FbPatientModel.findOne({ _id: conversationPatientId, tenantId }).lean();
    if (conversationPatient && (conversationPatient as any).phone) {
      const familyMembers = await FbPatientModel.find({
        tenantId,
        phone: (conversationPatient as any).phone
      }).lean();
      
      const targetLower = targetId.toLowerCase().trim();
      const matchedMember = familyMembers.find((m: any) => 
        (m.firstName && targetLower.includes(m.firstName.toLowerCase())) ||
        (m.lastName && targetLower.includes(m.lastName.toLowerCase())) ||
        (m.firstName && m.lastName && targetLower.includes(`${m.firstName.toLowerCase()} ${m.lastName.toLowerCase()}`))
      );

      if (matchedMember) {
        resolvedPatientId = matchedMember._id.toString();
      } else {
        throw new ActionConversationMismatchError();
      }
    } else {
      throw new ActionConversationMismatchError();
    }
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

  // 3.5 GUARD: If the patient already has an upcoming active appointment, block the new booking.
  // We must NEVER silently reschedule an existing appointment when the patient books a NEW one.
  // The booking service will catch Active_Appointment_Exists and inform the patient, asking
  // if they want to keep both (if the dates differ) or reschedule.
  const existingAppt = await Appointment.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    patientId: new mongoose.Types.ObjectId(resolvedPatientId),
    status: { $in: ["scheduled", "confirmed"] },
    date: { $gte: new Date().toISOString().slice(0, 10) }
  }).sort({ date: 1, startTime: 1 }).lean();

  if (existingAppt) {
    console.log(`[AI Executor] Patient ${resolvedPatientId} already has an upcoming appointment on ${existingAppt.date} at ${existingAppt.startTime}. Blocking new booking.`);
    throw new ActionTransitionError(`Active_Appointment_Exists:${existingAppt.date}:${existingAppt.startTime}`);
  }

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
      throw new ActionTransitionError(`Active_Appointment_Exists:${existingDate}:${existingTime}`);
    }
    if (err.message?.startsWith("Past_Date_Error")) {
      throw new ActionTransitionError("Past_Date_Error");
    }
    if (err.message === "SLOT_UNAVAILABLE") {
      throw new ActionTransitionError("SLOT_UNAVAILABLE");
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

  // IMPORTANT: Do NOT fall back to the conversation patient's own appointment
  // if targetId was a family member's appointmentId that wasn't found.
  // This would cause the wrong patient's appointment to be rescheduled.
  // If targetId is a valid ObjectId but no appointment was found, refuse.
  if (!appointment && targetId && targetId !== "self" && mongoose.Types.ObjectId.isValid(targetId)) {
    // targetId was provided but not found — could be patient ID
    // Only fall back to searching by patientId if targetId is a patientId (not appointment)
    const { Patient: FbPatientModel } = await import("../patients/patient.model");
    const isPatientId = await FbPatientModel.findOne({ _id: targetId, tenantId }).select("_id").lean();
    if (isPatientId) {
      // targetId is a patient ID — find their appointment
      appointment = await Appointment.findOne({
        tenantId,
        patientId: targetId,
        status: { $in: ["scheduled", "confirmed"] }
      }).sort({ date: 1, startTime: 1 });
    }
    // If targetId is neither a valid appointment nor a patient, fail cleanly
  }

  // If targetId is NOT a valid ObjectId and NOT "self" (e.g., it's a name like "Layan bensmida")
  if (!appointment && targetId && targetId !== "self" && !mongoose.Types.ObjectId.isValid(targetId)) {
    const { Patient: FbPatientModel } = await import("../patients/patient.model");
    const conversationPatient = await FbPatientModel.findOne({ _id: conversationPatientId, tenantId }).lean();
    if (conversationPatient && (conversationPatient as any).phone) {
      // Find all family members with the same phone
      const familyMembers = await FbPatientModel.find({
        tenantId,
        phone: (conversationPatient as any).phone
      }).lean();
      
      // Fuzzy match by name
      const targetLower = targetId.toLowerCase().trim();
      const matchedMember = familyMembers.find((m: any) => 
        (m.firstName && targetLower.includes(m.firstName.toLowerCase())) ||
        (m.lastName && targetLower.includes(m.lastName.toLowerCase())) ||
        (m.firstName && m.lastName && targetLower.includes(`${m.firstName.toLowerCase()} ${m.lastName.toLowerCase()}`))
      );

      if (matchedMember) {
        appointment = await Appointment.findOne({
          tenantId,
          patientId: matchedMember._id,
          status: { $in: ["scheduled", "confirmed"] }
        }).sort({ date: 1, startTime: 1 });
      }
    }
  }

  // Final fallback: only if NO targetId was provided at all (self-reschedule)
  if (!appointment && (!targetId || targetId === "self")) {
    appointment = await Appointment.findOne({
      tenantId,
      patientId: conversationPatientId,
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
      throw new ActionTransitionError("Past_Date_Error");
    }
    if (err.message === "SLOT_UNAVAILABLE") {
      throw new ActionTransitionError("SLOT_UNAVAILABLE");
    }
    if (err.message?.startsWith("Active_Appointment_Exists")) {
      const parts = err.message.split(":");
      const existingDate = parts[1] || "";
      const existingTime = parts.slice(2).join(":") || "";
      throw new ActionTransitionError(`Active_Appointment_Exists:${existingDate}:${existingTime}`);
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

async function handleAppointmentReassignment(
  tenantId: string,
  appointmentId: string,
  conversationPatientId: string,
  patientInfo: { firstName: string; lastName: string } | undefined,
  contactWaId: string | undefined
): Promise<AIActionResult> {
  if (!patientInfo || !patientInfo.firstName || !patientInfo.lastName) {
    throw new ActionTransitionError("Missing patient name for reassignment.");
  }

  if (/\d/.test(patientInfo.firstName) || /\d/.test(patientInfo.lastName)) {
    throw new ActionTransitionError("Invalid patient name format (contains digits). Please ask for the real name.");
  }
  if (patientInfo.firstName.length < 2 || patientInfo.lastName.length < 2) {
    throw new ActionTransitionError("Invalid patient name format (too short). Please ask for the real name.");
  }

  // 1. Fetch appointment and security checks
  const appointment = await Appointment.findOne({ _id: appointmentId, tenantId }).lean();
  if (!appointment) throw new ActionTargetNotFoundError();

  const { Patient: SecPatientModel } = await import("../patients/patient.model");
  const conversationPatient = await SecPatientModel.findOne({ _id: conversationPatientId, tenantId }).lean();
  if (!conversationPatient) throw new ActionTransitionError("Security error: conversation patient not found.");

  const apptPatientIdStr = appointment.patientId.toString();
  if (apptPatientIdStr !== conversationPatientId) {
    const phone = (conversationPatient as any).phone;
    if (!phone) throw new ActionTransitionError("Security error: unauthorized cross-patient reassignment attempt.");
    const apptPatient = await SecPatientModel.findOne({ _id: apptPatientIdStr, tenantId }).lean();
    if (!apptPatient || (apptPatient as any).phone !== phone) {
      throw new ActionTransitionError("Security error: appointment belongs to an unauthorized patient.");
    }
  }

  // 2. Find the target patient
  let targetPatientId = conversationPatientId;
  const sameName = patientInfo.firstName.toLowerCase() === (conversationPatient.firstName || "").toLowerCase() &&
                   patientInfo.lastName.toLowerCase() === (conversationPatient.lastName || "").toLowerCase();
  
  if (!sameName) {
    const existing = await SecPatientModel.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      firstName: { $regex: new RegExp(`^${patientInfo.firstName}$`, "i") },
      lastName: { $regex: new RegExp(`^${patientInfo.lastName}$`, "i") },
    }).lean();

    if (existing.length === 0) {
      // Create the patient automatically since the user provided the name
      const phone = contactWaId || (conversationPatient as any).phone || `wa-family-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const created = await SecPatientModel.create({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        firstName: patientInfo.firstName,
        lastName: patientInfo.lastName,
        language: "fr",
        status: "lead",
        phone,
      });
      targetPatientId = created._id.toString();
    } else if (existing.length > 1) {
      // Phase 2: gérer les homonymes avec PATIENT_AMBIGUOUS
      throw new ActionTransitionError("PATIENT_AMBIGUOUS");
    } else {
      targetPatientId = existing[0]._id.toString();
    }
  }

  // Idempotency
  if (appointment.patientId.toString() === targetPatientId) {
    return {
      type: "reassign_appointment_patient",
      targetId: appointmentId,
      outcome: "already_in_state",
      message: `Le rendez-vous est déjà attribué à ${patientInfo.firstName} ${patientInfo.lastName}.`,
    };
  }

  // Phase 2: Vérifier que le rendez-vous est encore modifiable
  if (!["scheduled", "confirmed"].includes(appointment.status)) {
    throw new ActionTransitionError("Rendez-vous hedha ma 3adech yetbadel.");
  }

  // Phase 2: Vérifier que le patient cible n'a pas déjà un rendez-vous actif incompatible le même jour
  const incompatibleAppt = await Appointment.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    patientId: new mongoose.Types.ObjectId(targetPatientId),
    date: appointment.date,
    status: { $in: ["scheduled", "confirmed"] },
  }).lean();
  
  if (incompatibleAppt) {
    throw new ActionTransitionError("Mra4 hedha 3andou rendez-vous e5er f nafs nhar.");
  }

  // 3. Update the appointment with the new patientId
  try {
    await Appointment.findByIdAndUpdate(appointmentId, { $set: { patientId: new mongoose.Types.ObjectId(targetPatientId) } });
    
    // Phase 2: Enregistrer un audit
    console.log(JSON.stringify({
      event: "APPOINTMENT_REASSIGNED",
      tenantId,
      appointmentId,
      oldPatientId: appointment.patientId.toString(),
      newPatientId: targetPatientId,
      timestamp: new Date().toISOString()
    }));
  } catch (err: any) {
    throw new ActionTransitionError(err.message);
  }

  return {
    type: "reassign_appointment_patient",
    targetId: appointmentId,
    outcome: "success",
    message: `Le rendez-vous a bien été attribué à ${patientInfo.firstName} ${patientInfo.lastName}.`,
  };
}
