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

// ──────────────────────────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────────────────────────

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
   *
   * @param tenantId    - Resolved from phoneNumberId in webhook (never from payload body)
   * @param conversationId - The conversation the inbound message belongs to
   * @param inboundWaId - The inbound WhatsApp message id (wamid); used to build the
   *                      deterministic outbound reply id for idempotency.
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

    // ── Step 2: call getSuggestion [pure read — no DB writes] ─────────────────
    let result;
    try {
      result = await this.aiService.getSuggestion(tenantId, conversationId);
    } catch (err) {
      console.error(
        "[AI Conversation] getSuggestion failed:",
        (err as Error).message
      );
      return;
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
    // Triggered when intent = "appointment_availability" and Two-Pass returned
    // real slots from the availability service. This records what was genuinely
    // offered to the patient so we can verify later.
    if (
      result.intent === "appointment_availability" &&
      result.proposedSlots &&
      result.proposedSlots.length > 0 &&
      result.scheduling?.date &&
      result.scheduling?.durationMin
    ) {
      try {
        await Conversation.findByIdAndUpdate(conversationId, {
          $set: {
            pendingBookingContext: {
              date: result.scheduling.date,
              durationMin: result.scheduling.durationMin,
              proposedSlots: result.proposedSlots,
              proposedAt: new Date(),
            },
          },
        });
      } catch (err) {
        console.error(
          "[AI Conversation] Failed to save pendingBookingContext:",
          (err as Error).message
        );
        // Non-fatal: booking context is advisory
      }
    }

    // ── Step 3b: booking proposal → dedicated secure booking flow ─────────────
    if (result.action?.type === "book_appointment" && result.action.booking) {
      await this.handleBookingProposal(tenantId, conversationId, conversation, result);
      // The booking branch owns its own WhatsApp messaging:
      //  - success → deterministic confirmation built from the real Appointment
      //  - failure / refusal → NO WhatsApp at all (no false success)
      // The generic conversational reply is intentionally NOT sent here so it
      // never duplicates the confirmation nor appears to confirm a failed booking.
      return;
    }

    // ── Step 4: general conversational reply (non-booking, non-escalation) ────
    await this.sendConversationalReply(tenantId, conversationId, conversation, result, inboundWaId);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Booking flow — Phase 6.8/6.9 engine, extracted verbatim (no logic change)
  // ────────────────────────────────────────────────────────────────────────────

  private async handleBookingProposal(
    tenantId: string,
    conversationId: string,
    conversation: any,
    result: AISuggestionResult
  ): Promise<void> {
    const booking = result.action?.booking as {
      date: string;
      startTime: string;
      durationMin: number;
      treatment: string;
    };

    const patientId = conversation.patientId;
    if (!patientId) {
      console.warn("[AI Conversation] No patientId on conversation — cannot book or send confirmation.");
      return;
    }

    let createdAppointment = await Appointment.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      patientId: new mongoose.Types.ObjectId(patientId),
      date: booking.date,
      startTime: booking.startTime,
      status: { $in: ["scheduled", "confirmed"] }
    }).lean();

    let bookingSucceeded = false;
    if (createdAppointment) {
      console.log("[AI Conversation] Appointment already exists for this slot (idempotency). Reusing it.");
      bookingSucceeded = true;
    } else {
      // ── CRITICAL: validate proposed slot context ───────────────────────────────
      // The backend must verify that the slot being confirmed was genuinely proposed
      // to the patient in a previous response — NOT recalculated to fake a prior offer.
      if (!conversation.pendingBookingContext) {
        console.warn(
          "[AI Conversation] book_appointment received but no slot was ever proposed to this patient. Refusing."
        );
        return;
      }

      const ctx = conversation.pendingBookingContext;

      // Date must match the proposed context
      if (ctx.date !== booking.date) {
        console.warn(
          `[AI Conversation] Booking date '${booking.date}' does not match proposed context date '${ctx.date}'. Refusing.`
        );
        return;
      }

      // startTime must be one of the slots actually sent to the patient
      const slotWasProposed = ctx.proposedSlots.some(
        (s: { startTime: string }) => s.startTime === booking.startTime
      );
      if (!slotWasProposed) {
        console.warn(
          `[AI Conversation] Slot '${booking.startTime}' was not in the proposed slots. Refusing.`
        );
        return;
      }

      // ── Execute booking via validated executor ─────────────────────────────────
      const actionTarget = result.action?.targetId;
      if (!actionTarget) {
        console.warn("[AI Conversation] book_appointment received without a valid targetId. Refusing.");
        return;
      }
      try {
        await executeAIAction(tenantId, conversationId, {
          type: "book_appointment",
          targetId: actionTarget,
          booking,
        });
        bookingSucceeded = true;
      } catch (err) {
        console.error(
          "[AI Conversation] executeAIAction failed:",
          (err as Error).message
        );
        // Booking failed — do NOT send WhatsApp, do NOT clear context
        return;
      }
    }

    // ── Clear pendingBookingContext after successful booking ───────────────────
    if (bookingSucceeded) {
      await Conversation.findByIdAndUpdate(conversationId, {
        $unset: { pendingBookingContext: 1 },
      }).catch((err) =>
        console.error(
          "[AI Conversation] Failed to clear pendingBookingContext:",
          err.message
        )
      );
    }

    // ── Generate WhatsApp confirmation from REAL appointment data ─────────────
    // Reload appointment if we just created it
    if (!createdAppointment) {
      createdAppointment = await Appointment.findOne({
        tenantId,
        patientId,
        date: booking.date,
        startTime: booking.startTime,
        status: "scheduled",
      }).lean();
    }

    if (!createdAppointment) {
      console.error(
        "[AI Conversation] Could not load appointment after creation."
      );
      return;
    }

    const [patient, tenant] = await Promise.all([
      Patient.findOne({ _id: patientId, tenantId })
        .select("firstName language")
        .lean(),
      Tenant.findById(tenantId).lean(),
    ]);

    if (!patient || !tenant) {
      console.error(
        "[AI Conversation] Could not load patient/tenant for confirmation."
      );
      return;
    }

    const confirmationText = buildBookingConfirmationMessage(
      {
        date: createdAppointment.date,
        startTime: createdAppointment.startTime,
        endTime: createdAppointment.endTime,
        treatment: createdAppointment.treatment,
      },
      (patient as any).firstName ?? "Patient",
      (patient as any).language ?? "fr"
    );

    // ── Check WhatsApp confirmation idempotency ─────────────────────────────────
    // Prevent sending duplicate confirmations for the same appointment.
    const deterministicWaMsgId = `auto-booking-confirm-${createdAppointment._id.toString()}`;
    const alreadySentMessage = await Message.findOne({
      providerMessageId: deterministicWaMsgId,
      status: { $ne: "failed" }
    });

    if (alreadySentMessage) {
      console.log("[AI Conversation] Confirmation already sent successfully. Skipping.");
      return;
    }

    // ── Send WhatsApp confirmation ─────────────────────────────────────────────
    let whatsappMsgId: string | undefined;
    try {
      const sendResult = await this.messagingProvider.sendMessage(
        { to: conversation.contactWaId, type: "text", content: confirmationText },
        tenant as any
      );
      whatsappMsgId = sendResult.providerMessageId;
    } catch (sendErr) {
      // WhatsApp send failure is non-fatal: the appointment WAS created successfully.
      // Log but do not undo the booking. We flag the message as "failed" for retries.
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
            patientId,
            direction: "outbound",
            status: "failed",
            content: confirmationText,
            error: (sendErr as Error).message
          }
        },
        { upsert: true }
      ).catch((err) => console.error("[AI Conversation] Failed to persist failed message:", err.message));
      return;
    }

    // ── Persist the outbound confirmation message ──────────────────────────────
    await Message.findOneAndUpdate(
      { providerMessageId: deterministicWaMsgId },
      {
        $set: {
          tenantId,
          conversationId,
          patientId,
          direction: "outbound",
          status: "sent",
          content: confirmationText,
          error: null
        }
      },
      { upsert: true }
    ).catch((err) =>
      console.error(
        "[AI Conversation] Failed to persist outbound message:",
        err.message
      )
    );
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
}

// Singleton for production use (injectable in tests via constructor)
export const aiAutoBookingService = new AIAutoBookingService();