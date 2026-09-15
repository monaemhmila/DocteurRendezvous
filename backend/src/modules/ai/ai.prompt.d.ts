/**
 * AI Module — System Prompt
 *
 * Centralized system prompt for the dental assistant AI.
 * This is the single source of truth for the AI's role, capabilities,
 * and strict restrictions.
 *
 * VERSION: 1.4.0
 *
 * IMPORTANT: This prompt defines a communication assistant role ONLY.
 * The AI must NEVER act as a medical professional.
 */
export interface IAIContext {
    firstName?: string;
    lastName?: string;
    language?: string;
    appointment?: {
        id: string;
        date: string;
        startTime: string;
        endTime: string;
        treatment: string;
        status: string;
    };
    recovery?: {
        id: string;
        type: string;
        status: string;
    };
    followUp?: {
        type: string;
        status: string;
        scheduledFor?: Date;
    };
    pendingBookingContext?: {
        date: string;
        proposedSlots: Array<{
            startTime: string;
            endTime: string;
        }>;
    };
}
/**
 * Build the system prompt, incorporating patient and business context.
 * Context is strictly limited to non-clinical, non-sensitive fields.
 */
export declare function buildSystemPrompt(context?: IAIContext): string;
//# sourceMappingURL=ai.prompt.d.ts.map