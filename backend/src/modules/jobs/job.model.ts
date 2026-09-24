import mongoose, { Document, Schema } from "mongoose";

export interface IJob extends Document {
  type: string;
  tenantId: mongoose.Types.ObjectId;
  webhookEventId?: mongoose.Types.ObjectId;
  status: "pending" | "processing" | "completed" | "failed" | "dead_letter";
  attempts: number;
  maxAttempts: number;
  availableAt: Date;
  lockedAt?: Date;
  lockedBy?: string;
  lastError?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    type: { type: String, required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    webhookEventId: { type: Schema.Types.ObjectId, ref: "WebhookEvent" },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "dead_letter"],
      default: "pending",
      required: true,
    },
    attempts: { type: Number, default: 0, required: true },
    maxAttempts: { type: Number, default: 5, required: true },
    availableAt: { type: Date, default: Date.now, required: true },
    lockedAt: { type: Date },
    lockedBy: { type: String },
    lastError: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

JobSchema.index(
  { type: 1, webhookEventId: 1 },
  { unique: true, partialFilterExpression: { webhookEventId: { $exists: true } } }
);

JobSchema.index({ status: 1, availableAt: 1 });
JobSchema.index({ status: 1, lockedAt: 1 });
JobSchema.index({ tenantId: 1, createdAt: -1 });

export const Job = (mongoose.models.Job as mongoose.Model<IJob>) || mongoose.model<IJob>("Job", JobSchema);
