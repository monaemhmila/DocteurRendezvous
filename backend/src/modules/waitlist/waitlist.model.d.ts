import mongoose, { Document } from "mongoose";
export interface IWaitlistEntry extends Document {
    tenantId: string;
    patientId: mongoose.Types.ObjectId;
    treatment: string;
    priority: "high" | "medium" | "low";
    preferredDays: string[];
    preferredTimeRanges: string[];
    status: "active" | "fulfilled" | "cancelled" | "expired";
    notes?: string;
    fulfilledByAppointmentId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const WaitlistEntry: mongoose.Model<IWaitlistEntry, {}, {}, {}, Document<unknown, {}, IWaitlistEntry, {}, mongoose.DefaultSchemaOptions> & IWaitlistEntry & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IWaitlistEntry>;
//# sourceMappingURL=waitlist.model.d.ts.map