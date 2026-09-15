import { IAppointment } from "./appointment.model";
export declare const appointmentService: {
    getAppointments: (tenantId: string, patientId?: string) => Promise<(import("mongoose").Document<unknown, {}, IAppointment, {}, import("mongoose").DefaultSchemaOptions> & IAppointment & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    getAppointmentById: (id: string, tenantId: string) => Promise<(import("mongoose").Document<unknown, {}, IAppointment, {}, import("mongoose").DefaultSchemaOptions> & IAppointment & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    createAppointment: (data: Partial<IAppointment>, tenantId: string) => Promise<import("mongoose").Document<unknown, {}, IAppointment, {}, import("mongoose").DefaultSchemaOptions> & IAppointment & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    updateAppointment: (id: string, data: Partial<IAppointment>, tenantId: string) => Promise<(import("mongoose").Document<unknown, {}, IAppointment, {}, import("mongoose").DefaultSchemaOptions> & IAppointment & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    deleteAppointment: (id: string, tenantId: string) => Promise<(import("mongoose").Document<unknown, {}, IAppointment, {}, import("mongoose").DefaultSchemaOptions> & IAppointment & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    updateStatus: (id: string, status: string, tenantId: string) => Promise<(import("mongoose").Document<unknown, {}, IAppointment, {}, import("mongoose").DefaultSchemaOptions> & IAppointment & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
};
//# sourceMappingURL=appointment.service.d.ts.map