import mongoose, { Document } from "mongoose";
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
export declare const Tenant: mongoose.Model<ITenant, {}, {}, {}, Document<unknown, {}, ITenant, {}, mongoose.DefaultSchemaOptions> & ITenant & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ITenant>;
//# sourceMappingURL=tenant.model.d.ts.map