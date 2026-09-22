import mongoose, { Schema, Document } from "mongoose";

export interface IWaitlistEntry extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  patientId: mongoose.Types.ObjectId;
  treatment: string;
  priority: "high" | "medium" | "low";
  preferredDays: string[];
  preferredTimeRanges: string[];
  status: "active" | "fulfilled" | "cancelled" | "expired";
  notes?: string;
  fulfilledByAppointmentId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WaitlistEntrySchema = new Schema<IWaitlistEntry>(
  {
    tenantId: { type: String, required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    treatment: { type: String, required: true },
    priority: { type: String, enum: ["high", "medium", "low"], default: "medium" },
    preferredDays: { type: [String], default: [] },
    preferredTimeRanges: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["active", "fulfilled", "cancelled", "expired"],
      default: "active",
      index: true,
    },
    notes: { type: String },
    fulfilledByAppointmentId: { type: Schema.Types.ObjectId, ref: "Appointment" },
  },
  { timestamps: true }
);

// Unique constraint: A patient can only have one active waitlist entry per treatment per tenant
WaitlistEntrySchema.index(
  { tenantId: 1, patientId: 1, treatment: 1 },
  { unique: true, partialFilterExpression: { status: "active" } }
);

export const WaitlistEntry = mongoose.model<IWaitlistEntry>("WaitlistEntry", WaitlistEntrySchema);
