import mongoose, { Document, Schema } from "mongoose";

/**
 * Stores the slots that were actually proposed to the patient in a previous
 * AI response. Used by the auto-booking flow to verify the patient's confirmed
 * slot matches a slot that was genuinely offered — not recalculated on-the-fly.
 */
export interface IPendingBookingContext {
  date: string;                                            // YYYY-MM-DD
  durationMin: number;                                     // duration used when generating slots
  proposedSlots: Array<{ startTime: string; endTime: string }>; // slots sent to the patient
  proposedAt: Date;                                        // when the proposal was sent
}

export interface IConversation extends Document {
  tenantId: mongoose.Types.ObjectId;
  patientId?: mongoose.Types.ObjectId;
  channel: "whatsapp"; // Locked to whatsapp per requirements
  contactWaId: string; // The external WhatsApp ID (phone number with country code from Meta)
  status: "active" | "archived";
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
    status: { type: String, enum: ["active", "archived"], default: "active" },
    lastMessageAt: { type: Date, default: Date.now },
    // Tracks which slots were proposed to the patient for the next booking validation
    pendingBookingContext: {
      date: { type: String },
      durationMin: { type: Number },
      proposedSlots: [{ startTime: String, endTime: String }],
      proposedAt: { type: Date },
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
    },
    // Flagged when the AI requests a human takeover (see interface comment)
    needsHuman: { type: Boolean, default: false },
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
    error: { type: String },
  },
  { timestamps: true }
);

// Idempotency constraint: A specific providerMessageId can only exist once across the system
// This protects against race conditions when Meta sends the same webhook payload multiple times.
MessageSchema.index({ providerMessageId: 1 }, { unique: true });
MessageSchema.index({ tenantId: 1, conversationId: 1 });

export const Message = mongoose.model<IMessage>("Message", MessageSchema);
