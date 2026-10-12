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
  dentalChart?: {
    toothId: number;
    status: string;
    surfaces?: Record<string, string>;
    notes?: string;
    updatedAt: Date;
  }[];
  specialtyData?: Record<string, any>;
  files?: {
    id: string; // Legacy UI ID or safeDisplayName
    url?: string;
    storageKey?: string;
    title: string;
    type: string;
    size: number;
    uploadedAt: Date;
    checksum?: string;
    fileStatus?: string;
    isDicom?: boolean;
    studyInstanceUID?: string;
    seriesInstanceUID?: string;
    sopInstanceUID?: string;
    modality?: string;
    studyDate?: string;
    studyDescription?: string;
    seriesDescription?: string;
    instanceNumber?: number;
    frameCount?: number;
    pixelSpacing?: string;
    windowCenter?: string;
    windowWidth?: string;
    metadataStatus?: string;
    aiAnalysis?: Record<string, any>;
  }[];
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
    dentalChart: [
      {
        toothId: { type: Number, required: true },
        status: { type: String, required: true },
        surfaces: { type: Schema.Types.Mixed },
        notes: { type: String },
        updatedAt: { type: Date, default: Date.now },
      }
    ],
    specialtyData: { type: Schema.Types.Mixed, default: {} },
    files: [
      {
        id: { type: String, required: true },
        url: { type: String },
        storageKey: { type: String },
        title: { type: String, required: true },
        type: { type: String, required: true },
        size: { type: Number, required: true },
        uploadedAt: { type: Date, default: Date.now },
        checksum: { type: String },
        fileStatus: { type: String, default: "uploaded" },
        isDicom: { type: Boolean, default: false },
        studyInstanceUID: { type: String },
        seriesInstanceUID: { type: String },
        sopInstanceUID: { type: String },
        modality: { type: String },
        studyDate: { type: String },
        studyDescription: { type: String },
        seriesDescription: { type: String },
        instanceNumber: { type: Number },
        frameCount: { type: Number },
        pixelSpacing: { type: String },
        windowCenter: { type: String },
        windowWidth: { type: String },
        metadataStatus: { type: String, default: "unavailable" },
        aiAnalysis: { type: Schema.Types.Mixed }
      },
    ],
  },
  { timestamps: true }
);
export const Patient = mongoose.model<IPatient>("Patient", PatientSchema);
