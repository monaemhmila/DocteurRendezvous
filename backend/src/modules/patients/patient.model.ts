import mongoose, { Document, Schema } from "mongoose";

export interface IPatient extends Document {
  tenantId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  language?: string;
  status: "active" | "inactive" | "lead" | "at_risk";
  tags: string[];
  dateOfBirth?: Date;
  gender?: string;
  notes?: string;
  nextAppointmentAt?: Date;
  metrics: {
    totalVisits: number;
    noShowCount: number;
    lastVisit?: Date;
    revenue: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema = new Schema<IPatient>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true, index: true },
    email: { type: String, index: true },
    language: { type: String, default: "fr" },
    status: {
      type: String,
      enum: ["active", "inactive", "lead", "at_risk"],
      default: "active",
    },
    tags: [{ type: String }],
    dateOfBirth: { type: Date },
    gender: { type: String },
    notes: { type: String },
    nextAppointmentAt: { type: Date },
    metrics: {
      totalVisits: { type: Number, default: 0 },
      noShowCount: { type: Number, default: 0 },
      lastVisit: { type: Date },
      revenue: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);
export const Patient = mongoose.model<IPatient>("Patient", PatientSchema);
