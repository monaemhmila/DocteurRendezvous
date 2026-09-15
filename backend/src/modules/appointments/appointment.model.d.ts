import mongoose, { Document } from "mongoose";
export interface IAppointment extends Document {
    tenantId: mongoose.Types.ObjectId;
    patientId: mongoose.Types.ObjectId;
    doctorId: string;
    date: string;
    startTime: string;
    endTime: string;
    durationMin: number;
    treatment: string;
    notes?: string;
    cancellationReason?: string;
    source?: string;
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