import mongoose, { Document, Schema } from "mongoose";

/**
 * Stores the slots that were actually proposed to the patient in a previous
 * AI response. Used by the auto-booking flow to verify the patient's confirmed
 * slot matches a slot that was genuinely offered — not recalculated on-the-fly.
 */
export interface IPendingBookingContext {
  date: string;                                            // YYYY-MM-DD
  durationMin: number;                                     // duration used when generating slots
  treatment?: string;                                      // specific treatment discussed
  proposedSlots: Array<{ startTime: string; endTime: string }>; // slots sent to the patient
  proposedAt: Date;                                        // when the proposal was sent
  expiresAt: Date;                                         // when this context expires (e.g. 15 mins later)
  version: number;                                         // context version to avoid race conditions
  /** "booking" = new appointment, "reschedule" = modifying an existing one */
  mode?: "booking" | "reschedule";
  /** appointmentId (or patientId) of the appointment being rescheduled */
  targetAppointmentId?: string;
  /** patientId of the patient whose appointment is being rescheduled */
  targetPatientId?: string;
  /** Phase 6.17.1: target family member info if booking for a relative */
  targetPatientInfo?: { firstName: string; lastName: string };
}

export interface IConversation extends Document {
  tenantId: mongoose.Types.ObjectId;
  patientId?: mongoose.Types.ObjectId;
  channel: "whatsapp"; // Locked to whatsapp per requirements
  contactWaId: string; // The external WhatsApp ID (phone number with country code from Meta)
  status: "active" | "archived" | "internal";
  lastMessageAt: Date;
  /**
   * Set by aiAutoBookingService when the AI proposes slots to the patient.
   * Cleared after a successful booking or when new slots are proposed.
   * NEVER set by the AI directly — always set by the backend after validating slots.
   */
  pendingBookingContext?: IPendingBookingContext;
  /**
   * Set by the AI conversation service when the AI requests a human takeover
   * (needsHumanEscalation). While true, automatic AI processing is suspended
   * for this conversation — the team handles it from the dashboard.
   * NEVER set by the AI directly — always set by the backend.
   */
  needsHuman?: boolean;
  /**
   * Stores the patient's booking request when their name is missing.
   * Used to resume the booking once the patient provides their identity.
   */
    pendingBookingIntent?: {
    date: string;
    startTime: string;
    durationMin: number;
    treatment: string;
    awaitingIdentity: boolean;
    /** Phase 6.17.1: resolved name of the target patient if booking is for another person */
    targetPatientInfo?: { firstName: string; lastName: string };
    /** Phase 6.17.1: true while waiting for confirmation of ambiguous family vs self */
    awaitingTargetConfirmation?: boolean;
    /** Phase 6.17.2: true while waiting for the target patient's identity */
    awaitingTargetIdentity?: boolean;
  };
  pendingActionConfirmation?: {
    type: "cancel_appointment" | "confirm_appointment_status" | "reschedule_appointment";
    appointmentId: string;
    appointmentSummary: string;
    actionData?: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: false, index: true },
    channel: { type: String, enum: ["whatsapp"], default: "whatsapp", required: true },
    contactWaId: { type: String, required: true },
    status: { type: String, enum: ["active", "archived", "internal"], default: "active" },
    lastMessageAt: { type: Date, default: Date.now },
    // Tracks which slots were proposed to the patient for the next booking validation
    pendingBookingContext: {
      date: { type: String },
      durationMin: { type: Number },
      treatment: { type: String },
      proposedSlots: [{ startTime: String, endTime: String }],
      proposedAt: { type: Date },
      expiresAt: { type: Date },
      version: { type: Number },
      mode: { type: String },
      targetAppointmentId: { type: String },
      targetPatientId: { type: String },
      targetPatientInfo: {
        firstName: { type: String },
        lastName: { type: String },
      }
    },
    // Temporarily holds booking intent while asking for patient name (Phase 6.16/6.17)
    // Extended in Phase 6.17.1: targetPatientInfo + awaitingTargetConfirmation for family bookings
    pendingBookingIntent: {
      date: { type: String },
      startTime: { type: String },
      durationMin: { type: Number },
      treatment: { type: String },
      awaitingIdentity: { type: Boolean },
      targetPatientInfo: {
        firstName: { type: String },
        lastName: { type: String },
      },
      awaitingTargetConfirmation: { type: Boolean },
      awaitingTargetIdentity: { type: Boolean },
    },
    // Flagged when the AI requests a human takeover (see interface comment)
    needsHuman: { type: Boolean, default: false },
    pendingActionConfirmation: {
      type: { type: String, enum: ["cancel_appointment", "confirm_appointment_status", "reschedule_appointment"] },
      appointmentId: { type: String },
      appointmentSummary: { type: String },
      actionData: { type: Schema.Types.Mixed },
    },
  },
  { timestamps: true }
);

// Prevent duplicate conversations for the same tenant and contact
ConversationSchema.index({ tenantId: 1, contactWaId: 1 }, { unique: true });
ConversationSchema.index({ tenantId: 1, lastMessageAt: -1 });
ConversationSchema.index({ tenantId: 1, patientId: 1 });

export const Conversation = mongoose.model<IConversation>("Conversation", ConversationSchema);


export interface IMessage extends Document {
  tenantId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  patientId?: mongoose.Types.ObjectId;
  direction: "inbound" | "outbound";
  status: "sent" | "delivered" | "read" | "failed" | "received";
  content: string;
  providerMessageId: string; // wamid
  quotedProviderMessageId?: string; // If the user replied to a specific message, the wamid of that message
  appointmentId?: mongoose.Types.ObjectId; // For outbound reminders, the ID of the appointment being reminded
  idempotencyKey?: string; // Ensures an AI reply is never sent twice for the same inbound message
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: false },
    direction: { type: String, enum: ["inbound", "outbound"], required: true },
    status: { 
      type: String, 
      enum: ["sent", "delivered", "read", "failed", "received"], 
      required: true 
    },
    content: { type: String, required: true },
    providerMessageId: { type: String, required: true },
    quotedProviderMessageId: { type: String, required: false },
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", required: false },
    idempotencyKey: { type: String, required: false },
    error: { type: String },
  },
  { timestamps: true }
);

// Idempotency constraint: A specific providerMessageId can only exist once across the system
// This protects against race conditions when Meta sends the same webhook payload multiple times.
MessageSchema.index({ providerMessageId: 1 }, { unique: true });
MessageSchema.index({ tenantId: 1, conversationId: 1 });
MessageSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

export const Message = mongoose.model<IMessage>("Message", MessageSchema);
