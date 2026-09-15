import mongoose, { Document, Schema } from "mongoose";

export interface IAppointment extends Document {
  tenantId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: string; // The dentist who owns this tenant
  date: string; // ISO Date YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationMin: number;
  treatment: string;
  notes?: string;
  cancellationReason?: string;
  source?: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    doctorId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    durationMin: { type: Number, required: true, default: 30 },
    treatment: { type: String, required: true },
    notes: { type: String },
    cancellationReason: { type: String },
    source: { type: String },
    status: {
      type: String,
      enum: ["scheduled", "confirmed", "completed", "cancelled", "no_show"],
      default: "scheduled",
    },
  },
  { timestamps: true }
);

// DB Concurrency constraint: ensure only ONE appointment exists for the same slot (tenant, doctor, date, time)
AppointmentSchema.index(
  { tenantId: 1, doctorId: 1, date: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["scheduled", "confirmed"] } } }
);
export const Appointment = mongoose.model<IAppointment>("Appointment", AppointmentSchema);
