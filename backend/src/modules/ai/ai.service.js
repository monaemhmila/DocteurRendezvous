"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const communication_model_1 = require("../communications/communication.model");
const patient_model_1 = require("../patients/patient.model");
const appointment_model_1 = require("../appointments/appointment.model");
const recovery_model_1 = require("../recovery/recovery.model");
const followup_model_1 = require("../followups/followup.model");
const ai_prompt_1 = require("./ai.prompt");
const ai_errors_1 = require("./ai.errors");
const availability_service_1 = require("../appointments/availability.service");
const MAX_MESSAGES = 20;
class AIService {
    provider;
    constructor(provider) {
        this.provider = provider;
    }
    /**
     * Generate an AI suggestion for a given conversation.
     *
     * @param tenantId - MUST come from req.user.tenantId — never from request body/query
     * @param conversationId - The conversation to generate a suggestion for
     * @returns A plain-text suggestion string
     */
    async getSuggestion(tenantId, conversationId) {
        // Validate conversationId format before DB query
        if (!mongoose_1.default.Types.ObjectId.isValid(conversationId)) {
            throw new ai_errors_1.ConversationNotFoundError();
        }
        // Load conversation and enforce tenant ownership
        const conversation = await communication_model_1.Conversation.findById(conversationId).lean();
        if (!conversation) {
            throw new ai_errors_1.ConversationNotFoundError();
        }
        // CRITICAL: Tenant isolation check
        if (conversation.tenantId.toString() !== tenantId) {
            throw new ai_errors_1.ConversationNotFoundError();
        }
        // Load last MAX_MESSAGES messages for this conversation (ascending for context order)
        const rawMessages = await communication_model_1.Message.find({
            tenantId: new mongoose_1.default.Types.ObjectId(tenantId),
            conversationId: new mongoose_1.default.Types.ObjectId(conversationId),
        })
            .sort({ createdAt: -1 })
            .limit(MAX_MESSAGES)
            .lean();
        // Reverse to chronological order (oldest first) for the AI context
        const messages = rawMessages.reverse();
        // Load patient context and business context
        let aiContext = undefined;
        if (conversation.patientId) {
            const patientIdObj = new mongoose_1.default.Types.ObjectId(conversation.patientId.toString());
            const tenantIdObj = new mongoose_1.default.Types.ObjectId(tenantId);
            const patient = await patient_model_1.Patient.findOne({
                _id: patientIdObj,
                tenantId: tenantIdObj,
            })
                .select("firstName lastName language")
                .lean();
            if (patient) {
                aiContext = {
                    ...(patient.firstName !== undefined ? { firstName: patient.firstName } : {}),
                    ...(patient.lastName !== undefined ? { lastName: patient.lastName } : {}),
                    ...(patient.language !== undefined ? { language: patient.language } : {}),
                };
                // Fetch Next Appointment
                const now = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
                const appointment = await appointment_model_1.Appointment.findOne({
                    tenantId: tenantIdObj,
                    patientId: patientIdObj,
                    date: { $gte: now },
                    status: { $in: ["scheduled", "confirmed"] }
                }).sort({ date: 1, startTime: 1 }).lean();
                if (appointment) {
                    aiContext.appointment = {
                        id: appointment._id.toString(),
                        date: appointment.date,
                        startTime: appointment.startTime,
                        endTime: appointment.endTime,
                        treatment: appointment.treatment,
                        status: appointment.status,
                    };
                }
                // Fetch Active Recovery
                const recovery = await recovery_model_1.Recovery.findOne({
                    tenantId: tenantId,
                    patientId: patientIdObj,
                    status: { $in: ["identified", "queued", "contacted", "responded"] }
                }).sort({ detectedAt: -1 }).lean();
                if (recovery) {
                    aiContext.recovery = {
                        id: recovery._id.toString(),
                        type: recovery.type,
                        status: recovery.status,
                    };
                }
                // Fetch Active Follow-up Task
                const followUp = await followup_model_1.FollowUpTask.findOne({
                    tenantId: tenantId,
                    patientId: patientIdObj,
                    status: { $in: ["pending", "in_progress"] }
                }).sort({ scheduledFor: 1 }).lean();
                if (followUp) {
                    aiContext.followUp = {
                        type: followUp.type,
                        status: followUp.status,
                        ...(followUp.scheduledFor ? { scheduledFor: followUp.scheduledFor } : {})
                    };
                }
            }
        }
        if (conversation.pendingBookingContext) {
            aiContext = aiContext || {};
            aiContext.pendingBookingContext = {
                date: conversation.pendingBookingContext.date,
                proposedSlots: conversation.pendingBookingContext.proposedSlots,
            };
        }
        // Build the message array for the AI provider
        const systemPrompt = (0, ai_prompt_1.buildSystemPrompt)(aiContext);
        const aiMessages = [
            { role: "system", content: systemPrompt },
            // Map conversation messages to AI roles
            ...messages.map((msg) => ({
                role: (msg.direction === "inbound" ? "user" : "assistant"),
                content: msg.content,
            })),
        ];
        // Call the AI provider (PASS 1)
        let rawResponse = await this.provider.generateCompletion(aiMessages);
        let suggestion = rawResponse;
        let intent;
        let scheduling;
        let action = null;
        let proposedSlots;
        try {
            const stripped = rawResponse.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
            let parsed = JSON.parse(stripped);
            intent = parsed.intent;
            scheduling = parsed.scheduling;
            // Two-Pass: If intent is scheduling and date/duration are present, fetch availability
            if (intent === "appointment_availability" && scheduling?.date && scheduling?.durationMin) {
                const slotsResult = await availability_service_1.availabilityService.getAvailableSlots({
                    tenantId,
                    date: scheduling.date,
                    durationMin: scheduling.durationMin,
                    timePreference: scheduling.timePreference,
                });
                let systemUpdate = "";
                if (slotsResult.error) {
                    systemUpdate = `[SYSTEM] Cannot fetch slots: ${slotsResult.error}`;
                }
                else if (slotsResult.slots && slotsResult.slots.length > 0) {
                    // Capture slots returned so the caller can persist them as pendingBookingContext
                    proposedSlots = slotsResult.slots;
                    const slotsStr = slotsResult.slots.map(s => `${s.startTime}-${s.endTime}`).join(", ");
                    systemUpdate = `[SYSTEM] Available slots for ${scheduling.date}: ${slotsStr}. Formulate a response presenting these options.`;
                }
                else {
                    systemUpdate = `[SYSTEM] No available slots for ${scheduling.date} with duration ${scheduling.durationMin}min. Formulate a response apologizing and asking for another date.`;
                }
                // Add the Pass 1 response and the System Update to messages
                aiMessages.push({ role: "assistant", content: rawResponse });
                aiMessages.push({ role: "system", content: systemUpdate });
                // Call AI Provider (PASS 2)
                rawResponse = await this.provider.generateCompletion(aiMessages);
                const secondStripped = rawResponse.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
                parsed = JSON.parse(secondStripped);
            }
            if (parsed && typeof parsed.reply === "string") {
                suggestion = parsed.reply;
                intent = parsed.intent;
                scheduling = parsed.scheduling;
                if (parsed.action &&
                    typeof parsed.action.type === "string" &&
                    typeof parsed.action.targetId === "string" &&
                    typeof parsed.action.reason === "string" &&
                    typeof parsed.action.confidence === "number") {
                    action = {
                        type: parsed.action.type,
                        targetId: parsed.action.targetId,
                        reason: parsed.action.reason,
                        confidence: parsed.action.confidence,
                    };
                }
            }
        }
        catch {
            // Provider did not return valid JSON — treat the raw text as the suggestion
            // This is a graceful fallback: action remains null
        }
        return { suggestion, intent, scheduling, proposedSlots, action };
    }
}
exports.AIService = AIService;
//# sourceMappingURL=ai.service.js.map