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
import { detectLanguageFromText } from "./ai.utils";

const MAX_MESSAGES = 6;

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
  patientInfo?: {
    firstName: string;
    lastName: string;
  };
}

export interface AISuggestionResult {
  suggestion: string;
  intent?: string;
  patientInfo?: {
    firstName?: string;
    lastName?: string;
  };
  extractedPatient?: {
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
  detectedLang?: "fr" | "ar" | "arabizi" | "en";
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

    // Load last MAX_MESSAGES messages for this conversation (ascending for context order).
    // ── Session boundary (bot context reset) ──────────────────────────────────
    // When the secretary marks an appointment as "completed" (honoré), the backend
    // sets conversation.sessionStartedAt = now. From that point on, the AI only
    // sees messages AFTER that timestamp — the patient is greeted fresh on their
    // next message, while the full patient dossier (appointments, notes, etc.)
    // is still passed through aiContext. This prevents "Ken 3andek 7aja okhra?"
    // responses when the patient returns days after their last visit.
    const sessionFilter = conversation.sessionStartedAt
      ? { createdAt: { $gt: conversation.sessionStartedAt } }
      : {};

    const rawMessages = await Message.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      conversationId: new mongoose.Types.ObjectId(conversationId),
      ...sessionFilter,
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
      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(temporalCtx.currentDate + "T12:00:00Z");
        d.setUTCDate(d.getUTCDate() + i);
        const iso = d.toISOString().slice(0, 10);
        const bh = getBusinessHoursForDate(iso, rawBH);
        let label = "";
        if (i === 0) label = " (aujourd'hui)";
        if (i === 1) label = " (demain)";
        if (i === 2) label = " (après-demain)";
        days.push(`- ${formatDateFr(iso)}${label}: ${formatBusinessHoursBlocks(bh)}`);
      }
      relevantDaysHours = days.join("\n");
    }

    // Initialize aiContext with all clinic and practitioner settings
    const aiContext: IAIContext = {
      clinicName: tenantDoc?.name,
      clinicSpecialty: tenantDoc?.specialty,
      clinicAddress: tenantDoc?.address,
      clinicPhone: tenantDoc?.phone || tenantDoc?.settings?.whatsappConfig?.phoneNumber,
      clinicCurrency: tenantDoc?.currency,
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
        .select("firstName lastName language status metrics notes tags")
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
        if (patient.notes !== undefined) aiContext.medicalNotes = patient.notes;
        if (patient.tags && patient.tags.length > 0) aiContext.patientTags = patient.tags;
        aiContext.isNewPatient = isPlaceholder;
        aiContext.patientNoShowCount = patient.metrics?.noShowCount || 0;

        // Phase 4 - Affichage des rendez-vous: single query for all authorized patients
        const now = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const convoPhone = (conversation as any).contactWaId;
        const authorizedPatientIds: mongoose.Types.ObjectId[] = [patientIdObj];
        
        if (convoPhone) {
          const familyPatients = await Patient.find({
            tenantId: tenantIdObj,
            phone: convoPhone,
            _id: { $ne: patientIdObj },
          }).select("_id firstName lastName notes tags").lean();
          familyPatients.forEach(p => authorizedPatientIds.push(new mongoose.Types.ObjectId(p._id.toString())));
          // Store family medical data keyed by patient ID for later use
          (conversation as any).__familyPatientData = familyPatients.reduce((acc: any, p: any) => {
            acc[p._id.toString()] = { firstName: p.firstName, lastName: p.lastName, notes: p.notes, tags: p.tags };
            return acc;
          }, {});
        }

        const allAppointments = await Appointment.find({
          tenantId: tenantIdObj,
          status: { $in: ["scheduled", "confirmed"] },
          patientId: { $in: authorizedPatientIds },
          date: { $gte: now },
        })
          .sort({ date: 1, startTime: 1 })
          .populate("patientId", "firstName lastName phone")
          .lean();

        const mainAppointments = [];
        const familyAppointments = [];

        for (const appt of allAppointments) {
          const p = appt.patientId as any;
          const isMainPatient = p && p._id.toString() === patientIdObj.toString();
          
          if (isMainPatient) {
            mainAppointments.push({
              id: appt._id.toString(),
              date: appt.date,
              startTime: appt.startTime,
              endTime: appt.endTime,
              treatment: appt.treatment,
              status: appt.status,
            });
          } else {
            const name = p ? `${p.firstName || ""} ${p.lastName || ""}`.trim() : "Membre de la famille";
            const familyMedData = (conversation as any).__familyPatientData?.[p?._id?.toString() ?? ""];
            familyAppointments.push({
              appointmentId: appt._id.toString(),
              patientId: p ? p._id.toString() : "",
              patientName: name || "Membre de la famille",
              date: appt.date,
              startTime: appt.startTime,
              endTime: appt.endTime,
              treatment: appt.treatment,
              status: appt.status,
              ...(familyMedData?.notes ? { medicalNotes: familyMedData.notes } : {}),
              ...(familyMedData?.tags?.length > 0 ? { tags: familyMedData.tags } : {}),
            });
          }
        }

        if (mainAppointments.length > 0) aiContext.appointments = mainAppointments;
        if (familyAppointments.length > 0) aiContext.familyAppointments = familyAppointments;

        // Merge dossier-only family members AFTER the appointment loop so we never lose data.
        // For each known family patient: if already in familyAppointments (via appointment),
        // ensure their tags are present. If not present at all, add a dossier-only entry.
        const familyData = (conversation as any).__familyPatientData ?? {};
        if (Object.keys(familyData).length > 0) {
          if (!aiContext.familyAppointments) aiContext.familyAppointments = [];
          for (const [patientId, data] of Object.entries(familyData) as [string, any][]) {
            const existing = aiContext.familyAppointments.find((fa: any) => fa.patientId === patientId);
            if (existing) {
              // Already there from appointment — make sure tags are merged in
              if (!existing.tags && data.tags && data.tags.length > 0) existing.tags = data.tags;
              if (!existing.medicalNotes && data.notes) existing.medicalNotes = data.notes;
            } else if (data.notes || (data.tags && data.tags.length > 0)) {
              // Not in the list at all — add dossier-only entry
              aiContext.familyAppointments.push({
                appointmentId: "dossier-only-" + patientId,
                patientId,
                patientName: `${data.firstName || ""} ${data.lastName || ""}`.trim() || "Membre de la famille",
                date: "",
                startTime: "",
                endTime: "",
                treatment: "",
                status: "no_appointment",
                ...(data.notes ? { medicalNotes: data.notes } : {}),
                ...(data.tags && data.tags.length > 0 ? { tags: data.tags } : {}),
              });
            }
          }
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
        ...(conversation.pendingBookingContext.targetPatientInfo ? { targetPatientInfo: conversation.pendingBookingContext.targetPatientInfo } : {}),
      };
    }

    if (conversation.pendingBookingIntent) {
      aiContext.pendingBookingIntent = {
        date: conversation.pendingBookingIntent.date,
        startTime: conversation.pendingBookingIntent.startTime,
        durationMin: conversation.pendingBookingIntent.durationMin,
        treatment: conversation.pendingBookingIntent.treatment,
        targetPatientInfo: conversation.pendingBookingIntent.targetPatientInfo,
        awaitingTargetConfirmation: conversation.pendingBookingIntent.awaitingTargetConfirmation,
      };
    }

    // Build a quick lookup: providerMessageId → content for quoted message resolution
    const msgByWamid = new Map<string, string>();
    for (const m of messages) {
      if ((m as any).providerMessageId && m.content) {
        msgByWamid.set((m as any).providerMessageId, m.content);
      }
    }

    // ── Linguistic Anchor (Lock Language upstream) ─────────────────────────
    const inboundMessages = messages.filter((m) => m.direction === "inbound" && m.content);
    const systemButtonRegex = /^(oui|non|ey|le|نعم|لا|oui, je confirme|non, annuler|نعم، أؤكد|لا، إلغاء)\b/i;
    const patientText = inboundMessages
      .map((m) => m.content?.trim() || "")
      .filter((t) => t.length > 0 && !systemButtonRegex.test(t))
      .slice(-3)
      .join(" ");

    if (patientText) {
      if (/[\u0600-\u06FF]/.test(patientText)) {
        aiContext.lockedLanguage = "ar";
      } else {
        const detected = detectLanguageFromText(patientText, aiContext.language);
        if (detected === "arabizi") {
          aiContext.lockedLanguage = "tn-arabizi";
        } else if (detected === "ar") {
          aiContext.lockedLanguage = "ar";
        } else if (detected === "fr") {
          aiContext.lockedLanguage = "fr";
        }
      }
    } else if (aiContext.language) {
      const pLang = aiContext.language;
      if (pLang === "arabizi" || pLang === "tn-arabizi") aiContext.lockedLanguage = "tn-arabizi";
      else if (pLang === "ar") aiContext.lockedLanguage = "ar";
      else if (pLang === "en") aiContext.lockedLanguage = "en";
      else aiContext.lockedLanguage = "fr";
    }

    // Build the message array for the AI provider
    const systemPrompt = buildSystemPrompt(aiContext);

    const aiMessages: IChatMessage[] = [
      { role: "system", content: systemPrompt },
      // Map conversation messages to AI roles
      // If a message is a reply (drag-to-reply), prepend the quoted message so the AI has context
      ...messages.map((msg) => {
        let content = msg.content;
        const quotedWamid = (msg as any).quotedProviderMessageId;
        if (msg.direction === "inbound" && quotedWamid) {
          const quotedContent = msgByWamid.get(quotedWamid);
          if (quotedContent) {
            content = `[En réponse au message: "${quotedContent}"]\n${content}`;
          }
        }
        return {
          role: (msg.direction === "inbound" ? "user" : "assistant") as "user" | "assistant",
          content,
        };
      }),
    ];

    // Call the AI provider (PASS 1)
    let rawResponse = await this.provider.generateCompletion(aiMessages);

    let suggestion: string = rawResponse;
    let intent: string | undefined;
    let scheduling: any;
    let patientInfo: { firstName?: string; lastName?: string } | undefined;
    let action: AIActionProposal | null = null;
    let proposedSlots: Array<{ startTime: string; endTime: string }> | undefined;
    let detectedLangResult: "fr" | "ar" | "arabizi" | "en" | undefined;
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
              systemUpdate = `[SYSTEM] Le cabinet est FERMÉ le ${requestedDateFr} (${slotsResult.weekdayFr ?? requestedWeekdayFr}). Le prochain jour d'ouverture avec des créneaux disponibles est le ${nextDay.dateFr} (${nextDay.weekdayFr}). RÈGLE STRICTE: Expliquez DANS LA LANGUE DU PATIENT que le cabinet est fermé ce jour-là. Proposez le ${nextDay.weekdayFr} ${nextDay.dateFr} et demandez au patient si cette date lui convient. NE PROPOSEZ PAS ENCORE D'HORAIRES PRÉCIS pour le ${nextDay.weekdayFr} sans son accord.`;
            } else {
              systemUpdate = `[SYSTEM] Le cabinet est FERMÉ le ${requestedDateFr} (${slotsResult.weekdayFr ?? requestedWeekdayFr}). Informez le patient DANS SA LANGUE que le cabinet est fermé ce jour-là et proposez de vérifier les disponibilités lors de la prochaine réouverture.`;
            }
          } else if (slotsResult.status === "OPEN_WITH_AVAILABILITY" && slotsResult.slots && slotsResult.slots.length > 0) {
            proposedSlots = slotsResult.slots;
            const slotsStr = slotsResult.slots.map((s) => `${s.startTime.replace(":", "h")}`).join(", ");
            systemUpdate = `[SYSTEM] Date: ${requestedDateFr}.${hoursDisplay} Créneaux disponibles: ${slotsStr}. Formulez une réponse claire DANS LA LANGUE DU PATIENT (Tunisien ou Français) présentant ces créneaux. N'inventez aucun autre horaire. Ne dites pas "Pour le mardi", traduisez naturellement.`;
          } else if (slotsResult.status === "OPEN_FULL" || (slotsResult.slots && slotsResult.slots.length === 0)) {
            proposedSlots = undefined;
            const nextDay = await availabilityService.findNextBookableDay({
              tenantId,
              startDateIso: scheduling.date,
              durationMin: scheduling.durationMin,
            });

            if (nextDay) {
              systemUpdate = `[SYSTEM] Le planning est COMPLET le ${requestedDateFr} (${slotsResult.weekdayFr ?? requestedWeekdayFr}).${hoursDisplay} Le prochain jour avec des créneaux disponibles est le ${nextDay.dateFr} (${nextDay.weekdayFr}). RÈGLE STRICTE: Expliquez poliment DANS LA LANGUE DU PATIENT que le planning est complet pour ce jour. Mentionnez que le prochain jour ouvert avec disponibilités est le ${nextDay.weekdayFr} ${nextDay.dateFr} et demandez si le patient souhaite voir les créneaux pour cette date. NE PROPOSEZ PAS ENCORE D'HORAIRES PRÉCIS pour le ${nextDay.weekdayFr} sans son accord.`;
            } else {
              systemUpdate = `[SYSTEM] Le planning est COMPLET le ${requestedDateFr} (${slotsResult.weekdayFr ?? requestedWeekdayFr}).${hoursDisplay} Aucun créneau disponible dans les prochains jours. Demandez au patient DANS SA LANGUE s'il souhaite être mis sur liste d'attente.`;
            }
          }

          // Detect patient language from their messages for PASS 2 hard lock
          const inboundTexts = messages
            .filter((m: any) => m.direction === "inbound")
            .map((m: any) => m.content || "")
            .join(" ");
          const detectedLangStr = detectLanguageFromText(inboundTexts, aiContext.language);
          detectedLangResult = detectedLangStr;
          const langLockMap: Record<string, string> = {
            fr: "FRANÇAIS UNIQUEMENT (aucun mot tunisien ou arabe)",
            arabizi: "ARABIZI TUNISIEN UNIQUEMENT (caractères latins, aucune phrase française)",
            ar: "ARABE TUNISIEN EN ÉCRITURE ARABE UNIQUEMENT",
            en: "ANGLAIS UNIQUEMENT",
          };
          const langLock = langLockMap[detectedLangStr] ?? "FRANÇAIS UNIQUEMENT";
          const langConstraint = `\n🔴 CONTRAINTE ABSOLUE DE LANGUE (détectée par le backend) : réponds en ${langLock}. Cette contrainte prime sur tout le reste.`;



          // Add the Pass 1 response and the System Update to messages
          aiMessages.push({ role: "assistant", content: rawResponse });
          aiMessages.push({ role: "system", content: systemUpdate + langConstraint });

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
          typeof parsed.action.type === "string"
        ) {
          action = {
            type: parsed.action.type,
            targetId: typeof parsed.action.targetId === "string" ? parsed.action.targetId : "self",
            reason: typeof parsed.action.reason === "string" ? parsed.action.reason : "",
            confidence: typeof parsed.action.confidence === "number" ? parsed.action.confidence : 1,
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
      detectedLang: detectedLangResult,
    };
  }
}