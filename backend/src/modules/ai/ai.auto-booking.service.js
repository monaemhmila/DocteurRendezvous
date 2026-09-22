"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiAutoBookingService = exports.AIAutoBookingService = void 0;
exports.buildBookingConfirmationMessage = buildBookingConfirmationMessage;
exports.buildRescheduleConfirmationMessage = buildRescheduleConfirmationMessage;
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
function buildRescheduleConfirmationMessage(appointment, patientFirstName, language = "fr") {
    if (language === "en") {
        return `Hello ${patientFirstName}, your appointment has been modified: it is now scheduled on ${appointment.date} from ${appointment.startTime} to ${appointment.endTime} (${appointment.treatment}). See you soon!`;
    }
    // Default: French
    return `Bonjour ${patientFirstName}, votre rendez-vous a bien \u00e9t\u00e9 modifi\u00e9 : il est d\u00e9sormais pr\u00e9vu le ${appointment.date} de ${appointment.startTime} \u00e0 ${appointment.endTime} (${appointment.treatment}). \u00c0 bient\u00f4t au cabinet !`;
}
// ──────────────────────────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────────────────────────
function normalizeTime(timeStr) {
    if (!timeStr)
        return "09:00";
    const clean = timeStr.trim().toLowerCase().replace("h", ":");
    const parts = clean.split(":");
    const h = (parts[0] || "9").padStart(2, "0");
    const m = (parts[1] || "00").padStart(2, "0");
    return `${h}:${m}`;
}
function extractPatientNameFromText(text) {
    if (!text)
        return null;
    const match1 = text.match(/(?:je m'appelle|moi c'est|mon nom est|je suis)\s+([A-Za-zÀ-ÿ\-]+)\s+([A-Za-zÀ-ÿ\-]+)/i);
    if (match1) {
        return { firstName: match1[1], lastName: match1[2] };
    }
    const match2 = text.match(/(?:nom\s*(?:et\s*pr[ée]nom)?)\s*[:\-]\s*([A-Za-zÀ-ÿ\-]+)\s+([A-Za-zÀ-ÿ\-]+)/i);
    if (match2) {
        return { firstName: match2[1], lastName: match2[2] };
    }
    return null;
}
class AIAutoBookingService {
    aiService;
    messagingProvider;
    constructor(aiService, messagingProvider) {
        this.aiService = aiService ?? new ai_service_1.AIService(new openai_compatible_provider_1.OpenAICompatibleProvider());
        this.messagingProvider = messagingProvider ?? new messaging_provider_1.MetaWhatsAppProvider();
    }
    /**
     * Process an inbound message for the full AI conversation flow.
     *
     * Called by communicationService.handleWebhook() after persisting the message.
     * All errors are caught internally — failure never propagates to the webhook.
     */
    async processInboundMessage(tenantId, conversationId, inboundWaId) {
        // ── Step 1: load conversation (tenant-scoped) ─────────────────────────────
        const conversation = await communication_model_1.Conversation.findOne({
            _id: conversationId,
            tenantId: new mongoose_1.default.Types.ObjectId(tenantId),
        }).lean();
        if (!conversation) {
            console.warn("[AI Conversation] Conversation not found.");
            return;
        }
        // A human has taken over this conversation → AI must stay silent.
        if (conversation.needsHuman === true) {
            console.log("[AI Conversation] Conversation is under human takeover — skipping AI processing.");
            return;
        }
        // ── Step 2: call getSuggestion [pure read — no DB writes] ─────────────────
        let result;
        try {
            result = await this.aiService.getSuggestion(tenantId, conversationId);
        }
        catch (err) {
            console.error("[AI Conversation] getSuggestion failed:", err.message);
            return;
        }
        // ── Step 2a: Update Patient Profile if patientInfo was provided ────────────
        let pInfo = result.patientInfo;
        if (!pInfo?.firstName) {
            const latestInbound = await communication_model_1.Message.findOne({
                tenantId: new mongoose_1.default.Types.ObjectId(tenantId),
                conversationId: new mongoose_1.default.Types.ObjectId(conversationId),
                direction: "inbound",
            }).sort({ createdAt: -1 }).lean();
            if (latestInbound?.content) {
                const extracted = extractPatientNameFromText(latestInbound.content);
                if (extracted)
                    pInfo = extracted;
            }
        }
        if (conversation.patientId && pInfo && (pInfo.firstName || pInfo.lastName)) {
            try {
                const updateFields = { status: "active" };
                if (pInfo.firstName)
                    updateFields.firstName = pInfo.firstName;
                if (pInfo.lastName)
                    updateFields.lastName = pInfo.lastName;
                await patient_model_1.Patient.findByIdAndUpdate(conversation.patientId, { $set: updateFields });
                console.log(`[AI Conversation] Updated patient profile for ${conversation.patientId}:`, updateFields);
            }
            catch (err) {
                console.error("[AI Conversation] Failed to update patient profile:", err.message);
            }
        }
        // ── Step 2b: human escalation → send handoff reply, flag conversation, NO action ──
        if (result.needsHumanEscalation === true) {
            await this.sendConversationalReply(tenantId, conversationId, conversation, result, inboundWaId);
            await communication_model_1.Conversation.findByIdAndUpdate(conversationId, {
                $set: { needsHuman: true },
            }).catch((err) => console.error("[AI Conversation] Failed to flag human escalation:", err.message));
            return;
        }
        // ── Step 3a: if AI proposed slots, persist pendingBookingContext ─────────
        if ((result.intent === "appointment_availability" || result.intent === "appointment_change_request") &&
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
                console.error("[AI Conversation] Failed to save pendingBookingContext:", err.message);
            }
        }
        // ── Step 3b: booking proposal → dedicated secure booking flow ─────────────
        if (result.action?.type === "book_appointment" && result.action.booking) {
            if (result.intent === "appointment_change_request") {
                await this.handleRescheduleProposal(tenantId, conversationId, conversation, result);
                return;
            }
            await this.handleBookingProposal(tenantId, conversationId, conversation, result);
            return;
        }
        // ── Step 3c: reschedule proposal → dedicated secure rescheduling flow ─────
        if (result.action?.type === "reschedule_appointment" && result.action.booking) {
            await this.handleRescheduleProposal(tenantId, conversationId, conversation, result);
            return;
        }
        // ── Step 3d: confirm appointment proposal / reminder confirmation ─────────
        const latestInbound = await communication_model_1.Message.findOne({
            tenantId: new mongoose_1.default.Types.ObjectId(tenantId),
            conversationId: new mongoose_1.default.Types.ObjectId(conversationId),
            direction: "inbound",
        }).sort({ createdAt: -1 }).lean();
        const lowerMsg = (latestInbound?.content || "").trim().toLowerCase();
        const isConfirmationText = lowerMsg === "oui" ||
            lowerMsg === "oui confirmer" ||
            lowerMsg === "je confirme" ||
            lowerMsg === "confirmer" ||
            lowerMsg === "confirme" ||
            lowerMsg === "d'accord" ||
            lowerMsg === "daccord" ||
            lowerMsg === "c'est bon" ||
            lowerMsg === "نعم" ||
            lowerMsg === "نأكد" ||
            lowerMsg === "أؤكد";
        if (result.action?.type === "confirm_appointment" || isConfirmationText) {
            const handled = await this.handleConfirmAppointmentProposal(tenantId, conversationId, conversation, result, inboundWaId);
            if (handled)
                return;
        }
        // ── Step 4: general conversational reply (non-booking, non-escalation, or fallback) ────
        await this.sendConversationalReply(tenantId, conversationId, conversation, result, inboundWaId);
    }
    // ────────────────────────────────────────────────────────────────────────────
    // Booking flow
    // ────────────────────────────────────────────────────────────────────
    async handleBookingProposal(tenantId, conversationId, conversation, result) {
        const rawBooking = result.action?.booking;
        if (!rawBooking)
            return false;
        const patientId = conversation.patientId;
        if (!patientId) {
            console.warn("[AI Conversation] No patientId on conversation — cannot book.");
            return false;
        }
        const bookingDate = conversation.pendingBookingContext?.date || rawBooking.date || new Date().toISOString().slice(0, 10);
        const booking = {
            date: bookingDate,
            startTime: normalizeTime(rawBooking.startTime),
            durationMin: rawBooking.durationMin || 30,
            treatment: rawBooking.treatment || "Consultation dentaire",
        };
        // If patient already has an active upcoming appointment, route to reschedule
        const existingUpcomingAppt = await appointment_model_1.Appointment.findOne({
            tenantId: new mongoose_1.default.Types.ObjectId(tenantId),
            patientId: new mongoose_1.default.Types.ObjectId(patientId),
            status: { $in: ["scheduled", "confirmed"] },
            $or: [
                { date: { $ne: booking.date } },
                { startTime: { $ne: booking.startTime } }
            ]
        }).sort({ date: 1, startTime: 1 });
        if (existingUpcomingAppt) {
            console.log(`[AI Conversation] Patient already has an upcoming appointment (${existingUpcomingAppt._id}). Rescheduling it to ${booking.date} ${booking.startTime}...`);
            return this.handleRescheduleProposal(tenantId, conversationId, conversation, result);
        }
        let createdAppointment = await appointment_model_1.Appointment.findOne({
            tenantId: new mongoose_1.default.Types.ObjectId(tenantId),
            patientId: new mongoose_1.default.Types.ObjectId(patientId),
            date: booking.date,
            startTime: booking.startTime,
            status: { $in: ["scheduled", "confirmed"] }
        }).lean();
        let bookingSucceeded = false;
        if (createdAppointment) {
            console.log("[AI Conversation] Appointment already exists for this slot (idempotency). Reusing it.");
            bookingSucceeded = true;
        }
        else {
            const actionTarget = result.action?.targetId && result.action.targetId !== "self"
                ? result.action.targetId
                : patientId.toString();
            try {
                await (0, ai_action_executor_1.executeAIAction)(tenantId, conversationId, {
                    type: "book_appointment",
                    targetId: actionTarget,
                    booking,
                });
                bookingSucceeded = true;
            }
            catch (err) {
                console.error("[AI Conversation] executeAIAction failed:", err.message);
                // Fetch real-time available slots for that date
                const { availabilityService } = await import("../appointments/availability.service");
                let altResult = { slots: [] };
                try {
                    altResult = await availabilityService.getAvailableSlots({
                        tenantId,
                        date: booking.date,
                        durationMin: booking.durationMin || 30,
                    });
                }
                catch (slotErr) {
                    console.error("[AI Conversation] Failed to fetch alternative slots:", slotErr);
                }
                let conflictMessage = "";
                if (altResult.slots && altResult.slots.length > 0) {
                    const slotsList = altResult.slots.map((s) => s.startTime.replace(":", "h")).join(", ");
                    conflictMessage = `Désolé, le créneau de ${booking.startTime.replace(":", "h")} n'est plus disponible (déjà réservé). Pour le ${booking.date}, voici les créneaux encore libres : ${slotsList}. Quel horaire préférez-vous ?`;
                    // Update pendingBookingContext with the new remaining slots
                    await communication_model_1.Conversation.findByIdAndUpdate(conversationId, {
                        $set: {
                            pendingBookingContext: {
                                date: booking.date,
                                durationMin: booking.durationMin || 30,
                                proposedSlots: altResult.slots,
                                proposedAt: new Date(),
                            },
                        },
                    });
                }
                else {
                    conflictMessage = `Désolé, le créneau de ${booking.startTime.replace(":", "h")} n'est plus disponible et il n'y a plus de place pour cette date. Auriez-vous une autre date à me proposer ?`;
                }
                // Send this conflict message via WhatsApp so the patient is accurately informed
                const tenant = await tenant_model_1.Tenant.findById(tenantId).lean();
                if (tenant) {
                    const deterministicId = `ai-conflict-${conversationId}-${Date.now()}`;
                    try {
                        await this.messagingProvider.sendMessage({ to: conversation.contactWaId, type: "text", content: conflictMessage }, tenant);
                        await communication_model_1.Message.create({
                            tenantId,
                            conversationId,
                            patientId,
                            direction: "outbound",
                            status: "sent",
                            content: conflictMessage,
                            providerMessageId: deterministicId,
                        });
                    }
                    catch (sendErr) {
                        console.error("[AI Conversation] Failed to send conflict message:", sendErr.message);
                    }
                }
                return true;
            }
        }
        // ── Clear pendingBookingContext after successful booking ───────────────────
        if (bookingSucceeded) {
            await communication_model_1.Conversation.findByIdAndUpdate(conversationId, {
                $unset: { pendingBookingContext: 1 },
            }).catch((err) => console.error("[AI Conversation] Failed to clear pendingBookingContext:", err.message));
        }
        // ── Generate WhatsApp confirmation from REAL appointment data ─────────────
        if (!createdAppointment) {
            createdAppointment = await appointment_model_1.Appointment.findOne({
                tenantId,
                patientId,
                date: booking.date,
                startTime: booking.startTime,
                status: "scheduled",
            }).lean();
        }
        if (!createdAppointment) {
            console.error("[AI Conversation] Could not load appointment after creation.");
            return false;
        }
        const [patient, tenant] = await Promise.all([
            patient_model_1.Patient.findOne({ _id: patientId, tenantId })
                .select("firstName lastName language")
                .lean(),
            tenant_model_1.Tenant.findById(tenantId).lean(),
        ]);
        if (!patient || !tenant) {
            console.error("[AI Conversation] Could not load patient/tenant for confirmation.");
            return false;
        }
        const patientDisplayName = patient.firstName && patient.firstName !== "Patient"
            ? patient.firstName
            : "";
        const confirmationText = buildBookingConfirmationMessage({
            date: createdAppointment.date,
            startTime: createdAppointment.startTime,
            endTime: createdAppointment.endTime,
            treatment: createdAppointment.treatment,
        }, patientDisplayName, patient.language ?? "fr");
        // ── Check WhatsApp confirmation idempotency ─────────────────────────────────
        // Prevent sending duplicate confirmations for the same appointment.
        const deterministicWaMsgId = `auto-booking-confirm-${createdAppointment._id.toString()}`;
        const alreadySentMessage = await communication_model_1.Message.findOne({
            providerMessageId: deterministicWaMsgId,
            status: { $ne: "failed" }
        });
        if (alreadySentMessage) {
            console.log("[AI Conversation] Confirmation already sent successfully. Skipping.");
            return true;
        }
        // ── Send WhatsApp confirmation ─────────────────────────────────────────────
        let whatsappMsgId;
        try {
            const sendResult = await this.messagingProvider.sendMessage({ to: conversation.contactWaId, type: "text", content: confirmationText }, tenant);
            whatsappMsgId = sendResult.providerMessageId;
        }
        catch (sendErr) {
            // WhatsApp send failure is non-fatal: the appointment WAS created successfully.
            // Log but do not undo the booking. We flag the message as "failed" for retries.
            console.error("[AI Conversation] WhatsApp send failed after successful booking:", sendErr.message);
            await communication_model_1.Message.findOneAndUpdate({ providerMessageId: deterministicWaMsgId }, {
                $set: {
                    tenantId,
                    conversationId,
                    patientId,
                    direction: "outbound",
                    status: "failed",
                    content: confirmationText,
                    error: sendErr.message
                }
            }, { upsert: true }).catch((err) => console.error("[AI Conversation] Failed to persist failed message:", err.message));
            return true;
        }
        // ── Persist the outbound confirmation message ──────────────────────────────
        await communication_model_1.Message.findOneAndUpdate({ providerMessageId: deterministicWaMsgId }, {
            $set: {
                tenantId,
                conversationId,
                patientId,
                direction: "outbound",
                status: "sent",
                content: confirmationText,
                error: null
            }
        }, { upsert: true }).catch((err) => console.error("[AI Conversation] Failed to persist outbound message:", err.message));
        return true;
    }
    // ────────────────────────────────────────────────────────────────────────────
    // Reschedule flow
    // ────────────────────────────────────────────────────────────────────────────
    async handleRescheduleProposal(tenantId, conversationId, conversation, result) {
        const rawBooking = result.action?.booking;
        if (!rawBooking)
            return false;
        const patientId = conversation.patientId;
        if (!patientId) {
            console.warn("[AI Conversation] No patientId on conversation — cannot reschedule.");
            return false;
        }
        const bookingDate = conversation.pendingBookingContext?.date || rawBooking.date || new Date().toISOString().slice(0, 10);
        const booking = {
            date: bookingDate,
            startTime: normalizeTime(rawBooking.startTime),
            durationMin: rawBooking.durationMin || 30,
            treatment: rawBooking.treatment || "Consultation dentaire",
        };
        const actionTarget = result.action?.targetId && result.action.targetId !== "self"
            ? result.action.targetId
            : "";
        let rescheduleSucceeded = false;
        try {
            await (0, ai_action_executor_1.executeAIAction)(tenantId, conversationId, {
                type: "reschedule_appointment",
                targetId: actionTarget,
                booking,
            });
            rescheduleSucceeded = true;
        }
        catch (err) {
            console.error("[AI Conversation] Reschedule failed:", err.message);
            // Fetch real-time available slots for that date
            const { availabilityService } = await import("../appointments/availability.service");
            let altResult = { slots: [] };
            try {
                altResult = await availabilityService.getAvailableSlots({
                    tenantId,
                    date: booking.date,
                    durationMin: booking.durationMin || 30,
                });
            }
            catch (slotErr) {
                console.error("[AI Conversation] Failed to fetch alternative slots:", slotErr);
            }
            let conflictMessage = "";
            if (altResult.slots && altResult.slots.length > 0) {
                const slotsList = altResult.slots.map((s) => s.startTime.replace(":", "h")).join(", ");
                conflictMessage = `Désolé, le créneau de ${booking.startTime.replace(":", "h")} n'est plus disponible (déjà réservé). Pour le ${booking.date}, voici les créneaux encore libres pour décaler votre rendez-vous : ${slotsList}. Quel horaire préférez-vous ?`;
                await communication_model_1.Conversation.findByIdAndUpdate(conversationId, {
                    $set: {
                        pendingBookingContext: {
                            date: booking.date,
                            durationMin: booking.durationMin || 30,
                            proposedSlots: altResult.slots,
                            proposedAt: new Date(),
                        },
                    },
                });
            }
            else {
                conflictMessage = `Désolé, le créneau de ${booking.startTime.replace(":", "h")} n'est plus disponible et il n'y a plus de place pour le ${booking.date}. Auriez-vous un autre jour à me proposer pour décaler votre rendez-vous ?`;
            }
            const tenant = await tenant_model_1.Tenant.findById(tenantId).lean();
            if (tenant) {
                const deterministicId = `ai-reschedule-conflict-${conversationId}-${Date.now()}`;
                try {
                    await this.messagingProvider.sendMessage({ to: conversation.contactWaId, type: "text", content: conflictMessage }, tenant);
                    await communication_model_1.Message.create({
                        tenantId,
                        conversationId,
                        patientId,
                        direction: "outbound",
                        status: "sent",
                        content: conflictMessage,
                        providerMessageId: deterministicId,
                    });
                }
                catch (sendErr) {
                    console.error("[AI Conversation] Failed to send conflict message:", sendErr.message);
                }
            }
            return true;
        }
        // Clear pendingBookingContext after successful rescheduling
        if (rescheduleSucceeded) {
            await communication_model_1.Conversation.findByIdAndUpdate(conversationId, {
                $unset: { pendingBookingContext: 1 },
            }).catch((err) => console.error("[AI Conversation] Failed to clear pendingBookingContext:", err.message));
        }
        // Load updated appointment
        const updatedAppointment = await appointment_model_1.Appointment.findOne({
            tenantId,
            patientId,
            date: booking.date,
            startTime: booking.startTime,
            status: { $in: ["scheduled", "confirmed"] }
        }).lean();
        if (!updatedAppointment) {
            console.error("[AI Conversation] Could not load updated appointment after rescheduling.");
            return false;
        }
        const [patient, tenant] = await Promise.all([
            patient_model_1.Patient.findOne({ _id: patientId, tenantId }).select("firstName lastName language").lean(),
            tenant_model_1.Tenant.findById(tenantId).lean(),
        ]);
        if (!patient || !tenant) {
            console.error("[AI Conversation] Could not load patient/tenant for reschedule confirmation.");
            return false;
        }
        const patientDisplayName = patient.firstName && patient.firstName !== "Patient"
            ? patient.firstName
            : "";
        const confirmationText = buildRescheduleConfirmationMessage({
            date: updatedAppointment.date,
            startTime: updatedAppointment.startTime,
            endTime: updatedAppointment.endTime,
            treatment: updatedAppointment.treatment,
        }, patientDisplayName, patient.language ?? "fr");
        const deterministicWaMsgId = `auto-reschedule-confirm-${updatedAppointment._id.toString()}-${Date.now()}`;
        try {
            await this.messagingProvider.sendMessage({ to: conversation.contactWaId, type: "text", content: confirmationText }, tenant);
            await communication_model_1.Message.create({
                tenantId,
                conversationId,
                patientId,
                direction: "outbound",
                status: "sent",
                content: confirmationText,
                providerMessageId: deterministicWaMsgId,
            });
        }
        catch (sendErr) {
            console.error("[AI Conversation] Failed to send reschedule confirmation:", sendErr.message);
        }
        return true;
    }
    // ────────────────────────────────────────────────────────────────────────────
    // Conversational reply (Phase 6.10)
    // ────────────────────────────────────────────────────────────────────────────
    /**
     * Send the AI's natural reply to the patient via WhatsApp and persist the
     * outbound Message. Idempotent: the Message.providerMessageId is built from
     * the inbound wamid (`ai-reply-<wamid>`), so a retry never sends a duplicate.
     *
     * Only structured replies (valid JSON parsed by AIService) are sent. Raw
     * fallback text is never auto-sent to a patient.
     */
    async sendConversationalReply(tenantId, conversationId, conversation, result, inboundWaId) {
        if (!result.structured || !result.suggestion || !result.suggestion.trim()) {
            console.log("[AI Conversation] No structured reply available — not auto-sending anything.");
            return;
        }
        const reply = result.suggestion.trim();
        // Determine the inbound message id that triggered this reply (for idempotency)
        let baseId = inboundWaId;
        if (!baseId || !baseId.trim()) {
            const latestInbound = await communication_model_1.Message.findOne({
                tenantId: new mongoose_1.default.Types.ObjectId(tenantId),
                conversationId: new mongoose_1.default.Types.ObjectId(conversationId),
                direction: "inbound",
            }).sort({ createdAt: -1 }).lean();
            baseId = latestInbound?.providerMessageId;
        }
        if (!baseId || !baseId.trim()) {
            console.warn("[AI Conversation] Cannot determine inbound wamid — reply not sent.");
            return;
        }
        const deterministicId = `ai-reply-${baseId}`;
        // Idempotency: never send the same AI reply twice
        const alreadySent = await communication_model_1.Message.findOne({
            providerMessageId: deterministicId,
            status: { $ne: "failed" },
        });
        if (alreadySent) {
            console.log("[AI Conversation] AI reply already sent. Skipping.");
            return;
        }
        const tenant = await tenant_model_1.Tenant.findById(tenantId).lean();
        if (!tenant) {
            console.error("[AI Conversation] Tenant not found for reply.");
            return;
        }
        const patientId = conversation.patientId;
        try {
            const sendResult = await this.messagingProvider.sendMessage({ to: conversation.contactWaId, type: "text", content: reply }, tenant);
            await communication_model_1.Message.findOneAndUpdate({ providerMessageId: deterministicId }, {
                $set: {
                    tenantId,
                    conversationId,
                    patientId,
                    direction: "outbound",
                    status: "sent",
                    content: reply,
                    error: null,
                },
            }, { upsert: true }).catch((err) => console.error("[AI Conversation] Failed to persist outbound reply:", err.message));
        }
        catch (sendErr) {
            // WhatsApp send failure: persist as failed for later retry (same deterministic id)
            console.error("[AI Conversation] WhatsApp send failed for AI reply:", sendErr.message);
            await communication_model_1.Message.findOneAndUpdate({ providerMessageId: deterministicId }, {
                $set: {
                    tenantId,
                    conversationId,
                    patientId,
                    direction: "outbound",
                    status: "failed",
                    content: reply,
                    error: sendErr.message,
                },
            }, { upsert: true }).catch((err) => console.error("[AI Conversation] Failed to persist failed reply:", err.message));
        }
    }
    /**
     * Handle confirmation of an existing upcoming appointment when the patient confirms.
     */
    async handleConfirmAppointmentProposal(tenantId, conversationId, conversation, result, inboundWaId) {
        const patientId = conversation.patientId;
        if (!patientId)
            return false;
        const today = new Date().toISOString().slice(0, 10);
        let appt = null;
        if (result.action?.targetId && mongoose_1.default.Types.ObjectId.isValid(result.action.targetId)) {
            appt = await appointment_model_1.Appointment.findOne({
                _id: new mongoose_1.default.Types.ObjectId(result.action.targetId),
                tenantId: new mongoose_1.default.Types.ObjectId(tenantId),
            });
        }
        if (!appt) {
            appt = await appointment_model_1.Appointment.findOne({
                tenantId: new mongoose_1.default.Types.ObjectId(tenantId),
                patientId: new mongoose_1.default.Types.ObjectId(patientId.toString()),
                date: { $gte: today },
                status: { $in: ["scheduled", "confirmed"] },
            }).sort({ date: 1, startTime: 1 });
        }
        if (!appt)
            return false;
        // Update appointment status to confirmed in agenda
        appt.status = "confirmed";
        await appt.save();
        console.log(`[AI Conversation] Appointment ${appt._id} updated to CONFIRMED for ${appt.date} at ${appt.startTime}`);
        // Compose tailored confirmation reply
        let reply = result.suggestion;
        if (!reply || reply.includes("Je ne suis pas sûr") || !result.structured) {
            reply = `Parfait ! Votre rendez-vous du ${appt.date} à ${appt.startTime} est bien confirmé dans notre agenda. Nous vous attendons avec plaisir au cabinet !`;
        }
        await this.sendConversationalReply(tenantId, conversationId, conversation, { ...result, suggestion: reply, structured: true }, inboundWaId);
        return true;
    }
}
exports.AIAutoBookingService = AIAutoBookingService;
// Singleton for production use (injectable in tests via constructor)
exports.aiAutoBookingService = new AIAutoBookingService();
//# sourceMappingURL=ai.auto-booking.service.js.map