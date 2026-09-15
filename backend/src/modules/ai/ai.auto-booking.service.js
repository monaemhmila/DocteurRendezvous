"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiAutoBookingService = exports.AIAutoBookingService = void 0;
exports.buildBookingConfirmationMessage = buildBookingConfirmationMessage;
const mongoose_1 = __importDefault(require("mongoose"));
const communication_model_1 = require("../communications/communication.model");
const appointment_model_1 = require("../appointments/appointment.model");
const patient_model_1 = require("../patients/patient.model");
const tenant_model_1 = require("../tenants/tenant.model");
const ai_service_1 = require("./ai.service");
const openai_compatible_provider_1 = require("./openai-compatible.provider");
const ai_action_executor_1 = require("./ai.action.executor");
const messaging_provider_1 = require("../communications/providers/messaging.provider");
// ──────────────────────────────────────────────────────────────────────────────
// Confirmation message builder
// Generates the WhatsApp text from REAL appointment data — never from AI reply.
// ──────────────────────────────────────────────────────────────────────────────
function buildBookingConfirmationMessage(appointment, patientFirstName, language = "fr") {
    if (language === "en") {
        return `Hello ${patientFirstName}, your appointment has been confirmed: ${appointment.date} from ${appointment.startTime} to ${appointment.endTime} (${appointment.treatment}). See you soon!`;
    }
    // Default: French
    return `Bonjour ${patientFirstName}, votre rendez-vous a bien \u00e9t\u00e9 confirm\u00e9 : le ${appointment.date} de ${appointment.startTime} \u00e0 ${appointment.endTime} (${appointment.treatment}). \u00c0 bient\u00f4t au cabinet !`;
}
// ──────────────────────────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────────────────────────
class AIAutoBookingService {
    aiService;
    messagingProvider;
    constructor(aiService, messagingProvider) {
        this.aiService = aiService ?? new ai_service_1.AIService(new openai_compatible_provider_1.OpenAICompatibleProvider());
        this.messagingProvider = messagingProvider ?? new messaging_provider_1.MetaWhatsAppProvider();
    }
    /**
     * Process an inbound message for the auto-booking flow.
     *
     * Called by communicationService.handleWebhook() after persisting the message.
     * All errors are caught internally — failure never propagates to the webhook.
     *
     * @param tenantId   - Resolved from phoneNumberId in webhook (never from payload body)
     * @param conversationId - The conversation the inbound message belongs to
     */
    async processInboundMessage(tenantId, conversationId) {
        // ── Step 1: call getSuggestion [pure read — no DB writes] ──────────────────
        let result;
        try {
            result = await this.aiService.getSuggestion(tenantId, conversationId);
        }
        catch (err) {
            console.error("[AutoBooking] getSuggestion failed:", err.message);
            return;
        }
        // ── Step 2a: if AI proposed slots, persist pendingBookingContext ───────────
        // Triggered when intent = "appointment_availability" and Two-Pass returned
        // real slots from the availability service. This records what was genuinely
        // offered to the patient so we can verify later.
        if (result.intent === "appointment_availability" &&
            result.proposedSlots &&
            result.proposedSlots.length > 0 &&
            result.scheduling?.date &&
            result.scheduling?.durationMin) {
            try {
                await communication_model_1.Conversation.findByIdAndUpdate(conversationId, {
                    $set: {
                        pendingBookingContext: {
                            date: result.scheduling.date,
                            durationMin: result.scheduling.durationMin,
                            proposedSlots: result.proposedSlots,
                            proposedAt: new Date(),
                        },
                    },
                });
            }
            catch (err) {
                console.error("[AutoBooking] Failed to save pendingBookingContext:", err.message);
                // Non-fatal: booking context is advisory
            }
        }
        // ── Step 2b: if AI proposes book_appointment, validate and execute ─────────
        if (result.action?.type !== "book_appointment" || !result.action.booking) {
            return; // Normal suggestion or availability response — nothing to book
        }
        const booking = result.action.booking;
        // Load conversation to access pendingBookingContext and contactWaId
        const conversation = await communication_model_1.Conversation.findOne({
            _id: conversationId,
            tenantId: new mongoose_1.default.Types.ObjectId(tenantId),
        }).lean();
        if (!conversation) {
            console.warn("[AutoBooking] Conversation not found for booking.");
            return;
        }
        // ── CRITICAL: validate proposed slot context ───────────────────────────────
        // The backend must verify that the slot being confirmed was genuinely proposed
        // to the patient in a previous response — NOT recalculated to fake a prior offer.
        if (!conversation.pendingBookingContext) {
            console.warn("[AutoBooking] book_appointment received but no slot was ever proposed to this patient. Refusing.");
            return;
        }
        const ctx = conversation.pendingBookingContext;
        // Date must match the proposed context
        if (ctx.date !== booking.date) {
            console.warn(`[AutoBooking] Booking date '${booking.date}' does not match proposed context date '${ctx.date}'. Refusing.`);
            return;
        }
        // startTime must be one of the slots actually sent to the patient
        const slotWasProposed = ctx.proposedSlots.some((s) => s.startTime === booking.startTime);
        if (!slotWasProposed) {
            console.warn(`[AutoBooking] Slot '${booking.startTime}' was not in the proposed slots. Refusing.`);
            return;
        }
        // ── Execute booking via validated executor ─────────────────────────────────
        // executeAIAction performs all remaining security checks:
        //   tenant isolation, patient from conversation, treatment required,
        //   revalidation via availabilityService, double-booking via createAppointment,
        //   deterministic doctor resolution.
        let bookingSucceeded = false;
        try {
            await (0, ai_action_executor_1.executeAIAction)(tenantId, conversationId, {
                type: "book_appointment",
                targetId: result.action.targetId,
                booking,
            });
            bookingSucceeded = true;
        }
        catch (err) {
            console.error("[AutoBooking] executeAIAction failed:", err.message);
            // Booking failed — do NOT send WhatsApp, do NOT clear context
            return;
        }
        // ── Clear pendingBookingContext after successful booking ───────────────────
        if (bookingSucceeded) {
            await communication_model_1.Conversation.findByIdAndUpdate(conversationId, {
                $unset: { pendingBookingContext: 1 },
            }).catch((err) => console.error("[AutoBooking] Failed to clear pendingBookingContext:", err.message));
        }
        // ── Generate WhatsApp confirmation from REAL appointment data ─────────────
        // Fetch the appointment just created from DB.
        // Confirmation text is built from real fields — NEVER from the AI reply text.
        const patientId = conversation.patientId;
        if (!patientId) {
            console.warn("[AutoBooking] No patientId on conversation — cannot send confirmation.");
            return;
        }
        const [createdAppointment, patient, tenant] = await Promise.all([
            appointment_model_1.Appointment.findOne({
                tenantId,
                patientId,
                date: booking.date,
                startTime: booking.startTime,
                status: "scheduled",
            }).lean(),
            patient_model_1.Patient.findOne({ _id: patientId, tenantId })
                .select("firstName language")
                .lean(),
            tenant_model_1.Tenant.findById(tenantId).lean(),
        ]);
        if (!createdAppointment || !patient || !tenant) {
            console.error("[AutoBooking] Could not load appointment/patient/tenant for confirmation.");
            return;
        }
        const confirmationText = buildBookingConfirmationMessage({
            date: createdAppointment.date,
            startTime: createdAppointment.startTime,
            endTime: createdAppointment.endTime,
            treatment: createdAppointment.treatment,
        }, patient.firstName ?? "Patient", patient.language ?? "fr");
        // ── Send WhatsApp confirmation ─────────────────────────────────────────────
        let whatsappMsgId;
        try {
            const sendResult = await this.messagingProvider.sendMessage({ to: conversation.contactWaId, type: "text", content: confirmationText }, tenant);
            whatsappMsgId = sendResult.providerMessageId;
        }
        catch (sendErr) {
            // WhatsApp send failure is non-fatal: the appointment WAS created successfully.
            // Log but do not undo the booking.
            console.error("[AutoBooking] WhatsApp send failed after successful booking:", sendErr.message);
            return;
        }
        // ── Persist the outbound confirmation message ──────────────────────────────
        await communication_model_1.Message.create({
            tenantId,
            conversationId,
            patientId,
            direction: "outbound",
            status: "sent",
            content: confirmationText,
            providerMessageId: whatsappMsgId ?? `auto-booking-confirm-${Date.now()}`,
        }).catch((err) => console.error("[AutoBooking] Failed to persist outbound message:", err.message));
    }
}
exports.AIAutoBookingService = AIAutoBookingService;
// Singleton for production use (injectable in tests via constructor)
exports.aiAutoBookingService = new AIAutoBookingService();
//# sourceMappingURL=ai.auto-booking.service.js.map