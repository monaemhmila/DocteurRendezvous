import mongoose, { Document } from "mongoose";
export interface IRecovery extends Document {
    tenantId: string;
    patientId: mongoose.Types.ObjectId;
    appointmentId?: mongoose.Types.ObjectId;
    sourceAppointmentId?: mongoose.Types.ObjectId;
    recoveryAppointmentId?: mongoose.Types.ObjectId;
    type: string;
    status: string;
    priority: string;
    reason?: string;
    detectedAt: Date;
    lastContactedAt?: Date;
    nextActionAt?: Date;
    estimatedValue: number;
    bookedValue: number;
    recoveredValue: number;
    notes?: string;
}
export declare const Recovery: mongoose.Model<IRecovery, {}, {}, {}, Document<unknown, {}, IRecovery, {}, mongoose.DefaultSchemaOptions> & IRecovery & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IRecovery>;
//# sourceMappingURL=recovery.model.d.ts.map