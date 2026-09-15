import mongoose, { Document } from "mongoose";
export interface IPatient extends Document {
    tenantId: mongoose.Types.ObjectId;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    language?: string;
    status: "active" | "inactive" | "lead" | "at_risk";
    tags: string[];
    dateOfBirth?: Date;
    gender?: string;
    notes?: string;
    nextAppointmentAt?: Date;
    metrics: {
        totalVisits: number;
        noShowCount: number;
        lastVisit?: Date;
        revenue: number;
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare const Patient: mongoose.Model<IPatient, {}, {}, {}, Document<unknown, {}, IPatient, {}, mongoose.DefaultSchemaOptions> & IPatient & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IPatient>;
//# sourceMappingURL=patient.model.d.ts.map