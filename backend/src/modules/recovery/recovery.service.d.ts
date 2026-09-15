import { IRecovery } from "./recovery.model";
export declare const recoveryService: {
    createOpportunity: (data: Partial<IRecovery>, tenantId: string) => Promise<Omit<import("mongoose").Document<unknown, {}, Omit<IRecovery, never> | Pick<IRecovery, never>, {}, import("mongoose").DefaultSchemaOptions> & ((((Omit<IRecovery, never> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>) | (Pick<IRecovery, never> & Required<{
        _id: unknown;
    }>)) & {
        __v: number;
    }) & {
        id: string;
    }), "_id">>;
    getOpportunities: (tenantId: string, patientId?: string) => Promise<(import("mongoose").Document<unknown, {}, IRecovery, {}, import("mongoose").DefaultSchemaOptions> & IRecovery & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    getOpportunityById: (id: string, tenantId: string) => Promise<(import("mongoose").Document<unknown, {}, IRecovery, {}, import("mongoose").DefaultSchemaOptions> & IRecovery & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    updateOpportunity: (id: string, data: Partial<IRecovery>, tenantId: string) => Promise<(import("mongoose").Document<unknown, {}, IRecovery, {}, import("mongoose").DefaultSchemaOptions> & IRecovery & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    dismissOpportunity: (id: string, tenantId: string) => Promise<import("mongoose").Document<unknown, {}, IRecovery, {}, import("mongoose").DefaultSchemaOptions> & IRecovery & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    markContacted: (id: string, tenantId: string) => Promise<import("mongoose").Document<unknown, {}, IRecovery, {}, import("mongoose").DefaultSchemaOptions> & IRecovery & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    markResponded: (id: string, tenantId: string) => Promise<import("mongoose").Document<unknown, {}, IRecovery, {}, import("mongoose").DefaultSchemaOptions> & IRecovery & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    markBooked: (id: string, recoveryAppointmentId: string, bookedValue: number, tenantId: string) => Promise<import("mongoose").Document<unknown, {}, IRecovery, {}, import("mongoose").DefaultSchemaOptions> & IRecovery & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    markVisited: (id: string, recoveredValue: number, tenantId: string) => Promise<import("mongoose").Document<unknown, {}, IRecovery, {}, import("mongoose").DefaultSchemaOptions> & IRecovery & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    detectRecoveryOpportunities: (tenantId: string) => Promise<{
        success: boolean;
        createdCount: number;
    }>;
    getStats: (tenantId: string) => Promise<{
        analyzed: number;
        toRecover: number;
        contacted: number;
        replied: number;
        booked: number;
        completed: number;
        financials: {
            estimatedValue: number;
            bookedValue: number;
            recoveredValue: number;
        };
    }>;
};
//# sourceMappingURL=recovery.service.d.ts.map