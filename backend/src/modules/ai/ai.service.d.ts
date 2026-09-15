/**
 * AI Module — AI Service
 *
 * Orchestrates the suggestion generation flow:
 *   1. Validate tenantId comes from req.user (never from body/query/params)
 *   2. Load conversation by conversationId; verify tenant ownership
 *   3. Load last 20 messages (sorted ascending for chronological context)
 *   4. Load patient (only safe, non-clinical fields) if linked to conversation
 *   5. Load relevant business context (appointment, recovery, follow-up)
 *   6. Build the system prompt and conversation context
 *   7. Call the AI provider
 *   8. Parse the structured JSON response
 *   9. Return { suggestion, action }
 *
 * STRICT GUARANTEES:
 *   - Never writes to Message, Conversation, or any other model
 *   - Never calls MetaWhatsAppProvider.sendMessage()
 *   - Never accepts tenantId from any external input (body, query, params)
 *   - Enforces tenant isolation before loading any data
 *   - confidence is returned as-is; it is NEVER used as authorization
 */
import { IAIProvider } from "./ai.provider.interface";
export interface AIActionProposal {
    type: string;
    targetId: string;
    reason: string;
    confidence: number;
}
export interface AISuggestionResult {
    suggestion: string;
    intent?: string;
    scheduling?: {
        date?: string;
        timePreference?: string;
        durationMin?: number;
    };
    /**
     * Slots returned by the availability service during Two-Pass.
     * Populated ONLY when the AI triggered an appointment_availability pass
     * and slots were successfully fetched from the backend.
     * The auto-booking service uses this to set pendingBookingContext on the Conversation.
     * getSuggestion() itself never writes to DB — it only returns this value.
     */
    proposedSlots?: Array<{
        startTime: string;
        endTime: string;
    }>;
    action: AIActionProposal | null;
}
export declare class AIService {
    private provider;
    constructor(provider: IAIProvider);
    /**
     * Generate an AI suggestion for a given conversation.
     *
     * @param tenantId - MUST come from req.user.tenantId — never from request body/query
     * @param conversationId - The conversation to generate a suggestion for
     * @returns A plain-text suggestion string
     */
    getSuggestion(tenantId: string, conversationId: string): Promise<AISuggestionResult>;
}
//# sourceMappingURL=ai.service.d.ts.map