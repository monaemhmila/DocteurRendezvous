import mongoose, { Document } from "mongoose";
export declare function computeOccupiedSlots(startTime: string, endTime: string, stepMins?: number): string[];
export interface IAppointment extends Document {
    tenantId: mongoose.Types.ObjectId;
    patientId: mongoose.Types.ObjectId;
    doctorId: string;
    date: string;
    startTime: string;
    endTime: string;
    durationMin: number;
    occupiedSlots: string[];
    treatment: string;
    notes?: string;
    cancellationReason?: string;
    source?: string;
    reminderSentAt?: Date;
    status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
    createdAt: Date;
    updatedAt: Date;
}
export declare const Appointment: mongoose.Model<IAppointment, {}, {}, {}, Document<unknown, {}, IAppointment, {}, mongoose.DefaultSchemaOptions> & IAppointment & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IAppointment>;
//# sourceMappingURL=appointment.model.d.ts.map