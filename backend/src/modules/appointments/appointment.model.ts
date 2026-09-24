import mongoose, { Document, Schema } from "mongoose";

export function computeOccupiedSlots(startTime: string, endTime: string, stepMins = 5): string[] {
  if (!startTime || !endTime) throw new Error("startTime and endTime are required");
  
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    throw new Error("Invalid time format, must be HH:MM");
  }

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  
  const startTotal = startH! * 60 + startM!;
  const endTotal = endH! * 60 + endM!;

  if (endTotal <= startTotal) {
    throw new Error("endTime must be after startTime");
  }

  const slots: string[] = [];
  for (let m = startTotal; m < endTotal; m += stepMins) {
    const h = Math.floor(m / 60).toString().padStart(2, "0");
    const min = (m % 60).toString().padStart(2, "0");
    slots.push(`${h}:${min}`);
  }
  return slots;
}

export interface IAppointment extends Document {
  tenantId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: string; // The dentist who owns this tenant
  date: string; // ISO Date YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationMin: number;
  occupiedSlots: string[]; // Atomic 5-min slice tokens for database-level overlap prevention
  treatment: string;
  notes?: string;
  cancellationReason?: string;
  source?: string;
  reminderSentAt?: Date;
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
    occupiedSlots: { type: [String], required: true, default: [] },
    treatment: { type: String, required: true },
    notes: { type: String },
    cancellationReason: { type: String },
    source: { type: String },
    reminderSentAt: { type: Date },
    status: {
      type: String,
      enum: ["scheduled", "confirmed", "completed", "cancelled", "no_show"],
      default: "scheduled",
    },
  },
  { timestamps: true }
);

// Automatically compute occupiedSlots before validate & save
AppointmentSchema.pre("validate", function () {
  if (this.startTime && this.endTime && (!this.occupiedSlots || this.occupiedSlots.length === 0)) {
    this.occupiedSlots = computeOccupiedSlots(this.startTime, this.endTime);
  }
});

AppointmentSchema.pre("save", function () {
  if (this.startTime && this.endTime && (this.isModified("startTime") || this.isModified("endTime") || !this.occupiedSlots || this.occupiedSlots.length === 0)) {
    this.occupiedSlots = computeOccupiedSlots(this.startTime, this.endTime);
  }
});

// DB Multikey Concurrency constraint: ensure NO overlapping slots exist for the same doctor/date
AppointmentSchema.index(
  { tenantId: 1, doctorId: 1, date: 1, occupiedSlots: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["scheduled", "confirmed"] } } }
);

export const Appointment = (mongoose.models.Appointment as mongoose.Model<IAppointment>) || mongoose.model<IAppointment>("Appointment", AppointmentSchema);

