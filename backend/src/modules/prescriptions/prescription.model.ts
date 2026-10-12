import mongoose, { Document, Schema } from "mongoose";

export interface IPrescriptionItem {
  name: string;
  form: string;
  posology: string;
}

export interface IPrescription extends Document {
  tenantId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  /** Free text: diagnosis or reason */
  diagnosis?: string;
  /** Prescribing doctor display name (snapshot at creation) */
  doctorName?: string;
  /** Cabinet name (snapshot at creation) */
  cabinetName?: string;
  /** Cabinet specialty */
  specialty?: string;
  items: IPrescriptionItem[];
  /** Notes or special instructions at the bottom of the prescription */
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PrescriptionItemSchema = new Schema<IPrescriptionItem>(
  {
    name: { type: String, required: true, trim: true },
    form: { type: String, default: "", trim: true },
    posology: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const PrescriptionSchema = new Schema<IPrescription>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, required: true, index: true },
    diagnosis: { type: String, trim: true },
    doctorName: { type: String, trim: true },
    cabinetName: { type: String, trim: true },
    specialty: { type: String, trim: true },
    items: { type: [PrescriptionItemSchema], required: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Prescription = mongoose.model<IPrescription>(
  "Prescription",
  PrescriptionSchema
);
