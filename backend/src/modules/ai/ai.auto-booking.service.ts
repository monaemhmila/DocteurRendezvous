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

import mongoose from "mongoose";
import { Conversation, Message } from "../communications/communication.model";
import { Appointment } from "../appointments/appointment.model";
import { Patient } from "../patients/patient.model";
import { Tenant } from "../tenants/tenant.model";
import { AIService, AISuggestionResult } from "./ai.service";
import { OpenAICompatibleProvider } from "./openai-compatible.provider";
import { executeAIAction } from "./ai.action.executor";
import {
  MetaWhatsAppProvider,
  IMessagingProvider,
} from "../communications/providers/messaging.provider";
import { availabilityService } from "../appointments/availability.service";

// ──────────────────────────────────────────────────────────────────────────────
// Confirmation message builder
// Generates the WhatsApp text from REAL appointment data — never from AI reply.
// ──────────────────────────────────────────────────────────────────────────────

export function buildBookingConfirmationMessage(
  appointment: {
    date: string;
    startTime: string;
    endTime: string;
    treatment: string;
  },
  patientFirstName: string,
  language = "fr"
): string {
  if (language === "en") {
    return `Hello ${patientFirstName}, your appointment has been confirmed: ${appointment.date} from ${appointment.startTime} to ${appointment.endTime} (${appointment.treatment}). See you soon!`;
  }
  // Default: French
  return `Bonjour ${patientFirstName}, votre rendez-vous a bien \u00e9t\u00e9 confirm\u00e9 : le ${appointment.date} de ${appointment.startTime} \u00e0 ${appointment.endTime} (${appointment.treatment}). \u00c0 bient\u00f4t au cabinet !`;
}

