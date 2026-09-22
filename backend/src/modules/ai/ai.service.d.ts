/**
 * AI Module — AI Service
 *
 * Orchestrates the suggestion generation flow:
 *   1. Validate tenantId comes from req.user (never from body/query/params)
 *   2. Load conversation by conversationId; verify tenant ownership
 *   3. Load last 20 messages (sorted ascending for chronological context)
 *   4. Load patient (only safe, non-clinical fields) if linked to conversation
 *   5. Load relevant business context (appointment, recovery, follow-up, business hours)
 *   6. Build the system prompt and conversation context
 *   7. Call the AI provider
 *   8. Parse the structured JSON response
 *   9. Return { suggestion, action, intent, scheduling, proposedSlots, needsHumanEscalation, structured }
 *
 * Multi-turn conversation: the REAL messages persisted for this conversation are
 * loaded from MongoDB and forwarded to the provider (inbound → "user",
 * outbound → "assistant"). No parallel in-memory history is kept.
 *
 * STRICT GUARANTEES:
 *   - Never writes to Message, Conversation, or any other model
 *   - Never calls MetaWhatsAppProvider.sendMessage()
 *   - Never accepts tenantId from any external input (body, query, params)
 *   - Enforces tenant isolation before loading any data
 *   - confidence is returned as-is; it is NEVER used as authorization
 *   - WhatsApp access tokens / credentials are NEVER included in the prompt
 */
import { IAIProvider } from "./ai.provider.interface";
export interface AIActionProposal {
    type: string;
    targetId: string;
    reason: string;
    confidence: number;
    booking?: {
        date: string;
        startTime: string;
        durationMin: number;
        treatment: string;
    };
}
export interface AISuggestionResult {
    suggestion: string;
    intent?: string;
    patientInfo?: {
        firstName?: string;
        lastName?: string;
    };
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
    /**
     * True when the AI explicitly requested that a human take over the conversation.
     * When true the backend must NOT auto-execute any action.
     */
    needsHumanEscalation: boolean;
    /**
     * True only when the provider response was valid structured JSON and a clean
     * "reply" was extracted. Only structured replies may be auto-sent to a patient.
     */
    structured: boolean;
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