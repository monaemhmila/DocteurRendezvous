import mongoose, { Schema, Document } from "mongoose";

export interface IFollowUpTask extends Document {
  tenantId: string;
  patientId: mongoose.Types.ObjectId;
  recoveryId?: mongoose.Types.ObjectId;
  waitlistEntryId?: mongoose.Types.ObjectId;
  sourceAppointmentId?: mongoose.Types.ObjectId;
  type: string;
  status: string;
  priority: string;
  scheduledFor: Date;
  completedAt?: Date;
  attemptCount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FollowUpTaskSchema = new Schema<IFollowUpTask>(
  {
    tenantId: { type: String, required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    recoveryId: { type: Schema.Types.ObjectId, ref: "Recovery", index: true },
    waitlistEntryId: { type: Schema.Types.ObjectId, ref: "WaitlistEntry", index: true },
    sourceAppointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", index: true },
    type: {
      type: String,
      enum: [
        "no_show_followup",
        "cancellation_followup",
        "inactive_reengagement",
        "checkup_reminder",
        "slot_fill_offer",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "cancelled", "expired"],
      default: "pending",
      index: true,
    },
    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    scheduledFor: { type: Date, default: Date.now, index: true },
    completedAt: { type: Date },
    attemptCount: { type: Number, default: 0 },
    notes: { type: String },
  },
  { timestamps: true }
);

FollowUpTaskSchema.pre("validate", function () {
  if (!this.recoveryId && !this.waitlistEntryId) {
    throw new Error("FollowUpTask must have either a recoveryId or a waitlistEntryId.");
  } else if (this.recoveryId && this.waitlistEntryId) {
    throw new Error("FollowUpTask cannot have both recoveryId and waitlistEntryId.");
  }
});

FollowUpTaskSchema.index({ tenantId: 1, status: 1, scheduledFor: 1 });
FollowUpTaskSchema.index({ tenantId: 1, recoveryId: 1 });
FollowUpTaskSchema.index({ tenantId: 1, waitlistEntryId: 1 });
FollowUpTaskSchema.index(
  { tenantId: 1, recoveryId: 1, type: 1 },
  { unique: true, partialFilterExpression: { recoveryId: { $type: "objectId" } } }
);

// DB Concurrency constraint: ensure only ONE active slot offer exists for a freed slot
FollowUpTaskSchema.index(
  { tenantId: 1, sourceAppointmentId: 1 },
  { 
    unique: true, 
    partialFilterExpression: { 
      status: { $in: ["pending", "in_progress"] }, 
      type: "slot_fill_offer",
      sourceAppointmentId: { $exists: true }
    } 
  }
);

export const FollowUpTask = (mongoose.models.FollowUpTask as mongoose.Model<IFollowUpTask>) || mongoose.model<IFollowUpTask>("FollowUpTask", FollowUpTaskSchema);

export interface IFollowUpAttempt extends Document {
  tenantId: string;
  recoveryId?: mongoose.Types.ObjectId;
  waitlistEntryId?: mongoose.Types.ObjectId;
  taskId?: mongoose.Types.ObjectId;
  attemptNumber: number;
  channel: string;
  outcome: string;
  notes?: string;
  performedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FollowUpAttemptSchema = new Schema<IFollowUpAttempt>(
  {
    tenantId: { type: String, required: true, index: true },
    recoveryId: { type: Schema.Types.ObjectId, ref: "Recovery", index: true },
    waitlistEntryId: { type: Schema.Types.ObjectId, ref: "WaitlistEntry", index: true },
    taskId: { type: Schema.Types.ObjectId, ref: "FollowUpTask" },
    attemptNumber: { type: Number, required: true },
    channel: {
      type: String,
      enum: ["phone", "whatsapp", "sms", "email", "in_person"],
      default: "phone",
    },
    outcome: {
      type: String,
      enum: ["no_answer", "left_voicemail", "spoken_agreed", "spoken_declined", "invalid_number"],
      default: "no_answer",
    },
    notes: { type: String },
    performedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

FollowUpAttemptSchema.pre("validate", function () {
  if (!this.recoveryId && !this.waitlistEntryId) {
    throw new Error("FollowUpAttempt must have either a recoveryId or a waitlistEntryId.");
  } else if (this.recoveryId && this.waitlistEntryId) {
    throw new Error("FollowUpAttempt cannot have both recoveryId and waitlistEntryId.");
  }
});

FollowUpAttemptSchema.index({ tenantId: 1, recoveryId: 1, attemptNumber: 1 });

export const FollowUpAttempt = (mongoose.models.FollowUpAttempt as mongoose.Model<IFollowUpAttempt>) || mongoose.model<IFollowUpAttempt>("FollowUpAttempt", FollowUpAttemptSchema);
