import { IPatient } from "./patient.model";
export declare const patientService: {
    getPatients: (tenantId: string) => Promise<(import("mongoose").Document<unknown, {}, IPatient, {}, import("mongoose").DefaultSchemaOptions> & IPatient & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    getPatientById: (id: string, tenantId: string) => Promise<(import("mongoose").Document<unknown, {}, IPatient, {}, import("mongoose").DefaultSchemaOptions> & IPatient & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    createPatient: (data: Partial<IPatient>, tenantId: string) => Promise<import("mongoose").Document<unknown, {}, IPatient, {}, import("mongoose").DefaultSchemaOptions> & IPatient & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    updatePatient: (id: string, data: Partial<IPatient>, tenantId: string) => Promise<(import("mongoose").Document<unknown, {}, IPatient, {}, import("mongoose").DefaultSchemaOptions> & IPatient & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    deletePatient: (id: string, tenantId: string) => Promise<(import("mongoose").Document<unknown, {}, IPatient, {}, import("mongoose").DefaultSchemaOptions> & IPatient & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    searchPatients: (tenantId: string, query: string) => Promise<(import("mongoose").Document<unknown, {}, IPatient, {}, import("mongoose").DefaultSchemaOptions> & IPatient & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
};
//# sourceMappingURL=patient.service.d.ts.map