export function buildRescheduleConfirmationMessage(
  appointment: {
    date: string;
    startTime: string;
    endTime: string;
    treatment: string;
  },
  patientFirstName: string,
  language = "fr"
): string {
  if (language === "en") {
    return `Hello ${patientFirstName}, your appointment has been modified: it is now scheduled on ${appointment.date} from ${appointment.startTime} to ${appointment.endTime} (${appointment.treatment}). See you soon!`;
  }
  // Default: French
  return `Bonjour ${patientFirstName}, votre rendez-vous a bien \u00e9t\u00e9 modifi\u00e9 : il est d\u00e9sormais pr\u00e9vu le ${appointment.date} de ${appointment.startTime} \u00e0 ${appointment.endTime} (${appointment.treatment}). \u00c0 bient\u00f4t au cabinet !`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────────────────────────

function normalizeTime(timeStr?: string): string {
  if (!timeStr) return "09:00";
  const clean = timeStr.trim().toLowerCase().replace("h", ":");
  const parts = clean.split(":");
  const h = (parts[0] || "9").padStart(2, "0");
  const m = (parts[1] || "00").padStart(2, "0");
  return `${h}:${m}`;
}

function extractPatientNameFromText(text: string): { firstName?: string; lastName?: string } | null {
  if (!text) return null;
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

// ──────────────────────────────────────────────────────────────────────────────
// Phase 6.17.1 — Family / target patient detection
// ──────────────────────────────────────────────────────────────────────────────

/**
 * French family-relation keywords.
 * If any of these appear in a message, the booking target is ANOTHER person
 * (not the conversation patient), and we must never update the existing record.
 */
const FAMILY_KEYWORDS = [
  "mon fils", "ma fille", "ma femme", "mon mari",
  "ma mère", "mon père", "mon frère", "ma sœur",
  "mon enfant", "pour mon", "pour ma",
];

/**
 * Returns true when the message explicitly names a family relation.
 * Pure function — no DB access.
 */
function hasFamilyKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return FAMILY_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Detect if a message confirms the appointment is for SELF (not family).
 * Handles cases like "pour moi", "c'est pour moi", "c'est moi", "moi" (in target clarification context).
 */
function isSelfConfirmation(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const SELF_KEYWORDS = [
    "pour moi", "c'est pour moi", "c'est moi", "pour moi-même",
    "moi et", "c'est mon", "mon surnom", "c'est ma", "je suis",
    "c'est bien moi", "oui pour moi",
  ];
  return SELF_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Extract a HH:MM time string from a French patient message.
 * Handles formats: "10h", "10h30", "10:30", "10h00", "10", "9h", "14h30"
 * Returns "HH:MM" or null if no time found.
 */
function extractTimeFromMessage(text: string): string | null {
  const lower = text.toLowerCase().trim();
  // Format: 10h30, 9h00, 14h30
  const m1 = lower.match(/\b(\d{1,2})h(\d{2})\b/);
  if (m1) {
    const h = m1[1].padStart(2, "0");
    const min = m1[2];
    return `${h}:${min}`;
  }
  // Format: 10h, 9h, 14h (hour only, minutes = 00)
  const m2 = lower.match(/\b(\d{1,2})h\b/);
  if (m2) {
    const h = m2[1].padStart(2, "0");
    return `${h}:00`;
  }
  // Format: 10:30, 9:00
  const m3 = lower.match(/\b(\d{1,2}):(\d{2})\b/);
  if (m3) {
    const h = m3[1].padStart(2, "0");
    const min = m3[2];
    return `${h}:${min}`;
  }
  return null;
}

/**
 * Returns true when the current patient is still a placeholder
 * (auto-created from WhatsApp profile, no real identity yet).
 *
 * Detects:
 *  - Missing or "Patient" firstName
 *  - "WhatsApp" lastName
 *  - "lead" status (auto-created from WhatsApp, no confirmed identity)
 *  - Missing lastName (WhatsApp only gives a display name, no last name)
 *  - Display names with emojis (not a real civil identity)
 */
function isPlaceholderPatient(p: any): boolean {
  if (!p || !p.firstName || p.firstName === "Patient" || p.lastName === "WhatsApp") return true;
  // Status "lead" means auto-created from WhatsApp — not a confirmed identity
  if (p.status === "lead") return true;
  // No last name means identity is incomplete (WhatsApp only gives display name)
  if (!p.lastName) return true;
  // Emoji in first name suggests WhatsApp display name, not real civil identity
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/u;
  if (emojiRegex.test(p.firstName)) return true;
  return false;
}

/**
 * Phase 6.17.1 — Resolve the target patient for a booking.
 *
 * Priority:
 *  1. If targetInfo is absent → use the conversation patient as-is.
 *  2. If targetInfo names the SAME person as the conversation patient → use as-is.
 *  3. Otherwise: search the tenant DB for firstName+lastName (case-insensitive).
 *     - Found  → reuse existing record (NEVER create a duplicate)
 *     - Not found → create a new lead patient
 *
 * CRITICAL: the conversation patient is NEVER modified.
 *
 * @param tenantId         Tenant scope — never crossed
 * @param conversationPatient  The patient already linked to the conversation (may be placeholder)
 * @param targetInfo       Name provided for the booking target (may be null)
 * @returns { targetPatientId: string, targetFirstName: string, targetLanguage: string }
 */
async function resolveTargetPatient(
  tenantId: string,
  conversationPatient: any,
  targetInfo: { firstName: string; lastName: string } | null,
  contactWaId?: string
): Promise<{ targetPatientId: string; targetFirstName: string; targetLanguage: string }> {
  // No explicit target → booking is for the conversation patient
  if (!targetInfo || (!targetInfo.firstName && !targetInfo.lastName)) {
    return {
      targetPatientId: conversationPatient._id.toString(),
      targetFirstName: conversationPatient.firstName || "",
      targetLanguage: conversationPatient.language || "fr",
    };
  }

  // Same name as conversation patient (case-insensitive) → use existing record
  const sameName =
    targetInfo.firstName.toLowerCase() === (conversationPatient.firstName || "").toLowerCase() &&
    targetInfo.lastName.toLowerCase() === (conversationPatient.lastName || "").toLowerCase();

  if (sameName && !isPlaceholderPatient(conversationPatient)) {
    return {
      targetPatientId: conversationPatient._id.toString(),
      targetFirstName: conversationPatient.firstName,
      targetLanguage: conversationPatient.language || "fr",
    };
  }

  // Search tenant-scoped by exact name (case-insensitive)
  const existing = await Patient.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    firstName: { $regex: new RegExp(`^${targetInfo.firstName}$`, "i") },
    lastName: { $regex: new RegExp(`^${targetInfo.lastName}$`, "i") },
  })
    .select("_id firstName lastName language")
    .lean();

  if (existing) {
    console.log(`[AI Conversation] resolveTargetPatient: found existing patient ${existing._id} (${(existing as any).firstName} ${(existing as any).lastName})`);
    return {
      targetPatientId: (existing as any)._id.toString(),
      targetFirstName: (existing as any).firstName,
      targetLanguage: (existing as any).language || "fr",
    };
  }

  // Not found → create a new lead patient (tenant-scoped)
  // Use the caller's WhatsApp number so the family member is reachable via the same channel.
  // Fall back to a unique placeholder only if contactWaId is unavailable.
  const phone = contactWaId || `wa-family-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const created = await Patient.create({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    firstName: targetInfo.firstName,
    lastName: targetInfo.lastName,
    language: "fr",
    status: "lead",
    phone,
  });
  console.log(`[AI Conversation] resolveTargetPatient: created new patient ${created._id} (${targetInfo.firstName} ${targetInfo.lastName}) phone=${phone}`);
  return {
    targetPatientId: created._id.toString(),
    targetFirstName: targetInfo.firstName,
    targetLanguage: "fr",
  };
}

export class AIAutoBookingService {
  private aiService: AIService;
  private messagingProvider: IMessagingProvider;

  constructor(aiService?: AIService, messagingProvider?: IMessagingProvider) {
    this.aiService = aiService ?? new AIService(new OpenAICompatibleProvider());
    this.messagingProvider = messagingProvider ?? new MetaWhatsAppProvider();
  }

  /**
   * Process an inbound message for the full AI conversation flow.
   *
   * Called by communicationService.handleWebhook() after persisting the message.
   * All errors are caught internally — failure never propagates to the webhook.
   */
  async processInboundMessage(
    tenantId: string,
    conversationId: string,
    inboundWaId?: string
  ): Promise<void> {
    // ── Step 1: load conversation (tenant-scoped) ─────────────────────────────
    const conversation = await Conversation.findOne({
      _id: conversationId,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    }).lean();

    if (!conversation) {
      console.warn("[AI Conversation] Conversation not found.");
      return;
    }

    // A human has taken over this conversation → AI must stay silent.
    if (conversation.needsHuman === true) {
      console.log(
        "[AI Conversation] Conversation is under human takeover — skipping AI processing."
      );
      return;
    }

    // ── Step 1b: Resolve awaitingTargetConfirmation BEFORE calling AI ──────────
    // When we asked "C'est pour vous ou pour Yahya?", the patient may reply with:
    //   - "Pour yahya" → isForOther = true, proceed with family booking
    //   - "Pour moi" / "c'est moi" / "moi et amouna c'est mon surnom" → isForSelf = true, book for conversation patient
    if (conversation.pendingBookingIntent?.awaitingTargetConfirmation) {
      const latestMsg = await Message.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        conversationId: new mongoose.Types.ObjectId(conversationId),
        direction: "inbound",
      }).sort({ createdAt: -1 }).lean();

      const msgText = latestMsg?.content || "";
      const pendingIntent = conversation.pendingBookingIntent;

      // Detect self-confirmation ("c'est moi", "pour moi", "mon surnom", etc.)
      if (isSelfConfirmation(msgText) && !hasFamilyKeyword(msgText)) {
        console.log("[AI Conversation] Target clarification resolved → SELF. Booking for conversation patient.");
        await Conversation.findByIdAndUpdate(conversationId, { $unset: { pendingBookingIntent: 1 } });

        // Update patient name if they provided it in the context (e.g. "Emna Siala moi")
        const nameExtracted = extractPatientNameFromText(msgText) || pendingIntent.targetPatientInfo;
        if (nameExtracted?.firstName && conversation.patientId) {
          const currentPatient = await Patient.findById(conversation.patientId).lean();
          if (isPlaceholderPatient(currentPatient) || 
              (nameExtracted.firstName.toLowerCase() === pendingIntent.targetPatientInfo?.firstName?.toLowerCase() &&
               nameExtracted.lastName?.toLowerCase() === pendingIntent.targetPatientInfo?.lastName?.toLowerCase())) {
            await Patient.findByIdAndUpdate(conversation.patientId, {
              $set: {
                firstName: nameExtracted.firstName,
                lastName: nameExtracted.lastName || (currentPatient as any)?.lastName,
                status: "active"
              }
            });
            console.log(`[AI Conversation] Patient identity updated to: ${nameExtracted.firstName} ${nameExtracted.lastName}`);
          }
        }

        // Resume booking for self with the pending slot data
        const resumeResult: AISuggestionResult = {
          intent: "appointment_confirmation",
          suggestion: "",
          needsHumanEscalation: false,
          structured: false,
          action: {
            type: "book_appointment",
            targetId: conversation.patientId?.toString() ?? "self",
            reason: "Target confirmation resolved: booking for self",
            confidence: 1.0,
            booking: {
              date: pendingIntent.date,
              startTime: pendingIntent.startTime,
              durationMin: pendingIntent.durationMin,
              treatment: pendingIntent.treatment,
            }
          }
        };
        const freshConv = await Conversation.findOne({ _id: conversationId, tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
        if (freshConv) await this.handleBookingProposal(tenantId, conversationId, freshConv, resumeResult, inboundWaId);
        return;
      }
    }

    // ── Step 1c: BACKEND SLOT BYPASS (Reschedule & Booking) ───────────────────
    // If a pendingBookingContext exists and the patient's message matches one
    // of the proposed slots, execute the action DIRECTLY without calling the AI.
    // This eliminates the infinite confirmation loop entirely.
    const pendingCtx = conversation.pendingBookingContext;
    if (pendingCtx && pendingCtx.proposedSlots && pendingCtx.proposedSlots.length > 0) {
      const mode = pendingCtx.mode || "booking";
      const latestMsgForBypass = await Message.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        conversationId: new mongoose.Types.ObjectId(conversationId),
        direction: "inbound",
      }).sort({ createdAt: -1 }).lean();

      const bypassMsgText = latestMsgForBypass?.content || "";
      const extractedTime = extractTimeFromMessage(bypassMsgText);

      if (extractedTime) {
        const matchedSlot = pendingCtx.proposedSlots.find(
          (s: { startTime: string; endTime: string }) => s.startTime === extractedTime
        );

        if (matchedSlot) {
          console.log(`[AI Conversation] BACKEND BYPASS: ${mode} slot confirmed by patient: ${extractedTime} on ${pendingCtx.date}. Skipping AI call.`);

          if (mode === "reschedule") {
            const targetAppointmentId = (pendingCtx as any).targetAppointmentId;
            let treatmentForBypass = "Consultation générale";
            if (targetAppointmentId && mongoose.Types.ObjectId.isValid(targetAppointmentId)) {
              const apptForTreatment = await Appointment.findOne({ _id: targetAppointmentId, tenantId }).lean();
              if (apptForTreatment) treatmentForBypass = (apptForTreatment as any).treatment || treatmentForBypass;
            } else if (conversation.patientId) {
              const now = new Date().toISOString().slice(0, 10);
              const ownApptTreatment = await Appointment.findOne({
                tenantId: new mongoose.Types.ObjectId(tenantId),
                patientId: new mongoose.Types.ObjectId(conversation.patientId.toString()),
                date: { $gte: now },
                status: { $in: ["scheduled", "confirmed"] },
              }).sort({ date: 1, startTime: 1 }).lean();
              if (ownApptTreatment) treatmentForBypass = (ownApptTreatment as any).treatment || treatmentForBypass;
            }

            const bypassResult: AISuggestionResult = {
              intent: "appointment_change_request",
              suggestion: "",
              needsHumanEscalation: false,
              structured: false,
              action: {
                type: "reschedule_appointment",
                targetId: targetAppointmentId || "self",
                reason: "Backend bypass: patient confirmed slot from proposed list",
                confidence: 1.0,
                booking: {
                  date: pendingCtx.date,
                  startTime: matchedSlot.startTime,
                  durationMin: pendingCtx.durationMin || 30,
                  treatment: treatmentForBypass,
                },
              },
            };

            const freshConvForBypass = await Conversation.findOne({ _id: conversationId, tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
            if (freshConvForBypass) {
              const handled = await this.handleRescheduleProposal(tenantId, conversationId, freshConvForBypass, bypassResult);
              if (handled) return;
            }
          } else {
            // Mode = booking
            const bypassResult: AISuggestionResult = {
              intent: "appointment_confirmation",
              suggestion: "",
              needsHumanEscalation: false,
              structured: false,
              ...(pendingCtx.targetPatientInfo ? { patientInfo: pendingCtx.targetPatientInfo } : {}),
              action: {
                type: "book_appointment",
                targetId: "self",
                reason: "Backend bypass: patient confirmed slot from proposed list",
                confidence: 1.0,
                booking: {
                  date: pendingCtx.date,
                  startTime: matchedSlot.startTime,
                  durationMin: pendingCtx.durationMin || 30,
                  treatment: "Consultation générale", // Default for new bookings if unknown
                },
              },
            };

            const freshConvForBypass = await Conversation.findOne({ _id: conversationId, tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
            if (freshConvForBypass) {
              await this.handleBookingProposal(tenantId, conversationId, freshConvForBypass, bypassResult, inboundWaId);
              return;
            }
          }
        }
      }
    }

    // ── Step 2: call getSuggestion [pure read — no DB writes] ─────────────────
    let result: AISuggestionResult;
    try {
      result = await this.aiService.getSuggestion(tenantId, conversationId);
    } catch (err) {
      console.error(
        "[AI Conversation] getSuggestion failed:",
        (err as Error).message
      );
      return;
    }

    // ── Step 2a: Update Patient Profile if patientInfo was provided ────────────
    // IMPORTANT (Phase 6.17.1): Only update the conversation patient if the name
    // refers to the caller themselves, NOT to a family member.
    let pInfo = result.patientInfo;
    if (!pInfo?.firstName) {
      const latestInbound = await Message.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        conversationId: new mongoose.Types.ObjectId(conversationId),
        direction: "inbound",
      }).sort({ createdAt: -1 }).lean();
      if (latestInbound?.content) {
        const extracted = extractPatientNameFromText(latestInbound.content);
        if (extracted) pInfo = extracted;
      }
    }

    if (conversation.patientId && pInfo && (pInfo.firstName || pInfo.lastName)) {
      try {
        // Phase 6.17.1 guard: if latest message contains a family keyword, the name
        // belongs to another person — do NOT update the conversation patient.
        const latestMsgForGuard = await Message.findOne({
          tenantId: new mongoose.Types.ObjectId(tenantId),
          conversationId: new mongoose.Types.ObjectId(conversationId),
          direction: "inbound",
        }).sort({ createdAt: -1 }).lean();
        const messageIsForOther = latestMsgForGuard?.content
          ? hasFamilyKeyword(latestMsgForGuard.content)
          : false;

        // Also skip update if there is a pending booking intent with targetPatientInfo
        // (we're in the "resume after identity" flow — the name IS the caller's name)
        const isResumingBooking = !!conversation.pendingBookingIntent?.awaitingIdentity;

        if (!messageIsForOther || isResumingBooking) {
          const currentPatient = await Patient.findById(conversation.patientId).lean();
          const isPlaceholder = isPlaceholderPatient(currentPatient);

          // Only update if still a placeholder OR we are explicitly resuming after identity
          if (isPlaceholder || isResumingBooking) {
            const updateFields: any = { status: "active" };
            if (pInfo.firstName) updateFields.firstName = pInfo.firstName;
            if (pInfo.lastName) updateFields.lastName = pInfo.lastName;

            await Patient.findByIdAndUpdate(conversation.patientId, { $set: updateFields });
            console.log(`[AI Conversation] Updated patient profile for ${conversation.patientId}:`, updateFields);
          }
        }

        // Resume pending booking if we were waiting for identity and now have it
        const patientDoc = await Patient.findById(conversation.patientId).lean();
        const hasFullIdentity = (patientDoc as any).firstName && (patientDoc as any).firstName !== "Patient" && !!(patientDoc as any).lastName && (patientDoc as any).lastName !== "WhatsApp";

        if (hasFullIdentity && conversation.pendingBookingIntent?.awaitingIdentity) {
          console.log("[AI Conversation] Patient identity provided. Resuming pending booking.");
          const pendingIntent = conversation.pendingBookingIntent;

          // Clear the pending intent
          await Conversation.findByIdAndUpdate(conversationId, {
            $unset: { pendingBookingIntent: 1 }
          });

          // Construct synthetic result to resume booking — all guards (P0, availability, concurrency) will re-run
          // If pendingIntent had a targetPatientInfo, pass it via patientInfo so handleBookingProposal can resolve it
          const resumeResult: AISuggestionResult = {
            intent: "appointment_confirmation",
            suggestion: "",
            needsHumanEscalation: false,
            structured: false,
            ...(pendingIntent.targetPatientInfo ? { patientInfo: pendingIntent.targetPatientInfo } : {}),
            action: {
              type: "book_appointment",
              targetId: conversation.patientId.toString(),
              reason: "Reprise de la réservation après la fourniture de l'identité du patient",
              confidence: 1.0,
              booking: {
                date: pendingIntent.date,
                startTime: pendingIntent.startTime,
                durationMin: pendingIntent.durationMin,
                treatment: pendingIntent.treatment
              }
            }
          };

          // Delegate back to the orchestrator method so all guards (P0, avail, double-booking) run again
          await this.handleBookingProposal(tenantId, conversationId, conversation, resumeResult, inboundWaId);
          return; // Stop further processing of this message, booking is handled
        }
      } catch (err: any) {
        console.error("[AI Conversation] Failed to update patient profile:", err.message);
      }
    }

    // ── Step 2b: human escalation → send handoff reply, flag conversation, NO action ──
    if (result.needsHumanEscalation === true) {
      await this.sendConversationalReply(tenantId, conversationId, conversation, result, inboundWaId);
      await Conversation.findByIdAndUpdate(conversationId, {
        $set: { needsHuman: true },
      }).catch((err) =>
        console.error(
          "[AI Conversation] Failed to flag human escalation:",
          err.message
        )
      );
      return;
    }

    // ── Step 3a: if AI proposed slots, persist pendingBookingContext ─────────
    if (
      (result.intent === "appointment_availability" || result.intent === "appointment_change_request") &&
      result.proposedSlots &&
      result.proposedSlots.length > 0 &&
      result.scheduling?.date &&
      result.scheduling?.durationMin
    ) {
      const isRescheduleIntent = result.intent === "appointment_change_request";
      let pendingTargetAppointmentId: string | undefined;
      let pendingTargetPatientId: string | undefined;
      let pendingTargetPatientInfo: { firstName: string; lastName: string } | undefined;

      if (isRescheduleIntent) {
        // If AI already identified a targetId (appointmentId or patientId), store it
        if (result.action?.type === "reschedule_appointment" && result.action.targetId && result.action.targetId !== "self") {
          pendingTargetAppointmentId = result.action.targetId;
        } else if (conversation.patientId) {
          // Fallback: find the conversation patient's own upcoming appointment
          const now = new Date().toISOString().slice(0, 10);
          const ownAppt = await Appointment.findOne({
            tenantId: new mongoose.Types.ObjectId(tenantId),
            patientId: new mongoose.Types.ObjectId(conversation.patientId.toString()),
            date: { $gte: now },
            status: { $in: ["scheduled", "confirmed"] },
          }).sort({ date: 1, startTime: 1 }).lean();
          if (ownAppt) {
            pendingTargetAppointmentId = ownAppt._id.toString();
            pendingTargetPatientId = (ownAppt as any).patientId.toString();
          }
        }
      } else {
        // Booking mode: capture family member info if it was resolved
        if (conversation.pendingBookingIntent?.targetPatientInfo) {
          pendingTargetPatientInfo = conversation.pendingBookingIntent.targetPatientInfo;
        }
      }

      try {
        await Conversation.findByIdAndUpdate(conversationId, {
          $set: {
            pendingBookingContext: {
              date: result.scheduling.date,
              durationMin: result.scheduling.durationMin,
              proposedSlots: result.proposedSlots,
              proposedAt: new Date(),
              mode: isRescheduleIntent ? "reschedule" : "booking",
              ...(pendingTargetAppointmentId ? { targetAppointmentId: pendingTargetAppointmentId } : {}),
              ...(pendingTargetPatientId ? { targetPatientId: pendingTargetPatientId } : {}),
              ...(pendingTargetPatientInfo ? { targetPatientInfo: pendingTargetPatientInfo } : {}),
            },
          },
        });
      } catch (err) {
        console.error(
          "[AI Conversation] Failed to save pendingBookingContext:",
          (err as Error).message
        );
      }
    }

    // ── Step 3b: booking proposal → dedicated secure booking flow ─────────────
    if (result.action?.type === "book_appointment" && result.action.booking) {
      if (result.intent === "appointment_change_request") {
        await this.handleRescheduleProposal(tenantId, conversationId, conversation, result);
        return;
      }
      await this.handleBookingProposal(tenantId, conversationId, conversation, result, inboundWaId);
      return;
    }

    // ── Step 3c: reschedule proposal → dedicated secure rescheduling flow ─────
    if (result.action?.type === "reschedule_appointment" && result.action.booking) {
      await this.handleRescheduleProposal(tenantId, conversationId, conversation, result);
      return;
    }

    // ── Step 3d: confirm appointment proposal / reminder confirmation ─────────
    const latestInbound = await Message.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      conversationId: new mongoose.Types.ObjectId(conversationId),
      direction: "inbound",
    }).sort({ createdAt: -1 }).lean();

    const lowerMsg = (latestInbound?.content || "").trim().toLowerCase();
    const isConfirmationText =
      lowerMsg === "oui" ||
      lowerMsg === "oui confirmer" ||
      lowerMsg === "je confirme" ||
      lowerMsg === "confirmer" ||
      lowerMsg === "confirme" ||
      lowerMsg === "d'accord" ||
      lowerMsg === "daccord" ||
      lowerMsg === "c'est bon" ||
      lowerMsg === "\u0646\u0639\u0645" ||
      lowerMsg === "\u0646\u0624\u0643\u062f" ||
      lowerMsg === "\u0623\u0624\u0643\u062f";

    if (result.action?.type === "confirm_appointment" || isConfirmationText) {
      const handled = await this.handleConfirmAppointmentProposal(tenantId, conversationId, conversation, result, inboundWaId);
      if (handled) return;
    }

    // ── Step 4: general conversational reply (non-booking, non-escalation, or fallback) ────
    await this.sendConversationalReply(tenantId, conversationId, conversation, result, inboundWaId);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Booking flow
  // ────────────────────────────────────────────────────────────────────────────

  private async handleBookingProposal(
    tenantId: string,
    conversationId: string,
    conversation: any,
    result: AISuggestionResult,
    inboundWaId?: string
  ): Promise<boolean> {
    const rawBooking = result.action?.booking as {
      date: string;
      startTime: string;
      durationMin: number;
      treatment: string;
    };

    if (!rawBooking) return false;

    const conversationPatientId = conversation.patientId;
    if (!conversationPatientId) {
      console.warn("[AI Conversation] No patientId on conversation — cannot book.");
      return false;
    }

    const bookingDate = conversation.pendingBookingContext?.date || rawBooking.date || new Date().toISOString().slice(0, 10);
    const booking = {
      date: bookingDate,
      startTime: normalizeTime(rawBooking.startTime),
      durationMin: rawBooking.durationMin || 30,
      treatment: rawBooking.treatment,
    };

    // ── Load conversation patient (never modified) ──────────────────────────
    const conversationPatient = await Patient.findOne({
      _id: conversationPatientId,
      tenantId: new mongoose.Types.ObjectId(tenantId)
    }).select("firstName lastName language").lean();

    if (!conversationPatient) {
      console.warn("[AI Conversation] Conversation patient not found — cannot book.");
      return false;
    }

    // ── Phase 6.17.1 — Detect target patient (family or self) ──────────────
    //
    // Priority for targetInfo:
    //  1. From pendingBookingIntent (family member was already resolved in a prior turn)
    //  2. From result.action (AI passed explicit targetId ≠ "self")
    //  3. From result.patientInfo (AI extracted a name in this turn)
    //  → falls back to null (= booking for conversation patient)

    // Track whether targetInfo came from the pending intent or context (i.e. already resolved as "for other")
    const targetFromPendingIntent = !!(conversation.pendingBookingIntent?.targetPatientInfo || conversation.pendingBookingContext?.targetPatientInfo);

    let rawTargetInfo: { firstName: string; lastName: string } | null =
      conversation.pendingBookingIntent?.targetPatientInfo || conversation.pendingBookingContext?.targetPatientInfo || null;

    // If AI returned a non-self targetId that looks like a name, extract from patientInfo
    if (!rawTargetInfo && result.patientInfo?.firstName && result.patientInfo?.lastName) {
      rawTargetInfo = {
        firstName: result.patientInfo.firstName,
        lastName: result.patientInfo.lastName,
      };
    }

    // Detect family keyword in latest inbound message
    let isForOther = false;
    // If rawTargetInfo came from pendingIntent, it was already identified as "for another person"
    if (targetFromPendingIntent) {
      isForOther = true;
    } else {
      try {
        const latestMsg = await Message.findOne({
          tenantId: new mongoose.Types.ObjectId(tenantId),
          conversationId: new mongoose.Types.ObjectId(conversationId),
          direction: "inbound",
        }).sort({ createdAt: -1 }).lean();
        if (latestMsg?.content && hasFamilyKeyword(latestMsg.content)) {
          isForOther = true;
        }
      } catch (_) { /* non-fatal */ }
    }

    // If name given but no family keyword and conversation patient has a real identity
    // → ambiguous: ask for clarification (Scenario 5)
    // CRITICAL: If the system EXPLICITLY asked for the patient's name (awaitingIdentity),
    // the response IS their real identity — NEVER ask for target clarification.
    const wasAwaitingIdentity = !!conversation.pendingBookingIntent?.awaitingIdentity;

    if (
      rawTargetInfo &&
      !isForOther &&
      !wasAwaitingIdentity &&
      !isPlaceholderPatient(conversationPatient) &&
      !conversation.pendingBookingIntent?.targetPatientInfo // not already resolved
    ) {
      const cpFirst = (conversationPatient as any).firstName;
      const cpLast = (conversationPatient as any).lastName;
      const isSameName =
        rawTargetInfo.firstName.toLowerCase() === cpFirst?.toLowerCase() &&
        rawTargetInfo.lastName.toLowerCase() === cpLast?.toLowerCase();

      if (!isSameName) {
        // Ask for clarification — save pending intent with candidate targetPatientInfo
        console.log("[AI Conversation] Ambiguous target patient — requesting clarification.");
        await Conversation.findByIdAndUpdate(conversationId, {
          $set: {
            pendingBookingIntent: {
              date: booking.date,
              startTime: booking.startTime,
              durationMin: booking.durationMin,
              treatment: booking.treatment,
              awaitingIdentity: false,
              awaitingTargetConfirmation: true,
              targetPatientInfo: rawTargetInfo,
            }
          }
        });
        const clarificationResult = {
          ...result,
          suggestion: `Bien sûr. Souhaitez-vous que le rendez-vous soit pour vous (${cpFirst} ${cpLast}) ou pour ${rawTargetInfo.firstName} ${rawTargetInfo.lastName} ?`,
          action: undefined,
        };
        await this.sendConversationalReply(tenantId, conversationId, conversation, clarificationResult as any, inboundWaId);
        return true;
      }
    }

    // If the pending intent was awaiting target confirmation, rawTargetInfo is already set
    // and isForOther is implicitly true — resolve the target now.
    if (!isForOther && conversation.pendingBookingIntent?.awaitingTargetConfirmation) {
      isForOther = true;
    }

    // Resolve the actual target patient (never overwrites the conversation patient)
    const targetToResolve = isForOther ? rawTargetInfo : null;
    const { targetPatientId, targetFirstName, targetLanguage } = await resolveTargetPatient(
      tenantId,
      conversationPatient,
      targetToResolve,
      conversation.contactWaId  // pass caller's WA number so family patients are linked to real phone
    );

    // ── Phase 6.16 — Enforce identity before booking ────────────────────────
    // Check identity on the CONVERSATION patient (the one on the phone).
    // If the booking is for another person, we still need the caller's identity.
    if (isPlaceholderPatient(conversationPatient)) {
      console.log("[AI Conversation] Identity missing. Requesting identity before booking.");
      await Conversation.findByIdAndUpdate(conversationId, {
        $set: {
          pendingBookingIntent: {
            date: booking.date,
            startTime: booking.startTime,
            durationMin: booking.durationMin,
            treatment: booking.treatment,
            awaitingIdentity: true,
            ...(isForOther && rawTargetInfo ? { targetPatientInfo: rawTargetInfo } : {}),
          }
        }
      });
      const identityRequestResult = {
        ...result,
        suggestion: "Parfait. Pour créer votre dossier et confirmer le rendez-vous, pouvez-vous me donner votre nom et prénom, s'il vous plaît ?",
        action: undefined
      };
      await this.sendConversationalReply(tenantId, conversationId, conversation, identityRequestResult as any, inboundWaId);
      return true;
    }

    // ── Validate against pendingBookingContext proposedSlots or REAL availability ──
    if (
      conversation.pendingBookingContext?.proposedSlots &&
      conversation.pendingBookingContext.proposedSlots.length > 0 &&
      conversation.pendingBookingContext.date === booking.date
    ) {
      const isProposed = conversation.pendingBookingContext.proposedSlots.some(
        (s: any) => normalizeTime(s.startTime) === booking.startTime
      );
      if (!isProposed) {
        console.warn(
          `[AI Conversation] Attempted to book unproposed slot ${booking.startTime} on ${booking.date}. Verifying real availability.`
        );
        const realSlots = await availabilityService.getAvailableSlots({ tenantId, date: booking.date, durationMin: booking.durationMin });
        const isTrulyAvailable = !("error" in realSlots) && realSlots.slots && realSlots.slots.some(
          (s: { startTime: string; endTime: string }) => normalizeTime(s.startTime) === booking.startTime
        );
        
        if (!isTrulyAvailable) {
          console.warn(`[AI Conversation] Slot ${booking.startTime} is truly unavailable.`);
          return false;
        }
        console.log(`[AI Conversation] Slot ${booking.startTime} is actually available. Bypassing proposedSlots guard.`);
      }
    }

    // ── Idempotency check against TARGET patient ────────────────────────────
    let createdAppointment = await Appointment.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      patientId: new mongoose.Types.ObjectId(targetPatientId),
      date: booking.date,
      startTime: booking.startTime,
      status: { $in: ["scheduled", "confirmed"] }
    }).lean();

    let bookingSucceeded = false;
    if (createdAppointment) {
      console.log("[AI Conversation] Appointment already exists for this slot (idempotency). Reusing it.");
      bookingSucceeded = true;
    } else {
      try {
        // Security: if AI passed a specific targetId that is NOT "self" and NOT the
        // conversation patient, AND we didn't resolve it via family-name flow, pass
        // the original targetId through so the executor's tenant-isolation guard rejects it.
        const aiTargetId = result.action?.targetId || "self";
        const executorTargetId =
          aiTargetId !== "self" &&
          aiTargetId !== conversationPatientId.toString() &&
          !isForOther
            ? aiTargetId           // let executor reject this cross-patient attempt
            : targetPatientId;     // resolved family member or self

        await executeAIAction(tenantId, conversationId, {
          type: (result.action?.type as any) || "book_appointment",
          targetId: executorTargetId,
          booking,
        });
        bookingSucceeded = true;
      } catch (err: any) {
        if (err.message?.includes("Vous avez déjà un rendez-vous prévu")) {
          console.log("[AI Conversation] Active_Appointment_Exists — sending refusal message.");
          const refusalResult = { ...result, suggestion: err.message, action: undefined };
          await this.sendConversationalReply(tenantId, conversationId, conversation, refusalResult as any, inboundWaId);
          return true;
        }
        if (err.message?.includes("Le créneau n'est plus disponible") || err.message?.includes("SLOT_UNAVAILABLE")) {
          console.log("[AI Conversation] SLOT_UNAVAILABLE — sending refusal message.");
          const refusalResult = { ...result, reply: "Désolé, ce créneau vient tout juste d'être réservé par un autre patient. Souhaitez-vous que je vous propose d'autres horaires ?", suggestion: "Désolé, ce créneau vient tout juste d'être réservé par un autre patient. Souhaitez-vous que je vous propose d'autres horaires ?", action: undefined };
          await this.sendConversationalReply(tenantId, conversationId, conversation, refusalResult as any, inboundWaId);
          return true;
        }
        console.error("[AI Conversation] executeAIAction failed:", err.message);
        const fallbackResult = { ...result, reply: "Désolé, une erreur est survenue lors de l'enregistrement. Veuillez réessayer.", suggestion: "Désolé, une erreur est survenue lors de l'enregistrement. Veuillez réessayer.", action: undefined };
        await this.sendConversationalReply(tenantId, conversationId, conversation, fallbackResult as any, inboundWaId);
        return true;
      }
    }

    // ── Clear pendingBookingContext after successful booking ────────────────
    if (bookingSucceeded) {
      await Conversation.findByIdAndUpdate(conversationId, {
        $unset: { pendingBookingContext: 1, pendingBookingIntent: 1 },
      }).catch((err) =>
        console.error("[AI Conversation] Failed to clear pendingBookingContext:", err.message)
      );
    }

    // ── Reload appointment from DB (use TARGET patient) ─────────────────────
    if (!createdAppointment) {
      createdAppointment = await Appointment.findOne({
        tenantId,
        patientId: new mongoose.Types.ObjectId(targetPatientId),
        date: booking.date,
        startTime: booking.startTime,
        status: "scheduled",
      }).lean();
    }

    if (!createdAppointment) {
      console.error("[AI Conversation] Could not load appointment after creation.");
      return false;
    }

    const tenant = await Tenant.findById(tenantId).lean();
    if (!tenant) {
      console.error("[AI Conversation] Could not load tenant for confirmation.");
      return false;
    }

    const confirmationText = buildBookingConfirmationMessage(
      {
        date: createdAppointment.date,
        startTime: createdAppointment.startTime,
        endTime: createdAppointment.endTime,
        treatment: createdAppointment.treatment,
      },
      targetFirstName || "",
      targetLanguage
    );

    // ── Check WhatsApp confirmation idempotency ─────────────────────────────
    // Prevent sending duplicate confirmations for the same appointment.
    const deterministicWaMsgId = `auto-booking-confirm-${createdAppointment._id.toString()}`;
    const alreadySentMessage = await Message.findOne({
      providerMessageId: deterministicWaMsgId,
      status: { $ne: "failed" }
    });

    if (alreadySentMessage) {
      console.log("[AI Conversation] Confirmation already sent successfully. Skipping.");
      return true;
    }

    // ── Send WhatsApp confirmation ──────────────────────────────────────────
    let whatsappMsgId: string | undefined;
    try {
      const sendResult = await this.messagingProvider.sendMessage(
        { to: conversation.contactWaId, type: "text", content: confirmationText },
        tenant as any
      );
      whatsappMsgId = sendResult.providerMessageId;
    } catch (sendErr) {
      console.error(
        "[AI Conversation] WhatsApp send failed after successful booking:",
        (sendErr as Error).message
      );
      await Message.findOneAndUpdate(
        { providerMessageId: deterministicWaMsgId },
        {
          $set: {
            tenantId,
            conversationId,
            direction: "outbound",
            status: "failed",
            content: confirmationText,
            error: (sendErr as Error).message
          }
        },
        { upsert: true }
      ).catch((err) => console.error("[AI Conversation] Failed to persist failed message:", err.message));
      return true;
    }

    // ── Persist the outbound confirmation message ───────────────────────────
    await Message.findOneAndUpdate(
      { providerMessageId: deterministicWaMsgId },
      {
        $set: {
          tenantId,
          conversationId,
          direction: "outbound",
          status: "sent",
          content: confirmationText,
          error: null
        }
      },
      { upsert: true }
    ).catch((err) =>
      console.error("[AI Conversation] Failed to persist outbound message:", err.message)
    );

    return true;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Reschedule flow
  // ────────────────────────────────────────────────────────────────────────────

  private async handleRescheduleProposal(
    tenantId: string,
    conversationId: string,
    conversation: any,
    result: AISuggestionResult
  ): Promise<boolean> {
    const rawBooking = result.action?.booking as {
      date: string;
      startTime: string;
      durationMin: number;
      treatment: string;
    };

    if (!rawBooking) return false;

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

    let targetPatientId = patientId.toString();
    let targetLanguage = "fr";

    // The AI may pass either a patientId or an appointmentId as targetId.
    // We pass it through directly to executeAIAction which handles both cases.
    // For the confirmation message, we need the actual patient info.
    const executorTargetId = actionTarget || targetPatientId;

    // If actionTarget looks like a MongoDB ObjectId, check if it's an appointment
    // and resolve the patient from that appointment (for confirmation message).
    if (actionTarget && mongoose.Types.ObjectId.isValid(actionTarget)) {
      // Try as appointment ID first
      const { Appointment: ApptModel } = await import("../appointments/appointment.model");
      const linkedAppt = await ApptModel.findOne({ _id: actionTarget, tenantId }).lean();
      if (linkedAppt) {
        // It's an appointment ID — get the patient from the appointment
        targetPatientId = (linkedAppt as any).patientId.toString();
        const linkedPatient = await Patient.findOne({ _id: targetPatientId, tenantId }).lean();
        if (linkedPatient) {
          targetLanguage = (linkedPatient as any).language ?? "fr";
        }
      } else {
        // Try as patient ID
        const targetPatient = await Patient.findOne({ _id: actionTarget, tenantId }).lean();
        if (targetPatient) {
          targetPatientId = actionTarget;
          targetLanguage = (targetPatient as any).language ?? "fr";
        }
      }
    }

    let rescheduleSucceeded = false;
    try {
      await executeAIAction(tenantId, conversationId, {
        type: "reschedule_appointment",
        targetId: executorTargetId,
        booking,
      });
      rescheduleSucceeded = true;
    } catch (err: any) {
      if (err.message?.includes("Le créneau n'est plus disponible") || err.message?.includes("SLOT_UNAVAILABLE")) {
        console.log("[AI Conversation] SLOT_UNAVAILABLE during reschedule — sending refusal message.");
        const refusalResult = { ...result, reply: "Désolé, ce créneau vient tout juste d'être pris par un autre patient. Souhaitez-vous que je vous propose d'autres horaires ?", suggestion: "Désolé, ce créneau vient tout juste d'être pris par un autre patient. Souhaitez-vous que je vous propose d'autres horaires ?", action: undefined };
        await this.sendConversationalReply(tenantId, conversationId, conversation, refusalResult as any);
        return true;
      }
      console.error("[AI Conversation] Reschedule failed:", err.message);
      const fallbackResult = { ...result, reply: "Désolé, la modification du rendez-vous a échoué. Veuillez réessayer.", suggestion: "Désolé, la modification du rendez-vous a échoué. Veuillez réessayer.", action: undefined };
      await this.sendConversationalReply(tenantId, conversationId, conversation, fallbackResult as any);
      return true;
    }

    // Clear pendingBookingContext after successful rescheduling
    if (rescheduleSucceeded) {
      await Conversation.findByIdAndUpdate(conversationId, {
        $unset: { pendingBookingContext: 1 },
      }).catch((err) => console.error("[AI Conversation] Failed to clear pendingBookingContext:", err.message));
    }

    // Load updated appointment
    const updatedAppointment = await Appointment.findOne({
      tenantId,
      patientId: targetPatientId,
      date: booking.date,
      startTime: booking.startTime,
      status: { $in: ["scheduled", "confirmed"] }
    }).lean();

    if (!updatedAppointment) {
      console.error("[AI Conversation] Could not load updated appointment after rescheduling.");
      return false;
    }

    const [targetPatient, tenant] = await Promise.all([
      Patient.findOne({ _id: targetPatientId, tenantId }).select("firstName lastName language").lean(),
      Tenant.findById(tenantId).lean(),
    ]);

    if (!targetPatient || !tenant) {
      console.error("[AI Conversation] Could not load patient/tenant for reschedule confirmation.");
      return false;
    }

    const patientDisplayName = (targetPatient as any).firstName && (targetPatient as any).firstName !== "Patient"
      ? (targetPatient as any).firstName
      : "";

    const confirmationText = buildRescheduleConfirmationMessage(
      {
        date: updatedAppointment.date,
        startTime: updatedAppointment.startTime,
        endTime: updatedAppointment.endTime,
        treatment: updatedAppointment.treatment,
      },
      patientDisplayName,
      (targetPatient as any).language ?? "fr"
    );

    const deterministicWaMsgId = `auto-reschedule-confirm-${updatedAppointment._id.toString()}-${Date.now()}`;

    try {
      await this.messagingProvider.sendMessage(
        { to: conversation.contactWaId, type: "text", content: confirmationText },
        tenant as any
      );

      await Message.create({
        tenantId,
        conversationId,
        patientId,
        direction: "outbound",
        status: "sent",
        content: confirmationText,
        providerMessageId: deterministicWaMsgId,
      });
    } catch (sendErr: any) {
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
  private async sendConversationalReply(
    tenantId: string,
    conversationId: string,
    conversation: any,
    result: AISuggestionResult,
    inboundWaId?: string
  ): Promise<void> {
    if (!result.structured || !result.suggestion || !result.suggestion.trim()) {
      console.log(
        "[AI Conversation] No structured reply available — not auto-sending anything."
      );
      return;
    }

    const reply = result.suggestion.trim();

    // Determine the inbound message id that triggered this reply (for idempotency)
    let baseId = inboundWaId;
    if (!baseId || !baseId.trim()) {
      const latestInbound = await Message.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        conversationId: new mongoose.Types.ObjectId(conversationId),
        direction: "inbound",
      }).sort({ createdAt: -1 }).lean();
      baseId = latestInbound?.providerMessageId;
    }

    if (!baseId || !baseId.trim()) {
      console.warn(
        "[AI Conversation] Cannot determine inbound wamid — reply not sent."
      );
      return;
    }

    const deterministicId = `ai-reply-${baseId}`;

    // Idempotency: never send the same AI reply twice
    const alreadySent = await Message.findOne({
      providerMessageId: deterministicId,
      status: { $ne: "failed" },
    });
    if (alreadySent) {
      console.log("[AI Conversation] AI reply already sent. Skipping.");
      return;
    }

    const tenant = await Tenant.findById(tenantId).lean();
    if (!tenant) {
      console.error("[AI Conversation] Tenant not found for reply.");
      return;
    }

    const patientId = conversation.patientId;

    try {
      const sendResult = await this.messagingProvider.sendMessage(
        { to: conversation.contactWaId, type: "text", content: reply },
        tenant as any
      );

      await Message.findOneAndUpdate(
        { providerMessageId: deterministicId },
        {
          $set: {
            tenantId,
            conversationId,
            patientId,
            direction: "outbound",
            status: "sent",
            content: reply,
            error: null,
          },
        },
        { upsert: true }
      ).catch((err) =>
        console.error(
          "[AI Conversation] Failed to persist outbound reply:",
          err.message
        )
      );
    } catch (sendErr) {
      // WhatsApp send failure: persist as failed for later retry (same deterministic id)
      console.error(
        "[AI Conversation] WhatsApp send failed for AI reply:",
        (sendErr as Error).message
      );
      await Message.findOneAndUpdate(
        { providerMessageId: deterministicId },
        {
          $set: {
            tenantId,
            conversationId,
            patientId,
            direction: "outbound",
            status: "failed",
            content: reply,
            error: (sendErr as Error).message,
          },
        },
        { upsert: true }
      ).catch((err) =>
        console.error(
          "[AI Conversation] Failed to persist failed reply:",
          err.message
        )
      );
    }
  }

  /**
   * Handle confirmation of an existing upcoming appointment when the patient confirms.
   */
  private async handleConfirmAppointmentProposal(
    tenantId: string,
    conversationId: string,
    conversation: any,
    result: AISuggestionResult,
    inboundWaId?: string
  ): Promise<boolean> {
    const patientId = conversation.patientId;
    if (!patientId) return false;

    const today = new Date().toISOString().slice(0, 10);
    let appt = null;

    if (result.action?.targetId && mongoose.Types.ObjectId.isValid(result.action.targetId)) {
      appt = await Appointment.findOne({
        _id: new mongoose.Types.ObjectId(result.action.targetId),
        tenantId: new mongoose.Types.ObjectId(tenantId),
      });
    }

    if (!appt) {
      appt = await Appointment.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        patientId: new mongoose.Types.ObjectId(patientId.toString()),
        date: { $gte: today },
        status: { $in: ["scheduled", "confirmed"] },
      }).sort({ date: 1, startTime: 1 });
    }

    if (!appt) return false;

    // Update appointment status to confirmed in agenda
    appt.status = "confirmed";
    await appt.save();
    console.log(`[AI Conversation] Appointment ${appt._id} updated to CONFIRMED for ${appt.date} at ${appt.startTime}`);

    // Compose tailored confirmation reply
    let reply = result.suggestion;
    if (!reply || reply.includes("Je ne suis pas sûr") || !result.structured) {
      reply = `Parfait ! Votre rendez-vous du ${appt.date} à ${appt.startTime} est bien confirmé dans notre agenda. Nous vous attendons avec plaisir au cabinet !`;
    }

    await this.sendConversationalReply(
      tenantId,
      conversationId,
      conversation,
      { ...result, suggestion: reply, structured: true },
      inboundWaId
    );

    return true;
  }
}


// Singleton for production use (injectable in tests via constructor)
export const aiAutoBookingService = new AIAutoBookingService();