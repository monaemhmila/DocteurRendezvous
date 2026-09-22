/**
 * AI Module — Auto-Booking & AI Conversation Service
 *
 * Orchestrates the full automatic WhatsApp interaction triggered by an inbound
 * patient message:
 *
 *   1. Load conversation (tenant-scoped). If a human already took over
 *      (conversation.needsHuman) → suspend all AI processing.
 *   2. Call AIService.getSuggestion() [read-only, no DB writes]
 *   2b. If the AI requests a human takeover (needsHumanEscalation):
 *       → Send the AI's handoff reply
 *       → Flag the conversation needsHuman = true
 *       → NO backend action is executed (booking included)
 *   3a. If the AI proposes slots (appointment_availability pass):
 *       → Persist proposed slots in conversation.pendingBookingContext
 *   3b. If the AI detects a book_appointment action:
 *       → Validate confirmed slot is in pendingBookingContext (slot was genuinely proposed)
 *       → Call executeAIAction() with all validations:
 *           - tenant isolation
 *           - patient from conversation
 *           - treatment must be provided (never invented)
 *           - revalidation of availability via availabilityService
 *           - double-booking check via appointmentService.createAppointment
 *           - deterministic doctor resolution (clinic_owner → dentist → refusal)
 *       → On success: generate confirmation from REAL appointment data (never from AI reply)
 *       → Send confirmation WhatsApp
 *       → Persist outbound Message
 *       → Clear pendingBookingContext
 *       The booking branch owns its own messaging — the generic AI reply is NOT
 *       sent in that branch (avoid duplicates / false confirmations on failure).
 *   4. Otherwise (conversational intent, e.g. general_question, availability
 *      proposal, recovery/follow-up response, escalation):
 *       → Send the AI's natural reply via WhatsApp
 *       → Persist the outbound Message (deterministic id, idempotent)
 *
 * STRICT GUARANTEES (Phase 6.9 + 6.10):
 *   - Never sends WhatsApp before createAppointment succeeds
 *   - Never generates a confirmation from AI text — always from the real Appointment record
 *   - Never exposes WhatsApp credentials to AI
 *   - Errors are isolated: failure never propagates to the webhook response
 *   - AI cannot directly call executeAIAction — this service is the only orchestrator
 *   - AI replies are sent ONLY from structured responses (never raw JSON fallback)
 *   - AI replies are idempotent: providerMessageId = `ai-reply-<inbound wamid>`
 *   - While conversation.needsHuman is true, AI never replies nor books
 *   - Injectable provider/aiService for testability
 */
import { AIService } from "./ai.service";
import { IMessagingProvider } from "../communications/providers/messaging.provider";
export declare function buildBookingConfirmationMessage(appointment: {
    date: string;
    startTime: string;
    endTime: string;
    treatment: string;
}, patientFirstName: string, language?: string): string;
export declare function buildRescheduleConfirmationMessage(appointment: {
    date: string;
    startTime: string;
    endTime: string;
    treatment: string;
}, patientFirstName: string, language?: string): string;
export declare class AIAutoBookingService {
    private aiService;
    private messagingProvider;
    constructor(aiService?: AIService, messagingProvider?: IMessagingProvider);
    /**
     * Process an inbound message for the full AI conversation flow.
     *
     * Called by communicationService.handleWebhook() after persisting the message.
     * All errors are caught internally — failure never propagates to the webhook.
     */
    processInboundMessage(tenantId: string, conversationId: string, inboundWaId?: string): Promise<void>;
    private handleBookingProposal;
    private handleRescheduleProposal;
    /**
     * Send the AI's natural reply to the patient via WhatsApp and persist the
     * outbound Message. Idempotent: the Message.providerMessageId is built from
     * the inbound wamid (`ai-reply-<wamid>`), so a retry never sends a duplicate.
     *
     * Only structured replies (valid JSON parsed by AIService) are sent. Raw
     * fallback text is never auto-sent to a patient.
     */
    private sendConversationalReply;
    /**
     * Handle confirmation of an existing upcoming appointment when the patient confirms.
     */
    private handleConfirmAppointmentProposal;
}
export declare const aiAutoBookingService: AIAutoBookingService;
//# sourceMappingURL=ai.auto-booking.service.d.ts.map