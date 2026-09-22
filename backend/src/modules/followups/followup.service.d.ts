import { IFollowUpTask, IFollowUpAttempt } from "./followup.model";
export declare const FOLLOWUP_CONFIG: {
    MAX_ATTEMPTS_DEFAULT: number;
    INACTIVE_MONTHS_DEFAULT: number;
    OVERDUE_CHECKUP_MONTHS_DEFAULT: number;
    RECOVERY_REDETECTION_COOLDOWN_DAYS: number;
};
export declare const followupService: {
    createTask: (data: Partial<IFollowUpTask>, tenantId: string) => Promise<Omit<import("mongoose").Document<unknown, {}, Omit<IFollowUpTask, never> | Pick<IFollowUpTask, never>, {}, import("mongoose").DefaultSchemaOptions> & ((((Omit<IFollowUpTask, never> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>) | (Pick<IFollowUpTask, never> & Required<{
        _id: unknown;
    }>)) & {
        __v: number;
    }) & {
        id: string;
    }), "_id">>;
    getTasks: (tenantId: string, filters?: {
        status?: string;
        priority?: string;
        type?: string;
    }) => Promise<(import("mongoose").Document<unknown, {}, IFollowUpTask, {}, import("mongoose").DefaultSchemaOptions> & IFollowUpTask & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    getTaskById: (id: string, tenantId: string) => Promise<(import("mongoose").Document<unknown, {}, IFollowUpTask, {}, import("mongoose").DefaultSchemaOptions> & IFollowUpTask & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    completeTask: (id: string, tenantId: string, notes?: string) => Promise<import("mongoose").Document<unknown, {}, IFollowUpTask, {}, import("mongoose").DefaultSchemaOptions> & IFollowUpTask & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    /**
     * Find and complete the active FollowUpTask associated with a given recoveryId.
     * Idempotent: if no active task exists, returns null without error.
     * Used internally when a Recovery is booked or visited so we reuse the existing
     * task rather than creating a new one.
     */
    completeTaskForRecovery: (recoveryId: string, tenantId: string, notes?: string) => Promise<IFollowUpTask | null>;
    logAttempt: (data: {
        recoveryId?: string;
        waitlistEntryId?: string;
        taskId?: string;
        channel?: string;
        outcome?: string;
        notes?: string;
    }, tenantId: string) => Promise<import("mongoose").Document<unknown, {}, IFollowUpAttempt, {}, import("mongoose").DefaultSchemaOptions> & IFollowUpAttempt & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    getAttemptsForRecovery: (recoveryId: string, tenantId: string) => Promise<(import("mongoose").Document<unknown, {}, IFollowUpAttempt, {}, import("mongoose").DefaultSchemaOptions> & IFollowUpAttempt & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    getAttemptsForWaitlistEntry: (waitlistEntryId: string, tenantId: string) => Promise<(import("mongoose").Document<unknown, {}, IFollowUpAttempt, {}, import("mongoose").DefaultSchemaOptions> & IFollowUpAttempt & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
};
//# sourceMappingURL=followup.service.d.ts.map