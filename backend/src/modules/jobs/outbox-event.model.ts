import mongoose, { Document, Schema } from "mongoose";

export interface IOutboxEvent extends Document {
  eventType: string; // e.g., "appointment.confirmed", "message.sent"
  aggregateType: string; // e.g., "appointment", "message"
  aggregateId: string;
  tenantId: mongoose.Types.ObjectId;
  phoneNumberId: string;
  idempotencyKey: string;
  payload: any; // Minimal payload needed to reconstruct the message
  status: "pending" | "processing" | "sent" | "retry" | "dead_letter";
  attempts: number;
  maxAttempts: number;
  availableAt: Date;
  lockedAt?: Date;
  lockedBy?: string;
  providerMessageId?: string;
  lastError?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OutboxEventSchema = new Schema<IOutboxEvent>(
  {
    eventType: { type: String, required: true },
    aggregateType: { type: String, required: true },
    aggregateId: { type: String, required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    phoneNumberId: { type: String, required: true },
    idempotencyKey: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "sent", "retry", "dead_letter"],
      default: "pending",
      required: true,
    },
    attempts: { type: Number, default: 0, required: true },
    maxAttempts: { type: Number, default: 5, required: true },
    availableAt: { type: Date, default: Date.now, required: true },
    lockedAt: { type: Date },
    lockedBy: { type: String },
    providerMessageId: { type: String },
    lastError: { type: String },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

OutboxEventSchema.index({ tenantId: 1, idempotencyKey: 1 }, { unique: true });
OutboxEventSchema.index({ status: 1, availableAt: 1 });
OutboxEventSchema.index({ status: 1, lockedAt: 1 });

export const OutboxEvent = (mongoose.models.OutboxEvent as mongoose.Model<IOutboxEvent>) || mongoose.model<IOutboxEvent>("OutboxEvent", OutboxEventSchema);
