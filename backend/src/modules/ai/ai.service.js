"use strict";
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
const tenant_model_1 = require("../tenants/tenant.model");
const ai_prompt_1 = require("./ai.prompt");
const ai_errors_1 = require("./ai.errors");
const availability_service_1 = require("../appointments/availability.service");
const MAX_MESSAGES = 20;
/**
 * Render the tenant's businessHours settings as a short human-readable summary.
 * Business hours are REAL tenant data — used to prevent the AI from inventing
 * opening times. The format is intentionally lossy: only present days/times.
 */
function summarizeBusinessHours(businessHours) {
    if (!businessHours)
        return undefined;
    // Flat format: { start: "09:00", end: "18:00" }
    if (businessHours.start && businessHours.end) {
        return `${businessHours.start}-${businessHours.end}`;
    }
    // Per-day format: { "monday": [{ start, end }, ...], ... }
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const parts = [];
    for (const day of days) {
        const blocks = businessHours[day];
        if (Array.isArray(blocks) && blocks.length > 0) {
            const times = blocks
                .filter((b) => b && b.start && b.end)
                .map((b) => `${b.start}-${b.end}`)
                .join(", ");
            if (times)
                parts.push(`${day} ${times}`);
        }
    }
    return parts.length > 0 ? parts.join("; ") : undefined;
}
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
        const tenantIdObj = new mongoose_1.default.Types.ObjectId(tenantId);
        // Load REAL clinic data, business hours, services & custom clinic instructions (tenant-scoped).
        const tenantDoc = await tenant_model_1.Tenant.findById(tenantIdObj).lean();
        const aiConfig = tenantDoc?.settings?.aiConfig || {};
        const services = tenantDoc?.settings?.services || tenantDoc?.settings?.aiConfig?.services;
        const businessHoursSummary = tenantDoc?.settings?.businessHours
            ? summarizeBusinessHours(tenantDoc.settings.businessHours)
            : undefined;
        // Initialize aiContext with all clinic and practitioner settings
        const aiContext = {
            clinicName: tenantDoc?.name,
            clinicSpecialty: tenantDoc?.specialty,
            clinicAddress: tenantDoc?.address,
            clinicPhone: tenantDoc?.phone || tenantDoc?.settings?.whatsappConfig?.phoneNumber,
            customInstructions: aiConfig.customInstructions,
            tone: aiConfig.tone,
            bookingMode: aiConfig.mode,
            services: Array.isArray(services) && services.length > 0 ? services : undefined,
            capabilities: aiConfig.capabilities,
            escalationRules: aiConfig.escalationRules,
            businessHours: businessHoursSummary,
            noShowPolicy: tenantDoc?.settings?.noShowPolicy,
        };
        if (conversation.patientId) {
            const patientIdObj = new mongoose_1.default.Types.ObjectId(conversation.patientId.toString());
            const patient = await patient_model_1.Patient.findOne({
                _id: patientIdObj,
                tenantId: tenantIdObj,
            })
                .select("firstName lastName language status metrics")
                .lean();
            if (patient) {
                const isPlaceholder = !patient.firstName ||
                    patient.firstName.toLowerCase() === "patient" ||
                    patient.firstName.toLowerCase() === "unknown" ||
                    !patient.lastName ||
                    patient.lastName.toLowerCase() === "whatsapp" ||
                    patient.status === "lead";
                aiContext.patientId = patient._id.toString();
                if (patient.firstName !== undefined)
                    aiContext.firstName = patient.firstName;
                if (patient.lastName !== undefined)
                    aiContext.lastName = patient.lastName;
                if (patient.language !== undefined)
                    aiContext.language = patient.language;
                aiContext.isNewPatient = isPlaceholder;
                aiContext.patientNoShowCount = patient.metrics?.noShowCount || 0;
                // Fetch Next Appointment
                const now = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
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
        if (businessHoursSummary) {
            aiContext.businessHours = businessHoursSummary;
        }
        if (conversation.pendingBookingContext) {
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
        let patientInfo;
        let action = null;
        let proposedSlots;
        let needsHumanEscalation = false;
        let structured = false;
        const safeParse = (str) => {
            try {
                const trimmed = str.trim();
                if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
                    return JSON.parse(trimmed);
                }
                const match = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
                if (match && match[1]) {
                    return JSON.parse(match[1].trim());
                }
                const firstBrace = str.indexOf("{");
                const lastBrace = str.lastIndexOf("}");
                if (firstBrace !== -1 && lastBrace > firstBrace) {
                    return JSON.parse(str.slice(firstBrace, lastBrace + 1));
                }
            }
            catch (e) { }
            return null;
        };
        try {
            let parsed = safeParse(rawResponse);
            if (parsed) {
                intent = parsed.intent;
                scheduling = parsed.scheduling;
                // Two-Pass: If intent is scheduling or rescheduling and date/duration are present, fetch availability
                if ((intent === "appointment_availability" || intent === "appointment_change_request") && scheduling?.date && scheduling?.durationMin) {
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
                        const slotsStr = slotsResult.slots.map((s) => `${s.startTime.replace(":", "h")}`).join(", ");
                        systemUpdate = `[SYSTEM] Available slots for ${scheduling.date}: ${slotsStr}. Formulate a response presenting these options.`;
                    }
                    else {
                        proposedSlots = undefined;
                        systemUpdate = `[SYSTEM] No available slots for ${scheduling.date}. Formulate a polite response explaining that the schedule is full for this date and ask the patient for their preferred alternative date.`;
                    }
                    // Add the Pass 1 response and the System Update to messages
                    aiMessages.push({ role: "assistant", content: rawResponse });
                    aiMessages.push({ role: "system", content: systemUpdate });
                    // Call AI Provider (PASS 2)
                    rawResponse = await this.provider.generateCompletion(aiMessages);
                    const secondParsed = safeParse(rawResponse);
                    if (secondParsed) {
                        parsed = secondParsed;
                    }
                }
            }
            if (parsed && typeof parsed.reply === "string" && parsed.reply.trim()) {
                structured = true;
                suggestion = parsed.reply.trim();
                intent = parsed.intent;
                scheduling = parsed.scheduling;
                if (parsed.patientInfo && typeof parsed.patientInfo === "object") {
                    const fn = typeof parsed.patientInfo.firstName === "string" && parsed.patientInfo.firstName.trim() ? parsed.patientInfo.firstName.trim() : undefined;
                    const ln = typeof parsed.patientInfo.lastName === "string" && parsed.patientInfo.lastName.trim() ? parsed.patientInfo.lastName.trim() : undefined;
                    if (fn || ln) {
                        patientInfo = { firstName: fn, lastName: ln };
                    }
                }
                needsHumanEscalation = parsed.needsHumanEscalation === true;
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
                    if (parsed.action.booking && typeof parsed.action.booking.date === "string") {
                        action.booking = {
                            date: parsed.action.booking.date,
                            startTime: parsed.action.booking.startTime,
                            durationMin: parsed.action.booking.durationMin,
                            treatment: parsed.action.booking.treatment,
                        };
                    }
                }
            }
            else if (rawResponse && rawResponse.trim()) {
                // Fallback: If AI returned natural text without JSON wrapping, clean and use as reply
                const cleanText = rawResponse.replace(/```[a-z]*\s*/gi, "").replace(/```/g, "").trim();
                if (cleanText) {
                    suggestion = cleanText;
                    structured = true;
                }
            }
        }
        catch {
            // Fallback
            const cleanText = rawResponse.replace(/```[a-z]*\s*/gi, "").replace(/```/g, "").trim();
            if (cleanText) {
                suggestion = cleanText;
                structured = true;
            }
        }
        return {
            suggestion,
            ...(intent !== undefined ? { intent } : {}),
            ...(patientInfo !== undefined ? { patientInfo } : {}),
            ...(scheduling !== undefined ? { scheduling } : {}),
            ...(proposedSlots !== undefined ? { proposedSlots } : {}),
            action,
            needsHumanEscalation,
            structured,
        };
    }
}
exports.AIService = AIService;
//# sourceMappingURL=ai.service.js.map