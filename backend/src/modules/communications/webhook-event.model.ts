import mongoose, { Document, Schema } from "mongoose";

export interface IWebhookEvent extends Document {
  provider: string;
  phoneNumberId: string;
  eventType: string;
  providerMessageId: string;
  tenantId?: mongoose.Types.ObjectId;
  payloadHash?: string;
  status: "received" | "processing" | "processed" | "failed";
  attempts: number;
  nextAttemptAt?: Date;
  lockedAt?: Date;
  lockedBy?: string;
  processedAt?: Date;
  lastError?: string;
  payload: any;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    provider: { type: String, required: true },
    phoneNumberId: { type: String, required: true },
    eventType: { type: String, required: true, default: "message" },
    providerMessageId: { type: String, required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    payloadHash: { type: String },
    status: {
      type: String,
      enum: ["received", "processing", "processed", "failed"],
      default: "received",
      required: true,
    },
    attempts: { type: Number, default: 0, required: true },
    nextAttemptAt: { type: Date },
    lockedAt: { type: Date },
    lockedBy: { type: String },
    processedAt: { type: Date },
    lastError: { type: String },
    payload: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Unique index for idempotency
WebhookEventSchema.index({ provider: 1, phoneNumberId: 1, eventType: 1, providerMessageId: 1 }, { unique: true });

// Index for queue polling
WebhookEventSchema.index({ status: 1, nextAttemptAt: 1, lockedAt: 1 });

export const WebhookEvent = (mongoose.models.WebhookEvent as mongoose.Model<IWebhookEvent>) || mongoose.model<IWebhookEvent>("WebhookEvent", WebhookEventSchema);
