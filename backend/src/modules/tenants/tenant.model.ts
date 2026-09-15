import mongoose, { Document, Schema } from "mongoose";

export interface ITenant extends Document {
  name: string;
  settings: {
    whatsappConfig?: {
      phoneNumberId?: string;
      accessToken?: string;
    };
    businessHours?: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true },
    settings: {
      whatsappConfig: {
        phoneNumberId: String,
        accessToken: String,
      },
      businessHours: Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

export const Tenant = mongoose.model<ITenant>("Tenant", TenantSchema);
