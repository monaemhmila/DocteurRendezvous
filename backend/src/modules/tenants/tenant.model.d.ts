import mongoose, { Document } from "mongoose";
export interface ITenant extends Document {
    name: string;
    specialty?: string;
    email?: string;
    phone?: string;
    address?: string;
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
        businessHours?: any;
        noShowPolicy?: {
            enabled: boolean;
            maxAllowed: number;
            rejectionMessage?: string;
        };
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare const Tenant: mongoose.Model<ITenant, {}, {}, {}, Document<unknown, {}, ITenant, {}, mongoose.DefaultSchemaOptions> & ITenant & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ITenant>;
//# sourceMappingURL=tenant.model.d.ts.map