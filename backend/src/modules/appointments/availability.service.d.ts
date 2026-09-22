export declare const availabilityService: {
    checkAvailability: (params: {
        tenantId: string;
        doctorId: string;
        date: string;
        startTime: string;
        endTime: string;
    }) => Promise<boolean>;
    getAvailableSlots: (params: {
        tenantId: string;
        date: string;
        durationMin: number;
        timePreference?: string;
    }) => Promise<{
        error: string;
        isPastDate?: never;
        slots?: never;
    } | {
        error?: never;
        slots: never[];
        isPastDate: boolean;
    } | {
        error?: never;
        isPastDate?: never;
        slots: {
            startTime: string;
            endTime: string;
        }[];
    }>;
};
//# sourceMappingURL=availability.service.d.ts.map