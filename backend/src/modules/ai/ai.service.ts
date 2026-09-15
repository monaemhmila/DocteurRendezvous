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

import mongoose from "mongoose";
import { Conversation, Message } from "../communications/communication.model";
import { Patient } from "../patients/patient.model";
import { Appointment } from "../appointments/appointment.model";
import { Recovery } from "../recovery/recovery.model";
import { FollowUpTask } from "../followups/followup.model";
import { Tenant } from "../tenants/tenant.model";
import { IAIProvider, IChatMessage } from "./ai.provider.interface";
import { buildSystemPrompt, IAIContext } from "./ai.prompt";
import { ConversationNotFoundError } from "./ai.errors";
import { availabilityService } from "../appointments/availability.service";

const MAX_MESSAGES = 20;

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
  proposedSlots?: Array<{ startTime: string; endTime: string }>;
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

/**
 * Render the tenant's businessHours settings as a short human-readable summary.
 * Business hours are REAL tenant data — used to prevent the AI from inventing
 * opening times. The format is intentionally lossy: only present days/times.
 */
function summarizeBusinessHours(businessHours: any): string | undefined {
  if (!businessHours) return undefined;
  // Flat format: { start: "09:00", end: "18:00" }
  if (businessHours.start && businessHours.end) {
    return `${businessHours.start}-${businessHours.end}`;
  }
  // Per-day format: { "monday": [{ start, end }, ...], ... }
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const parts: string[] = [];
  for (const day of days) {
    const blocks = businessHours[day];
    if (Array.isArray(blocks) && blocks.length > 0) {
      const times = blocks
        .filter((b: any) => b && b.start && b.end)
        .map((b: any) => `${b.start}-${b.end}`)
        .join(", ");
      if (times) parts.push(`${day} ${times}`);
    }
  }
  return parts.length > 0 ? parts.join("; ") : undefined;
}

export class AIService {
  private provider: IAIProvider;

  constructor(provider: IAIProvider) {
    this.provider = provider;
  }

  /**
   * Generate an AI suggestion for a given conversation.
   *
   * @param tenantId - MUST come from req.user.tenantId — never from request body/query
   * @param conversationId - The conversation to generate a suggestion for
   * @returns A plain-text suggestion string
   */
  async getSuggestion(tenantId: string, conversationId: string): Promise<AISuggestionResult> {
    // Validate conversationId format before DB query
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new ConversationNotFoundError();
    }

    // Load conversation and enforce tenant ownership
    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      throw new ConversationNotFoundError();
    }

    // CRITICAL: Tenant isolation check
    if (conversation.tenantId.toString() !== tenantId) {
      throw new ConversationNotFoundError();
    }

    // Load last MAX_MESSAGES messages for this conversation (ascending for context order)
    const rawMessages = await Message.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      conversationId: new mongoose.Types.ObjectId(conversationId),
    })
      .sort({ createdAt: -1 })
      .limit(MAX_MESSAGES)
      .lean();

    // Reverse to chronological order (oldest first) for the AI context
    const messages = rawMessages.reverse();

    const tenantIdObj = new mongoose.Types.ObjectId(tenantId);

    // Load REAL business hours (tenant-scoped — from req.user tenantId, never from input).
    // Never exposed to the model when absent: the model may not invent opening times.
    const tenantDoc = await Tenant.findById(tenantIdObj).select("settings.businessHours").lean();
    const businessHoursSummary = tenantDoc?.settings?.businessHours
      ? summarizeBusinessHours(tenantDoc.settings.businessHours)
      : undefined;

    // Load patient context and business context
    let aiContext: IAIContext | undefined = undefined;

    if (conversation.patientId) {
      const patientIdObj = new mongoose.Types.ObjectId(conversation.patientId.toString());

      const patient = await Patient.findOne({
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
        const now = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const appointment = await Appointment.findOne({
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
        const recovery = await Recovery.findOne({
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
        const followUp = await FollowUpTask.findOne({
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
      aiContext = aiContext || {};
      aiContext.businessHours = businessHoursSummary;
    }

    if (conversation.pendingBookingContext) {
      aiContext = aiContext || {};
      aiContext.pendingBookingContext = {
        date: conversation.pendingBookingContext.date,
        proposedSlots: conversation.pendingBookingContext.proposedSlots,
      };
    }

    // Build the message array for the AI provider
    const systemPrompt = buildSystemPrompt(aiContext);

    const aiMessages: IChatMessage[] = [
      { role: "system", content: systemPrompt },
      // Map conversation messages to AI roles
      ...messages.map((msg) => ({
        role: (msg.direction === "inbound" ? "user" : "assistant") as "user" | "assistant",
        content: msg.content,
      })),
    ];

    // Call the AI provider (PASS 1)
    let rawResponse = await this.provider.generateCompletion(aiMessages);

    let suggestion: string = rawResponse;
    let intent: string | undefined;
    let scheduling: any;
    let action: AIActionProposal | null = null;
    let proposedSlots: Array<{ startTime: string; endTime: string }> | undefined;
    let needsHumanEscalation = false;
    let structured = false;

    try {
      const stripped = rawResponse.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      let parsed: any = JSON.parse(stripped);

      intent = parsed.intent;
      scheduling = parsed.scheduling;

      // Two-Pass: If intent is scheduling and date/duration are present, fetch availability
      if (intent === "appointment_availability" && scheduling?.date && scheduling?.durationMin) {
        const slotsResult = await availabilityService.getAvailableSlots({
          tenantId,
          date: scheduling.date,
          durationMin: scheduling.durationMin,
          timePreference: scheduling.timePreference,
        });

        let systemUpdate = "";
        if (slotsResult.error) {
          systemUpdate = `[SYSTEM] Cannot fetch slots: ${slotsResult.error}`;
        } else if (slotsResult.slots && slotsResult.slots.length > 0) {
          // Capture slots returned so the caller can persist them as pendingBookingContext
          proposedSlots = slotsResult.slots;
          const slotsStr = slotsResult.slots.map(s => `${s.startTime}-${s.endTime}`).join(", ");
          systemUpdate = `[SYSTEM] Available slots for ${scheduling.date}: ${slotsStr}. Formulate a response presenting these options.`;
        } else {
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
        structured = true;
        suggestion = parsed.reply;
        intent = parsed.intent;
        scheduling = parsed.scheduling;
        needsHumanEscalation = parsed.needsHumanEscalation === true;
        if (
          parsed.action &&
          typeof parsed.action.type === "string" &&
          typeof parsed.action.targetId === "string" &&
          typeof parsed.action.reason === "string" &&
          typeof parsed.action.confidence === "number"
        ) {
          action = {
            type: parsed.action.type,
            targetId: parsed.action.targetId,
            reason: parsed.action.reason,
            confidence: parsed.action.confidence,
          };
          // Carry the booking details if the model proposed one with the confirmed slot.
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
    } catch {
      // Provider did not return valid JSON — treat the raw text as the suggestion.
      // This is a graceful fallback for the manual review flow (action remains null,
      // structured stays false so the text is NEVER auto-sent to a patient).
    }

    return {
      suggestion,
      ...(intent !== undefined ? { intent } : {}),
      ...(scheduling !== undefined ? { scheduling } : {}),
      ...(proposedSlots !== undefined ? { proposedSlots } : {}),
      action,
      needsHumanEscalation,
      structured,
    };
  }
}