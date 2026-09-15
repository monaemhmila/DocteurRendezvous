import mongoose, { Document } from "mongoose";
export interface IFollowUpTask extends Document {
    tenantId: string;
    patientId: mongoose.Types.ObjectId;
    recoveryId?: mongoose.Types.ObjectId;
    waitlistEntryId?: mongoose.Types.ObjectId;
    sourceAppointmentId?: mongoose.Types.ObjectId;
    type: string;
    status: string;
    priority: string;
    scheduledFor: Date;
    completedAt?: Date;
    attemptCount: number;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const FollowUpTask: mongoose.Model<IFollowUpTask, {}, {}, {}, Document<unknown, {}, IFollowUpTask, {}, mongoose.DefaultSchemaOptions> & IFollowUpTask & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IFollowUpTask>;
export interface IFollowUpAttempt extends Document {
    tenantId: string;
    recoveryId?: mongoose.Types.ObjectId;
    waitlistEntryId?: mongoose.Types.ObjectId;
    taskId?: mongoose.Types.ObjectId;
    attemptNumber: number;
    channel: string;
    outcome: string;
    notes?: string;
    performedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const FollowUpAttempt: mongoose.Model<IFollowUpAttempt, {}, {}, {}, Document<unknown, {}, IFollowUpAttempt, {}, mongoose.DefaultSchemaOptions> & IFollowUpAttempt & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IFollowUpAttempt>;
//# sourceMappingURL=followup.model.d.ts.map