import mongoose from "mongoose";
export declare const waitlistService: {
    createEntry(data: any, tenantId: string): Promise<mongoose.Document<unknown, {}, import("./waitlist.model").IWaitlistEntry, {}, mongoose.DefaultSchemaOptions> & import("./waitlist.model").IWaitlistEntry & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    listEntries(tenantId: string): Promise<(mongoose.Document<unknown, {}, import("./waitlist.model").IWaitlistEntry, {}, mongoose.DefaultSchemaOptions> & import("./waitlist.model").IWaitlistEntry & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    cancelEntry(entryId: string, tenantId: string): Promise<mongoose.Document<unknown, {}, import("./waitlist.model").IWaitlistEntry, {}, mongoose.DefaultSchemaOptions> & import("./waitlist.model").IWaitlistEntry & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    findCandidatesAndOfferSlot(tenantId: string, sourceAppointment: any): Promise<(mongoose.Document<unknown, {}, import("../followups/followup.model").IFollowUpTask, {}, mongoose.DefaultSchemaOptions> & import("../followups/followup.model").IFollowUpTask & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    fulfillWaitlistEntry(waitlistEntryId: string, tenantId: string, doctorId: string, date: string, startTime: string, endTime: string, taskId: string): Promise<mongoose.Document<unknown, {}, import("../appointments/appointment.model").IAppointment, {}, mongoose.DefaultSchemaOptions> & import("../appointments/appointment.model").IAppointment & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
};
//# sourceMappingURL=waitlist.service.d.ts.map