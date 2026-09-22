import mongoose, { Document, Schema } from "mongoose";

export interface IUserPermissions {
  appointments: boolean;
  patients: boolean;
  conversations: boolean;
  aiConfig: boolean;
  analytics: boolean;
  settings: boolean;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId?: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  specialty?: string;
  status: "active" | "inactive";
  role: "super_admin" | "clinic_owner" | "receptionist" | "dentist" | "assistant";
  permissions?: IUserPermissions;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: false, index: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String },
    specialty: { type: String },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    role: {
      type: String,
      enum: ["super_admin", "clinic_owner", "receptionist", "dentist", "assistant"],
      default: "receptionist",
    },
    permissions: {
      type: Schema.Types.Mixed,
      default: {
        appointments: true,
        patients: true,
        conversations: true,
        aiConfig: false,
        analytics: false,
        settings: false,
      },
    },
  },
  { timestamps: true }
);

// The email field already has `unique: true`, which automatically creates the index.

export const User = mongoose.model<IUser>("User", UserSchema);
