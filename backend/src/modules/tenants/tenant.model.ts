import mongoose, { Document, Schema } from "mongoose";

export interface ITenant extends Document {
  name: string;
  specialty?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  matriculeCnam?: string;
  matriculeCnss?: string;
  bank?: string;
  rib?: string;
  commercialRegister?: string;
  timezone?: string;
  currency?: string;
  status: "active" | "suspended" | "trial";
  suspensionReason?: string;
  plan?: "starter" | "pro" | "enterprise";
  settings: {
    whatsappConfig?: {
      phoneNumber?: string;
      phoneNumberId?: string;
      accessToken?: string;
      verifyToken?: string;
    };
    aiConfig?: any;
    services?: any;
    noShowPolicy?: {
      enabled: boolean;
      maxAllowed: number;
      rejectionMessage?: string;
    };
    doctorPhones?: string[];
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true },
    specialty: { type: String, default: "Générale" },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    taxId: { type: String },
    matriculeCnam: { type: String },
    matriculeCnss: { type: String },
    bank: { type: String },
    rib: { type: String },
    commercialRegister: { type: String },
    timezone: { type: String, default: "Africa/Tunis" },
    currency: { type: String, default: "TND" },
    status: {
      type: String,
      enum: ["active", "suspended", "trial"],
      default: "active",
    },
    suspensionReason: { type: String },
    plan: {
      type: String,
      enum: ["starter", "pro", "enterprise"],
      default: "pro",
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

export const Tenant = mongoose.model<ITenant>("Tenant", TenantSchema);
