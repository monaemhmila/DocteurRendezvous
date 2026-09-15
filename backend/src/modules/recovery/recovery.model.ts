import mongoose, { Schema, Document } from "mongoose";

export interface IRecovery extends Document {
  tenantId: string;
  patientId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  sourceAppointmentId?: mongoose.Types.ObjectId;
  recoveryAppointmentId?: mongoose.Types.ObjectId;
  type: string;
  status: string;
  priority: string;
  reason?: string;
  detectedAt: Date;
  lastContactedAt?: Date;
  nextActionAt?: Date;
  estimatedValue: number;
  bookedValue: number;
  recoveredValue: number;
  notes?: string;
}

const RecoverySchema = new Schema(
  {
    tenantId: { type: String, required: true },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment" },
    sourceAppointmentId: { type: Schema.Types.ObjectId, ref: "Appointment" },
    recoveryAppointmentId: { type: Schema.Types.ObjectId, ref: "Appointment" },
    type: {
      type: String,
      enum: [
        "inactive_patient",
        "interrupted_treatment",
        "pending_quote",
        "no_show",
        "cancellation",
        "overdue_checkup",
        "follow_up_required",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "identified",
        "queued",
        "contacted",
        "responded",
        "booked",
        "visited",
        "no_response",
        "dismissed",
      ],
      default: "identified",
    },
    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    reason: { type: String },
    detectedAt: { type: Date, default: Date.now },
    lastContactedAt: { type: Date },
    nextActionAt: { type: Date },
    estimatedValue: { type: Number, default: 0 },
    bookedValue: { type: Number, default: 0 },
    recoveredValue: { type: Number, default: 0 },
    notes: { type: String },
  },
  { timestamps: true }
);

RecoverySchema.index({ tenantId: 1, patientId: 1 });
RecoverySchema.index({ tenantId: 1, type: 1, status: 1 });
RecoverySchema.index({ tenantId: 1, status: 1, detectedAt: -1 });

// Database-level duplicate prevention:
// 1. Event-based recovery (no_show, cancellation): unique per (tenantId, patientId, type, sourceAppointmentId)
RecoverySchema.index(
  { tenantId: 1, patientId: 1, type: 1, sourceAppointmentId: 1 },
  { unique: true, partialFilterExpression: { sourceAppointmentId: { $exists: true } } }
);

// 2. Patient-level recovery (inactive_patient, overdue_checkup): unique per (tenantId, patientId, type) when status is ACTIVE
RecoverySchema.index(
  { tenantId: 1, patientId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      sourceAppointmentId: { $exists: false },
      status: { $in: ["identified", "queued", "contacted", "responded", "booked"] },
    },
  }
);

RecoverySchema.index({ tenantId: 1, recoveryAppointmentId: 1 });

// Index to support 30-day cooldown lookups for automatic detection types.
// Allows fast query: find most recent terminal Recovery of a given type for a patient.
RecoverySchema.index(
  { tenantId: 1, patientId: 1, type: 1, status: 1, updatedAt: -1 },
  {
    partialFilterExpression: {
      type: { $in: ["inactive_patient", "overdue_checkup"] },
      status: { $in: ["no_response", "dismissed", "visited"] },
    },
  }
);

export const Recovery = mongoose.model<IRecovery>("Recovery", RecoverySchema);
