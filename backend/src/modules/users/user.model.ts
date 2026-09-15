import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  tenantId?: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: "super_admin" | "clinic_owner" | "receptionist" | "dentist";
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
    role: {
      type: String,
      enum: ["super_admin", "clinic_owner", "receptionist", "dentist"],
      default: "receptionist",
    },
  },
  { timestamps: true }
);

// The email field already has `unique: true`, which automatically creates the index.

export const User = mongoose.model<IUser>("User", UserSchema);
