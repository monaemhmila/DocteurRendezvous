import type { Appointment, Conversation, Doctor, FollowUpCampaign, NoShowRecord, Notification, OpenSlot, Patient, RecoveryReason, WaitlistEntry } from "@/types";
export declare function isoDay(offset?: number): string;
export declare const TODAY: string;
export declare const clinic: {
    name: string;
    address: string;
    phone: string;
    email: string;
    currency: string;
    hours: {
        day: string;
        open: string;
        close: string;
    }[];
};
export declare const currentUser: {
    name: string;
    firstName: string;
    role: string;
    initials: string;
};
export declare const doctors: Doctor[];
export declare const treatments: {
    name: string;
    duration: number;
    price: number;
}[];
export declare const patients: Patient[];
export declare function suggestedActionFor(reason: RecoveryReason): string;
export declare const patientById: (id: string) => any;
export declare const fullName: (p: Patient) => string;
export declare const initials: (p: Patient) => string;
export declare const shortName: (p: Patient) => string;
export declare const doctorById: (id: string) => any;
export declare const appointments: Appointment[];
export declare const conversations: Conversation[];
export declare const openSlots: OpenSlot[];
export declare const waitlist: WaitlistEntry[];
export declare const campaigns: FollowUpCampaign[];
export declare const noShows: NoShowRecord[];
export declare const cancellations: Appointment[];
export declare const notificationsSeed: Notification[];
export declare const recoveryFunnel: {
    stage: string;
    value: number;
}[];
export declare const recoverySummary: {
    analyzed: number;
    toRecover: number;
    contacted: number;
    replied: number;
    booked: number;
    completed: number;
};
export declare const appointmentsOverTime: {
    month: string;
    total: number;
    recovered: number;
}[];
export declare const reactivationOverTime: {
    month: string;
    patients: number;
}[];
export declare const lossBreakdown: {
    label: string;
    value: number;
}[];
export declare const revenueTimeline: ({
    date: string;
    label: string;
    amount: number;
    type: "recovered";
} | {
    date: string;
    label: string;
    amount: number;
    type: "potential";
})[];
export declare const teamMembers: {
    id: string;
    name: string;
    role: string;
    email: string;
    initials: string;
    active: boolean;
}[];
export declare const integrations: ({
    id: string;
    name: string;
    detail: string;
    status: "connected";
} | {
    id: string;
    name: string;
    detail: string;
    status: "not_connected";
} | {
    id: string;
    name: string;
    detail: string;
    status: "coming_soon";
})[];
//# sourceMappingURL=mock.d.ts.map