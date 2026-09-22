import mongoose, { Document } from "mongoose";
export interface IUserPermissions {
    appointments: boolean;
    patients: boolean;
    conversations: boolean;
    aiConfig: boolean;
    analytics: boolean;
    settings: boolean;
}
export interface IUser extends Document {
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
export declare const User: mongoose.Model<IUser, {}, {}, {}, Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUser>;
//# sourceMappingURL=user.model.d.ts.map