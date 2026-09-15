/**
 * AI Module — Auto-Booking Service
 *
 * Orchestrates the full automatic booking flow triggered by an inbound patient message:
 *
 *   1. Call AIService.getSuggestion() [read-only, no DB writes]
 *   2a. If the AI proposes slots (appointment_availability pass):
 *       → Persist proposed slots in conversation.pendingBookingContext
 *   2b. If the AI detects a book_appointment action:
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
 *
 * STRICT GUARANTEES:
 *   - Never sends WhatsApp before createAppointment succeeds
 *   - Never generates a confirmation from AI text — always from the real Appointment record
 *   - Never exposes WhatsApp credentials to AI
 *   - Errors are isolated: failure never propagates to the webhook response
 *   - AI cannot directly call executeAIAction — this service is the only orchestrator
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
export declare class AIAutoBookingService {
    private aiService;
    private messagingProvider;
    constructor(aiService?: AIService, messagingProvider?: IMessagingProvider);
    /**
     * Process an inbound message for the auto-booking flow.
     *
     * Called by communicationService.handleWebhook() after persisting the message.
     * All errors are caught internally — failure never propagates to the webhook.
     *
     * @param tenantId   - Resolved from phoneNumberId in webhook (never from payload body)
     * @param conversationId - The conversation the inbound message belongs to
     */
    processInboundMessage(tenantId: string, conversationId: string): Promise<void>;
}
export declare const aiAutoBookingService: AIAutoBookingService;
//# sourceMappingURL=ai.auto-booking.service.d.ts.map