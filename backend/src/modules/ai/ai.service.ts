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
import {
  buildTemporalContext,
  TemporalContext,
  DEFAULT_TIMEZONE,
  getBusinessHoursForDate,
  formatBusinessHoursBlocks,
  summarizeAllBusinessHours,
  getWeekdayFr,
  formatDateFr,
} from "./temporal.utils";

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
 * Render the tenant's businessHours settings as a full per-day summary.
 * Uses the deterministic temporal.utils module.
 */
function summarizeBusinessHours(businessHours: any): string | undefined {
  if (!businessHours) return undefined;
  return summarizeAllBusinessHours(businessHours);
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

    // Load REAL clinic data, business hours, services & custom clinic instructions (tenant-scoped).
    const tenantDoc = await Tenant.findById(tenantIdObj).lean();
    const aiConfig = tenantDoc?.settings?.aiConfig || {};
    const services = tenantDoc?.settings?.services || tenantDoc?.settings?.aiConfig?.services;
    const tenantTimezone = (tenantDoc as any)?.timezone || DEFAULT_TIMEZONE;
    const businessHoursSummary = tenantDoc?.settings?.businessHours
      ? summarizeBusinessHours(tenantDoc.settings.businessHours)
      : undefined;

    // Build timezone-aware temporal context (today, tomorrow, day-after, weekdays)
    const temporalCtx = buildTemporalContext(tenantTimezone);

    // Build per-day business hours for today, tomorrow, day-after-tomorrow
    const rawBH = tenantDoc?.settings?.businessHours;
    let relevantDaysHours: string | undefined;
    if (rawBH) {
      const todayBH = getBusinessHoursForDate(temporalCtx.currentDate, rawBH);
      const tomorrowBH = getBusinessHoursForDate(temporalCtx.tomorrow, rawBH);
      const dayAfterBH = getBusinessHoursForDate(temporalCtx.dayAfterTomorrow, rawBH);
      relevantDaysHours = [
        `${formatDateFr(temporalCtx.currentDate)} (aujourd'hui): ${formatBusinessHoursBlocks(todayBH)}`,
        `${formatDateFr(temporalCtx.tomorrow)} (demain): ${formatBusinessHoursBlocks(tomorrowBH)}`,
        `${formatDateFr(temporalCtx.dayAfterTomorrow)} (après-demain): ${formatBusinessHoursBlocks(dayAfterBH)}`,
      ].join("\n");
    }

    // Initialize aiContext with all clinic and practitioner settings
    const aiContext: IAIContext = {
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
      temporalContext: temporalCtx,
      relevantDaysHours,
    };

    if (conversation.patientId) {
      const patientIdObj = new mongoose.Types.ObjectId(conversation.patientId.toString());

      const patient = await Patient.findOne({
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
        if (patient.firstName !== undefined) aiContext.firstName = patient.firstName;
        if (patient.lastName !== undefined) aiContext.lastName = patient.lastName;
        if (patient.language !== undefined) aiContext.language = patient.language;
        aiContext.isNewPatient = isPlaceholder;
        aiContext.patientNoShowCount = patient.metrics?.noShowCount || 0;

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
      aiContext.businessHours = businessHoursSummary;
    }

    if (conversation.pendingBookingContext) {
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
    let patientInfo: { firstName?: string; lastName?: string } | undefined;
    let action: AIActionProposal | null = null;
    let proposedSlots: Array<{ startTime: string; endTime: string }> | undefined;
    let needsHumanEscalation = false;
    let structured = false;

    const safeParse = (str: string) => {
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
      } catch (e) {}
      return null;
    };

    try {
      let parsed: any = safeParse(rawResponse);

      if (parsed) {
        intent = parsed.intent;
        scheduling = parsed.scheduling;


        // Two-Pass: If intent is scheduling or rescheduling and date is present, fetch availability
        // durationMin is optional — if missing, default to 30 min (standard consultation)
        if ((intent === "appointment_availability" || intent === "appointment_change_request") && scheduling?.date) {
          if (!scheduling.durationMin) scheduling.durationMin = 30;

          const requestedDateFr = formatDateFr(scheduling.date);
          // requestedWeekdayFr is derived deterministically from the date string alone.
          // slotsResult.weekdayFr (built from the same logic) will always match.
          const requestedWeekdayFr = getWeekdayFr(scheduling.date);

          const slotsResult = await availabilityService.getAvailableSlots({
            tenantId,
            date: scheduling.date,
            durationMin: scheduling.durationMin,
            timePreference: scheduling.timePreference,
          });

          // businessHoursStr comes from the SAME resolveDaySchedule() call inside getAvailableSlots().
          // We NEVER recompute it from rawBH here — that was the P0 divergence source (Phase 6.14).
          const hoursDisplay = slotsResult.businessHoursStr
            ? ` Horaires du ${slotsResult.weekdayFr ?? requestedWeekdayFr}: ${slotsResult.businessHoursStr}.`
            : "";

          let systemUpdate = "";
          if (slotsResult.error) {
            systemUpdate = `[SYSTEM] Cannot fetch slots: ${slotsResult.error}`;
          } else if (slotsResult.status === "PAST" || slotsResult.isPastDate) {
            systemUpdate = `[SYSTEM] La date demandée (${requestedDateFr}) est DÉJÀ PASSÉE. Informez le patient poliment que ce créneau/date est passé et proposez de vérifier les disponibilités à partir d'aujourd'hui ou du prochain jour ouvert.`;
          } else if (slotsResult.status === "CLOSED") {
            // SINGLE DECISION POINT: status comes only from slotsResult (Phase 6.14).
            // requestedDayBH is REMOVED — it was the source of the P0 inconsistency.
            const nextDay = await availabilityService.findNextBookableDay({
              tenantId,
              startDateIso: scheduling.date,
              durationMin: scheduling.durationMin,
            });

            if (nextDay) {
              systemUpdate = `[SYSTEM] Le cabinet est FERMÉ le ${requestedDateFr} (${slotsResult.weekdayFr ?? requestedWeekdayFr}). Le prochain jour d'ouverture avec des créneaux disponibles est le ${nextDay.dateFr} (${nextDay.weekdayFr}). RÈGLE STRICTE: Expliquez que le cabinet est fermé ce jour-là. Proposez le ${nextDay.weekdayFr} ${nextDay.dateFr} et demandez au patient si cette date lui convient. NE PROPOSEZ PAS ENCORE D'HORAIRES PRÉCIS pour le ${nextDay.weekdayFr} sans son accord.`;
            } else {
              systemUpdate = `[SYSTEM] Le cabinet est FERMÉ le ${requestedDateFr} (${slotsResult.weekdayFr ?? requestedWeekdayFr}). Informez le patient que le cabinet est fermé ce jour-là et proposez de vérifier les disponibilités lors de la prochaine réouverture.`;
            }
          } else if (slotsResult.status === "OPEN_WITH_AVAILABILITY" && slotsResult.slots && slotsResult.slots.length > 0) {
            proposedSlots = slotsResult.slots;
            const slotsStr = slotsResult.slots.map((s) => `${s.startTime.replace(":", "h")}`).join(", ");
            systemUpdate = `[SYSTEM] Date: ${requestedDateFr}.${hoursDisplay} Créneaux disponibles: ${slotsStr}. Formulez une réponse claire présentant ces créneaux. N'inventez aucun autre horaire.`;
          } else if (slotsResult.status === "OPEN_FULL" || (slotsResult.slots && slotsResult.slots.length === 0)) {
            proposedSlots = undefined;
            const nextDay = await availabilityService.findNextBookableDay({
              tenantId,
              startDateIso: scheduling.date,
              durationMin: scheduling.durationMin,
            });

            if (nextDay) {
              systemUpdate = `[SYSTEM] Le planning est COMPLET le ${requestedDateFr} (${slotsResult.weekdayFr ?? requestedWeekdayFr}).${hoursDisplay} Le prochain jour avec des créneaux disponibles est le ${nextDay.dateFr} (${nextDay.weekdayFr}). RÈGLE STRICTE: Expliquez poliment que le planning est complet pour ce jour. Mentionnez que le prochain jour ouvert avec disponibilités est le ${nextDay.weekdayFr} ${nextDay.dateFr} et demandez si le patient souhaite voir les créneaux pour cette date. NE PROPOSEZ PAS ENCORE D'HORAIRES PRÉCIS pour le ${nextDay.weekdayFr} sans son accord.`;
            } else {
              systemUpdate = `[SYSTEM] Le planning est COMPLET le ${requestedDateFr} (${slotsResult.weekdayFr ?? requestedWeekdayFr}).${hoursDisplay} Aucun créneau disponible dans les prochains jours. Demandez au patient s'il souhaite être mis sur liste d'attente.`;
            }
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
          if (parsed.action.booking && typeof parsed.action.booking.date === "string") {
            action.booking = {
              date: parsed.action.booking.date,
              startTime: parsed.action.booking.startTime,
              durationMin: parsed.action.booking.durationMin,
              treatment: parsed.action.booking.treatment,
            };
          }
        }
      } else if (rawResponse && rawResponse.trim()) {
        // Fallback: If AI returned natural text without JSON wrapping, clean and use as reply
        const cleanText = rawResponse.replace(/```[a-z]*\s*/gi, "").replace(/```/g, "").trim();
        if (cleanText) {
          suggestion = cleanText;
          structured = true;
        }
      }
    } catch {
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