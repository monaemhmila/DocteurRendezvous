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
        slots?: never;
    } | {
        error?: never;
        slots: {
            startTime: string;
            endTime: string;
        }[];
    }>;
};
//# sourceMappingURL=availability.service.d.ts.map