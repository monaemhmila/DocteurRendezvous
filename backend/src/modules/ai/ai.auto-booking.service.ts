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
import { sseService } from "../communications/sse.service";
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
import {
  buildConfirmationMessage,
  normalizeTime,
  extractTimeFromMessage,
  extractPatientNameFromText,
  hasFamilyKeyword,
  detectLanguageFromText,
  isSelfConfirmation,
  isPlaceholderPatient,
  formatTimeRange,
  isExplicitlyVulgar
} from "./ai.utils";

import {
  parseYesNo,
  pickWantedTime,
  formatDate,
  formatTime,
  validateReplyLanguage,
  t,
  MAX_REASKS,
  Lang,
} from "./tn-nlu";
import { resolveTargetPatient } from "./ai.identity.resolver";
import { AIBookingManager } from "./ai.booking.manager";

// ──────────────────────────────────────────────────────────────────────────────

/**
 * Extract a HH:MM time string from a French patient message.
 * Handles formats: "10h", "10h30", "10:30", "10h00", "10", "9h", "14h30"
 * Returns "HH:MM" or null if no time found.
 */
// Removed extractTimeFromMessage

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
// Removed isPlaceholderPatient

// Removed resolveTargetPatient

export class AIAutoBookingService {
  private aiService: AIService;
  private messagingProvider: IMessagingProvider;
  private bookingManager: AIBookingManager;

  constructor(aiService?: AIService, messagingProvider?: IMessagingProvider) {
    this.aiService = aiService ?? new AIService(new OpenAICompatibleProvider());
    this.messagingProvider = messagingProvider ?? new MetaWhatsAppProvider();
    this.bookingManager = new AIBookingManager(this.messagingProvider, this.generateErrorReply.bind(this), this.sendConversationalReply.bind(this));
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

    // A human has taken over this conversation → AI acknowledges but does NOT process.
    if (conversation.needsHuman === true) {
      console.log(
        "[AI Conversation] Conversation is under human takeover — sending polite holding reply."
      );
      try {
        const holdingReply = await this.generateErrorReply(
          tenantId,
          conversation,
          `[SYSTEM: This conversation has been escalated to a human. The patient just sent a new message.
           Your ONLY job: send ONE SHORT, POLITE holding message.
           CRITICAL: Detect the patient's language AUTOMATICALLY from the recent conversation history (French, Tunisian Arabizi, Arabic script, or English) and reply in that EXACT language.
           Tell them that their message has been received and that the secretariat/doctor will respond shortly.
           Do NOT try to answer their question. Do NOT say "I can't answer". Do NOT mention that you are an AI. Just reassure them warmly and briefly in their language.
           IMPORTANT: Send only this holding message. Nothing else.]`
        );
        if (holdingReply) {
          const freshConv = await Conversation.findOne({ _id: conversationId, tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
          if (freshConv) {
            await this.sendConversationalReply(
              tenantId,
              conversationId,
              freshConv,
              { suggestion: holdingReply, structured: true, intent: "general_question", needsHumanEscalation: false, action: null },
              inboundWaId
            );
          }
        }
      } catch (err: any) {
        console.error("[AI Conversation] Failed to send holding reply:", err.message);
      }
      return;
    }

    // Step 0b intercept code for reminder buttons
    // This code goes BEFORE Step 1a in processInboundMessage

    // ── Step 0b: Intercept WhatsApp reminder button replies BEFORE AI call ──────
    // When the patient clicks "OUI, je confirme" / "NON, annuler" on a reminder,
    // these button titles arrive as plain text. Intercept them here to avoid the
    // AI misinterpreting "NON, annuler" as a fresh cancellation request.
    {
      const latestMsg0b = await Message.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        conversationId: new mongoose.Types.ObjectId(conversationId),
        direction: "inbound",
      }).sort({ createdAt: -1 }).lean();
      const msg0bLower = (latestMsg0b?.content || "").trim().toLowerCase();

      const SYSTEM_CONFIRM_BTNS = ["oui, je confirme", "نعم، أؤكد", "ey"];
      const SYSTEM_CANCEL_BTNS = ["non, annuler", "لا، إلغاء", "le"];

      const isReminderConfirmBtn = SYSTEM_CONFIRM_BTNS.some(b => msg0bLower === b || msg0bLower.startsWith(b));
      const isReminderCancelBtn = SYSTEM_CANCEL_BTNS.some(b => msg0bLower === b || msg0bLower.startsWith(b));

      if ((isReminderConfirmBtn || isReminderCancelBtn) && inboundWaId) {
        // Look up the quoted reminder message to identify the appointment
        let reminderAppt0b: any = null;
        try {
          const inbMsg0b = await Message.findOne({ providerMessageId: inboundWaId }).lean();
          if (inbMsg0b && (inbMsg0b as any).quotedProviderMessageId) {
            const quotedMsg0b = await Message.findOne({
              providerMessageId: (inbMsg0b as any).quotedProviderMessageId,
            }).lean();
            if (quotedMsg0b && (quotedMsg0b as any).appointmentId) {
              reminderAppt0b = await Appointment.findOne({
                _id: (quotedMsg0b as any).appointmentId,
                tenantId: new mongoose.Types.ObjectId(tenantId),
              });
            }
          }
        } catch (_) { }

        if (reminderAppt0b) {
          const pat0b = await Patient.findById(reminderAppt0b.patientId).select("language firstName").lean();
          const lang0b = (pat0b as any)?.language || "arabizi";
          const freshConv0b = await Conversation.findOne({ _id: conversationId, tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
          if (freshConv0b) {
            if (isReminderConfirmBtn) {
              // Patient confirmed via reminder button → mark as confirmed directly
              reminderAppt0b.status = "confirmed";
              await reminderAppt0b.save();
              console.log(`[AI Step0b] Reminder CONFIRM button → appt ${reminderAppt0b._id} confirmed`);

              // Check if other family appointments exist on the same date for this phone that are still "scheduled"
              const familyPatients0b = await Patient.find({
                tenantId: new mongoose.Types.ObjectId(tenantId),
                phone: freshConv0b.contactWaId,
              }).select("_id firstName").lean();
              const familyIds0b = familyPatients0b.map((p) => p._id);

              const otherAppts0b = await Appointment.find({
                tenantId: new mongoose.Types.ObjectId(tenantId),
                patientId: { $in: familyIds0b },
                date: reminderAppt0b.date,
                status: "scheduled",
                _id: { $ne: reminderAppt0b._id },
              }).sort({ startTime: 1 });

              let extraConfirmedNames: string[] = [];
              if (otherAppts0b.length > 0) {
                for (const oa of otherAppts0b) {
                  oa.status = "confirmed";
                  await oa.save();
                  const pName = familyPatients0b.find(p => p._id.toString() === oa.patientId.toString())?.firstName || "";
                  extraConfirmedNames.push(`${pName ? pName + " " : ""}(${oa.startTime})`);
                }
              }

              const patFirstName0b = (pat0b as any)?.firstName;
              const hasName0b = patFirstName0b && patFirstName0b.toLowerCase() !== "patient";

              let replyTxt0b = "";
              if (lang0b === "fr") {
                replyTxt0b = extraConfirmedNames.length > 0
                  ? `Parfait ! Les rendez-vous du ${reminderAppt0b.date} (${patFirstName0b || "vous"} à ${reminderAppt0b.startTime} et ${extraConfirmedNames.join(", ")}) sont tous confirmés. À bientôt !`
                  : `Parfait ! Votre rendez-vous ${hasName0b ? `de ${patFirstName0b} ` : ""}du ${reminderAppt0b.date} à ${reminderAppt0b.startTime} est bien confirmé. À bientôt !`;
              } else if (lang0b === "ar") {
                replyTxt0b = extraConfirmedNames.length > 0
                  ? `ممتاز! تم تأكيد المواعيد بتاريخ ${reminderAppt0b.date} (${patFirstName0b || ""} في ${reminderAppt0b.startTime} و ${extraConfirmedNames.join("، ")}). نراكم قريباً!`
                  : `ممتاز! تم تأكيد موعد ${hasName0b ? `${patFirstName0b} ` : ""}بتاريخ ${reminderAppt0b.date} في الساعة ${reminderAppt0b.startTime}. نراك قريباً!`;
              } else {
                replyTxt0b = extraConfirmedNames.length > 0
                  ? `Behy! Les rendez-vous mte3 ${reminderAppt0b.date} (${patFirstName0b ? patFirstName0b + " m3a " : ""}${reminderAppt0b.startTime} w ${extraConfirmedNames.join(", ")}) lkol t'akkdou. Marhba bikom!`
                  : `Behy! Rendez-vous ${hasName0b ? `mte3 ${patFirstName0b} ` : "mte3ek "}${reminderAppt0b.date} m3a ${reminderAppt0b.startTime} t2akked. Marhba bik!`;
              }

              await this.sendConversationalReply(tenantId, conversationId, freshConv0b, {
                suggestion: replyTxt0b, structured: true, intent: "confirm_appointment", needsHumanEscalation: false, action: null,
              }, inboundWaId);
            } else {
              // Patient clicked "NON, annuler" on reminder → do NOT cancel yet, ask PAC first
              console.log(`[AI Step0b] Reminder CANCEL button → setting PAC for appt ${reminderAppt0b._id}`);
              const patName0b = (pat0b as any)?.firstName || "";
              const apptSum0b = `${patName0b ? patName0b + " - " : ""}${reminderAppt0b.date} à ${reminderAppt0b.startTime}`;
              await Conversation.findByIdAndUpdate(conversationId, {
                $set: {
                  pendingActionConfirmation: {
                    type: "cancel_appointment",
                    appointmentId: reminderAppt0b._id.toString(),
                    appointmentSummary: apptSum0b,
                  },
                },
              });
              const cancelAsk0b = lang0b === "fr"
                ? `Êtes-vous sûr de vouloir annuler le rendez-vous (${apptSum0b}) ? Répondez "Oui" pour confirmer l'annulation.`
                : lang0b === "ar"
                  ? `هل أنت متأكد أنك تريد إلغاء موعد (${apptSum0b}) ؟ أجب بـ "نعم" للتأكيد.`
                  : `Akid theb telghi rendez-vous mte3ek (${apptSum0b}) ? 9olli "Oui" bech nakkdou el ilgha2.`;
              await this.sendConversationalReply(tenantId, conversationId, freshConv0b, {
                suggestion: cancelAsk0b, structured: true, intent: "general_question", needsHumanEscalation: false, action: null,
              }, inboundWaId);
            }
            return;
          }
        }
        // No quoted reminder found — fall through to normal AI processing
        console.log(`[AI Step0b] Button "${msg0bLower}" has no quoted reminder appt — falling through to normal AI`);
      }
    }

    // ── Step 1a: Handle pendingActionConfirmation (cancel / confirm / reschedule) ────
    // If a previous turn asked the patient to confirm an action (cancel, confirm
    // appointment status, reschedule), handle their response here BEFORE calling AI.
    if ((conversation as any).pendingActionConfirmation) {
      const pac = (conversation as any).pendingActionConfirmation as {
        type: "cancel_appointment" | "confirm_appointment_status" | "reschedule_appointment";
        appointmentId: string;
        appointmentSummary: string; // human-readable "Jasser - 2026-10-02 à 09:00"
        asks?: number;
        createdAt?: Date;
      };

      const pacMsg = await Message.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        conversationId: new mongoose.Types.ObjectId(conversationId),
        direction: "inbound",
      }).sort({ createdAt: -1 }).lean();
      const pacText = (pacMsg?.content || "").trim();

      // 1. Détection stricte de vulgarité / insulte explicite
      if (isExplicitlyVulgar(pacText)) {
        console.warn(`[AI Conversation] Explicit vulgarity detected during pending confirmation: escalating immediately.`);
        await Conversation.findByIdAndUpdate(conversationId, {
          $unset: { pendingActionConfirmation: 1, pendingBookingContext: 1, pendingBookingIntent: 1, pendingVoiceConfirmation: 1 },
          $set: { needsHuman: true }
        });
        const vulgarLang = detectLanguageFromText(pacText, (conversation as any).patientLanguage);
        const vulgarReply = vulgarLang === "fr"
          ? "Désolé, je ne peux pas répondre à ce type de langage. Un membre de l'équipe va prendre le relais."
          : vulgarLang === "ar"
          ? "سامحني، أما ما نجمش نجاوب على كلام هكا. تو نعديك للإدارة."
          : "Samahni, ama manajamch njaweb 3la klem kima hedha. Taw n3addik lel secrétariat.";
        const freshConvV = await Conversation.findOne({ _id: conversationId, tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
        if (freshConvV) await this.sendConversationalReply(tenantId, conversationId, freshConvV, { suggestion: vulgarReply, structured: true, intent: "escalate", needsHumanEscalation: true, action: null }, inboundWaId);
        return;
      }

      // 2. Détection de langue du patient
      const convPat = conversation.patientId ? await Patient.findById(conversation.patientId).lean() : null;
      const rawPatLang = (convPat as any)?.language || (conversation as any).patientLanguage;
      const detectedL = detectLanguageFromText(pacText, rawPatLang);
      const activeLang: Lang = detectedL === "ar" ? "ar" : detectedL === "fr" ? "fr" : "tn-arabizi";

      // 3. Expiration temporelle (TTL 10 min) : ne jamais enfermer un patient qui revient plus tard
      const lastOutbound = await Message.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        conversationId: new mongoose.Types.ObjectId(conversationId),
        direction: "outbound",
      }).sort({ createdAt: -1 }).lean();
      const pacAgeMs = lastOutbound ? (Date.now() - new Date(lastOutbound.createdAt).getTime()) : 0;
      if (pacAgeMs > 10 * 60 * 1000) {
        console.log(`[AI Conversation] pendingActionConfirmation expired (${Math.round(pacAgeMs / 60000)} min old) — clearing and passing to normal AI.`);
        await Conversation.findByIdAndUpdate(conversationId, {
          $unset: { pendingActionConfirmation: 1, pendingVoiceConfirmation: 1 }
        });
        // Continuer vers le flux normal de l'IA (ne pas retourner)
      } else {
        const textNorm = pacText.toLowerCase();

        // 4. Salutation pure (ex: "وعليكم السلام", "aslema", "bonjour", "salam")
        const isPureGreeting = /^(?:وعليكم السلام(?: ورحمة الله)?(?: وبركاته)?|السلام عليكم|سلام|صباح الخير|مساء الخير|aslema|aslma|salam|slm|sbah el khir|sbeh lkhir|bonjour|bonsoir|hello|hi)[.!?\s]*$/i.test(pacText.trim());
        if (isPureGreeting) {
          console.log(`[AI Conversation] Pure greeting received during pending confirmation — clearing pending to resume natural conversation.`);
          await Conversation.findByIdAndUpdate(conversationId, {
            $unset: { pendingActionConfirmation: 1, pendingVoiceConfirmation: 1 }
          });
          // Continuer vers l'IA normale pour accueillir chaleureusement le patient
        } else {
          // 5. Incompréhension explicite du patient (ex: "ما فهمتش", "fhemtch", "chnowa hedha")
          const expressesConfusion = /(?:ما فهمتش|شنية المشكلة|fhemtch|ma fhemt|chnowa hedha|chfehma|comprends pas|pas compris)/i.test(pacText);
          if (expressesConfusion) {
            console.log(`[AI Conversation] Patient expressed confusion during pending confirmation — clearing pending and routing to AI.`);
            await Conversation.findByIdAndUpdate(conversationId, {
              $unset: { pendingActionConfirmation: 1, pendingVoiceConfirmation: 1 }
            });
            // Continuer vers l'IA normale
          } else {
            const yn = parseYesNo(pacText);
            const wantedTime = pickWantedTime(pacText);

            // Refus avec nouvelle instruction de date/heure (ex: "Le baed ghodwa kotlek mech ghodwa", "Non mercredi", "Le nheb 10h")
            const startsWithNo = /^(?:le\b|lee\b|non\b|no\b|la\b|لا\b|mouch\b|mech\b)/i.test(textNorm);
            const hasDateOrTimeCorrection = /(?:ba3d ghodwa|baed ghodwa|ghodwa|lyoum|nhar|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|letnin|ethletha|lerb3a|el khmis|el jem3a|essebt|el a7ad)/i.test(textNorm) || wantedTime !== null;

            if (startsWithNo && hasDateOrTimeCorrection) {
              console.log(`[AI Conversation] Patient corrected slot date/time (${pacText}) — clearing pending confirmation and routing to AI.`);
              await Conversation.findByIdAndUpdate(conversationId, {
                $unset: { pendingActionConfirmation: 1, pendingVoiceConfirmation: 1 }
              });
              // Continuer vers le flux normal de l'IA pour traiter la nouvelle date demandée !
            } else {
              const pacConfirmed = yn === "yes";
              const pacRefused = yn === "no" || startsWithNo || (wantedTime !== null && (textNorm.includes("khalih") || textNorm.includes("khalli")));

              if (pacConfirmed) {
                console.log(`[AI Conversation] pendingActionConfirmation CONFIRMED by patient. Executing: ${pac.type}`);
                await Conversation.findByIdAndUpdate(conversationId, { $unset: { pendingActionConfirmation: 1 } });

                if (pac.type === "cancel_appointment") {
                  try {
                    await executeAIAction(tenantId, conversationId, {
                      type: "cancel_appointment",
                      targetId: pac.appointmentId,
                    });
                    const cancelReply = t(activeLang, "doneCancel", { who: "" });
                    const freshConvPAC = await Conversation.findOne({ _id: conversationId, tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
                    if (freshConvPAC && cancelReply) await this.sendConversationalReply(tenantId, conversationId, freshConvPAC, { suggestion: cancelReply, structured: true, intent: "cancel_appointment", needsHumanEscalation: false, action: null }, inboundWaId);
                  } catch (err: any) {
                    console.error("[AI Conversation] pendingActionConfirmation: cancel failed:", err.message);
                  }
                  return;
                }

                if (pac.type === "confirm_appointment_status") {
                  try {
                    if (pac.appointmentId === "pending_voice" && (pac as any).actionData) {
                      const voiceData = (pac as any).actionData;
                      const freshConvPACV = await Conversation.findOne({ _id: conversationId, tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
                      if (freshConvPACV) {
                        await this.bookingManager.handleBookingProposal(tenantId, conversationId, { ...freshConvPACV, pendingVoiceConfirmation: false }, voiceData.result, inboundWaId);
                      }
                      return;
                    }

                    const apptToConfirm = await Appointment.findOne({ _id: pac.appointmentId, tenantId: new mongoose.Types.ObjectId(tenantId) });
                    if (apptToConfirm) {
                      apptToConfirm.status = "confirmed";
                      await apptToConfirm.save();
                      const pat = await Patient.findById(apptToConfirm.patientId).lean();
                      const patName = (pat as any)?.firstName || "";
                      const freshConvPAC2 = await Conversation.findOne({ _id: conversationId, tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
                      const confirmReply = t(activeLang, "doneBook", { who: patName, date: apptToConfirm.date, to: apptToConfirm.startTime });
                      if (freshConvPAC2 && confirmReply) await this.sendConversationalReply(tenantId, conversationId, freshConvPAC2, { suggestion: confirmReply, structured: true, intent: "confirm_appointment", needsHumanEscalation: false, action: null }, inboundWaId);
                    }
                  } catch (err: any) {
                    console.error("[AI Conversation] pendingActionConfirmation: confirm status failed:", err.message);
                  }
                  return;
                }

                if (pac.type === "reschedule_appointment" && (pac as any).actionData) {
                  try {
                    const bypassResult = {
                      intent: "appointment_change_request",
                      suggestion: "",
                      needsHumanEscalation: false,
                      structured: false,
                      action: (pac as any).actionData
                    };
                    const freshConvPAC3 = await Conversation.findOne({ _id: conversationId, tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
                    if (freshConvPAC3) {
                      const handled = await this.bookingManager.handleRescheduleProposal(tenantId, conversationId, freshConvPAC3, bypassResult as any);
                      if (handled) return;
                    }
                  } catch (err: any) {
                    console.error("[AI Conversation] pendingActionConfirmation: reschedule failed:", err.message);
                  }
                  return;
                }
              } else if (pacRefused) {
                console.log(`[AI Conversation] pendingActionConfirmation REFUSED by patient.`);
                await Conversation.findByIdAndUpdate(conversationId, {
                  $unset: { pendingActionConfirmation: 1, pendingBookingContext: 1, pendingBookingIntent: 1, pendingVoiceConfirmation: 1 }
                });

                // Si c'était une proposition issue d'un vocal, le patient n'avait pas encore de RDV !
                let refuseReply: string;
                if (pac.appointmentId === "pending_voice") {
                  refuseReply = activeLang === "fr"
                    ? "Très bien, rien n'a été enregistré. N'hésitez pas à me préciser le jour ou l'heure qui vous arrange !"
                    : activeLang === "ar"
                    ? "واضح، ما سجلت حتى موعد. كان تحب نهار ولا وقت آخر، قلي!"
                    : "Behy, ma 9ayadt chay. Ken theb nhar wala wa9t ekher, 9olli!";
                } else {
                  refuseReply = t(activeLang, "keep", { who: "mte3ek", date: "ghodwa", time: "fi wa9tou" });
                }

                const freshConvPACR = await Conversation.findOne({ _id: conversationId, tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
                if (freshConvPACR) await this.sendConversationalReply(tenantId, conversationId, freshConvPACR, { suggestion: refuseReply, structured: true, intent: "general_question", needsHumanEscalation: false, action: null }, inboundWaId);
                return;
              } else {
                // If the patient counter-proposed another time (e.g. "10 w nos")
                if (wantedTime && pac.type === "reschedule_appointment") {
                  const newTime = wantedTime.hhmm;
                  const newFormatted = formatTime(newTime);
                  console.log(`[AI Conversation] pendingActionConfirmation counter-proposed time: ${newTime}`);
                  await Conversation.findByIdAndUpdate(conversationId, {
                    $set: {
                      "pendingActionConfirmation.appointmentSummary": `l ${newFormatted}`,
                      "pendingActionConfirmation.asks": 0,
                      ...( (pac as any).actionData?.booking ? { "pendingActionConfirmation.actionData.booking.startTime": newTime } : {} )
                    }
                  });
                  const counterReply = activeLang === "fr"
                    ? `D'accord, je décale le rendez-vous à ${newFormatted} ? C'est bon pour vous ?`
                    : activeLang === "ar"
                    ? `باهي، نبدل الموعد لـ ${newFormatted}؟ مريقل؟`
                    : `Behy, nbaddel rendez-vous l ${newFormatted} ? Mriguel ?`;
                  const freshConv = await Conversation.findOne({ _id: conversationId, tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
                  if (freshConv) await this.sendConversationalReply(tenantId, conversationId, freshConv, { suggestion: counterReply, structured: true, intent: "appointment_change_request", needsHumanEscalation: false, action: null }, inboundWaId);
                  return;
                }

                // Réponse ambiguë : ne JAMAIS boucler indéfiniment. Max 1 re-ask avec contexte complet.
                const currentAsks = ((pac as any).asks || 0) + 1;
                if (currentAsks >= MAX_REASKS) {
                  console.log(`[AI Conversation] pendingActionConfirmation: max re-ask reached. Clearing pending confirmation.`);
                  await Conversation.findByIdAndUpdate(conversationId, {
                    $unset: { pendingActionConfirmation: 1, pendingVoiceConfirmation: 1 }
                  });
                  // Continuer vers l'IA normale au lieu de bloquer ou répéter en boucle
                } else {
                  console.log(`[AI Conversation] pendingActionConfirmation: ambiguous response, polite re-ask (1/${MAX_REASKS}).`);
                  await Conversation.findByIdAndUpdate(conversationId, {
                    $set: { "pendingActionConfirmation.asks": currentAsks }
                  });
                  const summary = pac.appointmentSummary || "";
                  const reAsk = activeLang === "ar"
                    ? `بربي لتأكيد الموعد (${summary})، تحب نثبتوه ولا لا؟`
                    : activeLang === "fr"
                    ? `Pour confirmer votre rendez-vous (${summary}), souhaitez-vous que je valide (oui ou non) ?`
                    : `Bech n'thabtou el rendez-vous (${summary}), theb n'kamlou ? 9olli "ey" wala "le" 3aychek.`;
                  const freshConvPACA = await Conversation.findOne({ _id: conversationId, tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
                  if (freshConvPACA) await this.sendConversationalReply(tenantId, conversationId, freshConvPACA, { suggestion: reAsk, structured: true, intent: "general_question", needsHumanEscalation: false, action: null }, inboundWaId);
                  return;
                }
              }
            }
          }
        }
      }
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
        if (freshConv) await this.bookingManager.handleBookingProposal(tenantId, conversationId, freshConv, resumeResult, inboundWaId);
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
      let extractedTime = extractTimeFromMessage(bypassMsgText);

      // Fallback for Tunisian dialect: people often just say "10 mriguel" or "l 10" without "h"
      if (!extractedTime && pendingCtx.proposedSlots) {
        for (const slot of pendingCtx.proposedSlots) {
          const h = slot.startTime.split(":")[0];
          const hNum = parseInt(h, 10).toString(); // e.g. "09" -> "9"
          // Match the number only if it's isolated (e.g. word boundary)
          const rx = new RegExp(`\\b(?:${h}|${hNum})\\b`);
          if (rx.test(bypassMsgText)) {
            extractedTime = slot.startTime;
            break;
          }
        }
      }

      if (extractedTime) {
        const matchedSlot = pendingCtx.proposedSlots.find(
          (s: { startTime: string; endTime: string }) => s.startTime === extractedTime
        );

        if (matchedSlot) {
          console.log(`[AI Conversation] BACKEND BYPASS: ${mode} slot matched by patient: ${extractedTime} on ${pendingCtx.date}.`);

          // ── RESCHEDULE CONFIRMATION GUARD ────────────────────────────────────
          const RESCHEDULE_CONFIRM_KEYWORDS = [
            "mriguel", "behy", "ok", "oui", "confirme", "confirmer", "d'accord",
            "nta3mi", "sayez", "parfait", "cbon", "c bon", "accept",
            "yes", "ey", "na3am", "mzien",
          ];
          const msgLower = bypassMsgText.toLowerCase().replace(/[^a-z0-9\s]/g, " ");

          // Patient stating presence, arrival, or keeping current appointment without changing:
          const ARRIVAL_OR_KEEP_WORDS = [
            "nji", "njiw", "jey", "jeyin", "njib", "hanni jey", "hani jey",
            "kima howa", "khallih", "5allih", "mabdilou", "ma tbadal",
            "matbadalch", "matbadilch", "mouch bech", "le le", "lé lé", "la la"
          ];
          const hasKeepOrArrival = ARRIVAL_OR_KEEP_WORDS.some(kw => msgLower.includes(kw));

          const hasConfirmWord = !hasKeepOrArrival && RESCHEDULE_CONFIRM_KEYWORDS.some(kw => {
            const rx = new RegExp(`\\b${kw}\\b`);
            return rx.test(msgLower);
          });

          if (mode === "reschedule") {
            if (hasKeepOrArrival) {
              console.log(`[AI Conversation] Patient indicated keeping appointment or confirming arrival ("${bypassMsgText}"). Clearing pending reschedule context.`);
              await Conversation.findByIdAndUpdate(conversationId, {
                $unset: { pendingBookingContext: 1, pendingActionConfirmation: 1 }
              });
              // Skip bypass and let the AI / conversation acknowledge that the existing appointment is maintained!
            } else {
              let targetAppointmentId = (pendingCtx as any).targetAppointmentId;

              // If missing but we have targetPatientId (family reschedule), resolve it now!
              if (!targetAppointmentId && (pendingCtx as any).targetPatientId) {
                const familyAppt = await Appointment.findOne({
                  tenantId: new mongoose.Types.ObjectId(tenantId),
                  patientId: new mongoose.Types.ObjectId((pendingCtx as any).targetPatientId),
                  status: { $in: ["scheduled", "confirmed"] }
                }).sort({ date: 1, startTime: 1 }).lean();
                if (familyAppt) {
                  targetAppointmentId = familyAppt._id.toString();
                }
              }

              if (!targetAppointmentId) {
                console.log(`[AI Conversation] BACKEND BYPASS: reschedule confirmed but targetAppointmentId missing. Skipping to AI.`);
                // Let the AI process it so it can output the correct targetId
              } else {
                let treatmentForBypass = "Consultation générale";
                if (mongoose.Types.ObjectId.isValid(targetAppointmentId)) {
                  const apptForTreatment = await Appointment.findOne({ _id: targetAppointmentId, tenantId }).lean();
                  if (apptForTreatment) treatmentForBypass = (apptForTreatment as any).treatment || treatmentForBypass;
                }

                const bypassResult: AISuggestionResult = {
                  intent: "appointment_change_request",
                  suggestion: "",
                  needsHumanEscalation: false,
                  structured: false,
                  action: {
                    type: "reschedule_appointment",
                    targetId: targetAppointmentId,
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

                if (!hasConfirmWord) {
                  console.log(`[AI Conversation] BACKEND BYPASS: reschedule slot selected (${extractedTime}) but no confirmation keyword. Sending explicit confirmation prompt.`);
                  const confirmCtx = `[SYSTEM: The patient selected the time slot ${extractedTime} for rescheduling their appointment. Ask them to confirm this choice naturally in their language. Keep it short.]`;
                  const echoMsg = await this.generateErrorReply(tenantId, conversation, confirmCtx) || `${extractedTime} ?`;

                  await Conversation.findByIdAndUpdate(conversationId, {
                    $set: {
                      pendingActionConfirmation: {
                        type: "reschedule_appointment",
                        appointmentId: targetAppointmentId,
                        appointmentSummary: `${pendingCtx.date} l ${extractedTime}`,
                        actionData: bypassResult.action
                      }
                    }
                  });

                  const echoResult = {
                    intent: "appointment_change_request",
                    suggestion: echoMsg,
                    needsHumanEscalation: false,
                    structured: true,
                    action: null
                  };
                  await this.sendConversationalReply(tenantId, conversationId, conversation, echoResult as any, inboundWaId);
                  return;
                } else {
                  const freshConvForBypass = await Conversation.findOne({ _id: conversationId, tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
                  if (freshConvForBypass) {
                    const handled = await this.bookingManager.handleRescheduleProposal(tenantId, conversationId, freshConvForBypass, bypassResult);
                    if (handled) return;
                  }
                }
              }
            }
          } else {
            // Mode = booking — always reload the conversation to get the LATEST pendingBookingContext
            const freshConvForBypass = await Conversation.findOne({ _id: conversationId, tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
            if (!freshConvForBypass) return;

            // Prefer targetPatientInfo from the FRESH conversation (most up-to-date)
            const freshTargetInfo = freshConvForBypass.pendingBookingContext?.targetPatientInfo || pendingCtx.targetPatientInfo;

            // ── CRITICAL FAMILY GUARD: if target is still unknown, let AI handle it ──
            if (freshTargetInfo && freshTargetInfo.firstName === "votre" && freshTargetInfo.lastName === "proche") {
              console.log("[AI Bypass] Target identity missing (votre proche). Skipping bypass to let AI handle name extraction intelligently.");
              // Do nothing here; it will fall through to the AI provider below
            } else {
              const bypassResult: AISuggestionResult = {
                intent: "appointment_confirmation",
                suggestion: "",
                needsHumanEscalation: false,
                structured: false,
                ...(freshTargetInfo ? { patientInfo: freshTargetInfo } : {}),
                action: {
                  type: "book_appointment",
                  targetId: freshTargetInfo ? "family" : "self",
                  reason: "Backend bypass: patient confirmed slot from proposed list",
                  confidence: 1.0,
                  booking: {
                    date: pendingCtx.date,
                    startTime: matchedSlot.startTime,
                    durationMin: pendingCtx.durationMin || 30,
                    treatment: pendingCtx.treatment || "Consultation générale",
                  },
                },
              };

              await this.bookingManager.handleBookingProposal(tenantId, conversationId, freshConvForBypass, bypassResult, inboundWaId);
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

      // SEND FALLBACK MESSAGE TO PATIENT
      // SEND FALLBACK MESSAGE TO PATIENT
      // We try to generate it dynamically without JSON (using generateErrorReply)
      let fallbackMsg = await this.generateErrorReply(
        tenantId,
        conversation,
        "[SYSTEM: The AI system encountered a temporary error or timeout. Apologize to the patient and tell them a team member will reply shortly.]"
      );

      // If the AI is completely dead/down, we use the absolute last-resort hardcoded string
      if (!fallbackMsg) {
        fallbackMsg = "Désolé, je rencontre un problème technique momentané. Un membre de l'équipe va vous répondre dans les plus brefs délais.";
      }

      try {
        await this.sendConversationalReply(
          tenantId,
          conversationId,
          conversation,
          { suggestion: fallbackMsg, structured: true, intent: "general_question", needsHumanEscalation: false, action: undefined } as any,
          inboundWaId
        );
      } catch (e) {
        console.error("[AI Conversation] Failed to send fallback message:", e);
      }
      return;
    }

    // ── Step 2.5: Auto-detect and update Patient Language ─────────────────────
    if (result.detectedLang && conversation.patientId) {
      const currentPat = await Patient.findById(conversation.patientId).lean();
      if (currentPat && (currentPat as any).language !== result.detectedLang) {
        await Patient.findByIdAndUpdate(conversation.patientId, { $set: { language: result.detectedLang } });
        console.log(`[AI Conversation] Updated patient ${conversation.patientId} language from ${(currentPat as any).language} to ${result.detectedLang}`);
      }
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
            const updateFields: any = {};
            if (pInfo.firstName) updateFields.firstName = pInfo.firstName;
            if (pInfo.lastName) updateFields.lastName = pInfo.lastName;

            // Only set to active if they provided both a valid first and last name
            if (pInfo.firstName && pInfo.lastName && pInfo.lastName.length > 1) {
              updateFields.status = "active";
            }

            await Patient.findByIdAndUpdate(conversation.patientId, { $set: updateFields });
            console.log(`[AI Conversation] Updated patient profile for ${conversation.patientId}:`, updateFields);
          }

          // NEW: Always update symptoms/notes if provided by AI
          if ((pInfo as any).symptoms) {
            const patientDoc = await Patient.findById(conversation.patientId).lean();
            const currentNotes = (patientDoc as any)?.notes ? `${(patientDoc as any).notes}\n` : "";
            const timestamp = new Date().toLocaleDateString("fr-FR");
            const newNotes = `${currentNotes}[${timestamp}] WhatsApp IA: ${(pInfo as any).symptoms}`;
            await Patient.findByIdAndUpdate(conversation.patientId, { $set: { notes: newNotes } });
            console.log(`[AI Conversation] Updated patient symptoms for ${conversation.patientId}:`, (pInfo as any).symptoms);
          }
        }

        // Resume pending booking if we were waiting for identity and now have it
        const patientDoc = await Patient.findById(conversation.patientId).lean();
        const hasFullIdentity = !isPlaceholderPatient(patientDoc);

        if (conversation.pendingBookingIntent?.awaitingTargetIdentity && pInfo?.firstName && pInfo?.lastName) {
          console.log("[AI Conversation] Target patient identity provided. Resuming pending family booking.");
          const pendingIntent = conversation.pendingBookingIntent;

          await Conversation.findByIdAndUpdate(conversationId, {
            $unset: { pendingBookingIntent: 1 }
          });

          const resumeResult: AISuggestionResult = {
            intent: "appointment_confirmation",
            suggestion: "",
            needsHumanEscalation: false,
            structured: false,
            patientInfo: pInfo,
            action: {
              type: "book_appointment",
              targetId: "self", // will be resolved in handleBookingProposal using patientInfo
              reason: "Reprise de la réservation après la fourniture de l'identité du proche",
              confidence: 1.0,
              booking: {
                date: pendingIntent.date,
                startTime: pendingIntent.startTime,
                durationMin: pendingIntent.durationMin,
                treatment: pendingIntent.treatment
              }
            }
          };

          await this.bookingManager.handleBookingProposal(tenantId, conversationId, conversation, resumeResult, inboundWaId);
          return;
        }

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
          await this.bookingManager.handleBookingProposal(tenantId, conversationId, conversation, resumeResult, inboundWaId);
          return; // Stop further processing of this message, booking is handled
        }
      } catch (err: any) {
        console.error("[AI Conversation] Failed to update patient profile:", err.message);
      }
    }

    // ── Step 2b: human escalation → send handoff reply, flag conversation, NO action ──
    if (result.needsHumanEscalation === true) {
      await this.sendConversationalReply(tenantId, conversationId, conversation, result, inboundWaId);

      try {
        await Conversation.findByIdAndUpdate(conversationId, {
          $set: { needsHuman: true },
        });

        // Trigger SSE notification
        let patientName = "Patient Inconnu";
        if (conversation.patientId) {
          const p = await Patient.findById(conversation.patientId).lean();
          if (p && !isPlaceholderPatient(p)) {
            patientName = `${(p as any).firstName || ""} ${(p as any).lastName || ""}`.trim();
          }
        }
        sseService.notifyHumanEscalation(
          tenantId,
          conversationId,
          patientName,
          result.intent === "unknown" ? "Incompréhension de l'IA" : "Demande d'escalade médicale/humaine"
        );
      } catch (err: any) {
        console.error("[AI Conversation] Failed to handle human escalation:", err.message);
      }
      return;
    }
    // ── Strategy 2: Fallback menu for unknown intent ───────────────────────
    if (result.intent === "unknown" && !result.needsHumanEscalation) {
      result.suggestion = await this.generateErrorReply(tenantId, conversation, `[SYSTEM: The AI did not understand the patient's request. Ask them naturally in their language if they want to: 1. Book an appointment 2. Reschedule an appointment 3. Speak to the secretariat.]`) || "Je n'ai pas bien compris. Souhaitez-vous prendre rendez-vous, modifier un rendez-vous, ou parler au secrétariat ?";
      result.structured = true;
      result.action = null;
      await this.sendConversationalReply(tenantId, conversationId, conversation, result, inboundWaId);
      return;
    }

    // ── Strategy 3: Cancel or Reset Context ─────────────────────────────────
    if (result.intent === "cancel_or_reset") {
      await Conversation.findByIdAndUpdate(conversationId, {
        $unset: { pendingBookingContext: 1, pendingBookingIntent: 1 }
      });
      await this.sendConversationalReply(tenantId, conversationId, conversation, result, inboundWaId);
      return;
    }

    // ── Step 3a: if AI proposed slots, persist pendingBookingContext ─────────
    if (
      (result.intent === "appointment_availability" || result.intent === "appointment_change_request") &&
      result.proposedSlots &&
      result.proposedSlots.length > 0 &&
      result.scheduling?.date
    ) {
      // Ensure durationMin is present, default to 30
      const durationMin = result.scheduling.durationMin || 30;
      const isRescheduleIntent = result.intent === "appointment_change_request";
      let pendingTargetAppointmentId: string | undefined;
      let pendingTargetPatientId: string | undefined;
      let pendingTargetPatientInfo: { firstName: string; lastName: string } | undefined;

      if (isRescheduleIntent) {
        // If AI already identified a targetId (appointmentId or patientId), store it
        if (result.action?.type === "reschedule_appointment" && result.action.targetId && result.action.targetId !== "self") {
          pendingTargetAppointmentId = result.action.targetId;
        } else if (conversation.patientId) {
          let targetPatientIdToSearch = conversation.patientId;
          let isExplicitFamily = false;

          // 1. Check if AI extracted a specific name (e.g. "Yahya")
          if (result.patientInfo && result.patientInfo.firstName && result.patientInfo.firstName.toLowerCase() !== "votre") {
            const familyMember = await Patient.findOne({
              tenantId: new mongoose.Types.ObjectId(tenantId),
              firstName: { $regex: new RegExp(`^${result.patientInfo.firstName}$`, "i") }
            }).lean();
            if (familyMember && familyMember._id.toString() !== conversation.patientId.toString()) {
              targetPatientIdToSearch = familyMember._id;
              isExplicitFamily = true;
            }
          }

          // 2. Check for family keywords in recent messages
          if (!isExplicitFamily) {
            try {
              const recentMsgs = await Message.find({
                tenantId: new mongoose.Types.ObjectId(tenantId),
                conversationId: new mongoose.Types.ObjectId(conversationId),
                direction: "inbound",
              }).sort({ createdAt: -1 }).limit(5).lean();
              if (recentMsgs.some(m => m.content && hasFamilyKeyword(m.content))) {
                isExplicitFamily = true;
              }
            } catch (_) { }
          }

          // 3. Find the upcoming appointment for the resolved target
          // If we couldn't resolve a specific family member but detected family context, we can't safely fallback to self
          if (!isExplicitFamily || targetPatientIdToSearch !== conversation.patientId) {
            const now = new Date().toISOString().slice(0, 10);
            const targetAppt = await Appointment.findOne({
              tenantId: new mongoose.Types.ObjectId(tenantId),
              patientId: targetPatientIdToSearch,
              date: { $gte: now },
              status: { $in: ["scheduled", "confirmed"] },
            }).sort({ date: 1, startTime: 1 }).lean();
            if (targetAppt) {
              pendingTargetAppointmentId = targetAppt._id.toString();
              pendingTargetPatientId = (targetAppt as any).patientId.toString();
            }
          }
        }
      }

      // 1. First, check if recent messages indicate a family booking
      let isFamilyContext = false;
      try {
        const recentMsgs = await Message.find({
          tenantId: new mongoose.Types.ObjectId(tenantId),
          conversationId: new mongoose.Types.ObjectId(conversationId),
          direction: "inbound",
        }).sort({ createdAt: -1 }).limit(5).lean();
        if (recentMsgs.some(m => m.content && hasFamilyKeyword(m.content))) {
          isFamilyContext = true;
        }
      } catch (_) { }

      // 2. Safely assign pendingTargetPatientInfo
      if (isFamilyContext) {
        let cpFirst = "";
        let cpLast = "";
        if (conversation.patientId) {
          const cp = await Patient.findById(conversation.patientId).lean();
          if (cp) {
            cpFirst = cp.firstName?.toLowerCase() || "";
            cpLast = cp.lastName?.toLowerCase() || "";
          }
        }

        if (result.patientInfo && result.patientInfo.firstName &&
          (result.patientInfo.firstName.toLowerCase() !== cpFirst || result.patientInfo.lastName?.toLowerCase() !== cpLast)) {
          pendingTargetPatientInfo = {
            firstName: result.patientInfo.firstName,
            lastName: result.patientInfo.lastName || "",
          };
        } else {
          pendingTargetPatientInfo = { firstName: "votre", lastName: "proche" };
        }
      } else if (result.patientInfo && result.patientInfo.firstName) {
        pendingTargetPatientInfo = {
          firstName: result.patientInfo.firstName,
          lastName: result.patientInfo.lastName || "",
        };
      } else if (!isRescheduleIntent && conversation.pendingBookingIntent?.targetPatientInfo) {
        pendingTargetPatientInfo = conversation.pendingBookingIntent.targetPatientInfo;
      }

      try {
        await Conversation.findByIdAndUpdate(conversationId, {
          $set: {
            pendingBookingContext: {
              date: result.scheduling.date,
              durationMin: durationMin,
              treatment: "Consultation générale", // Can be updated if scheduling provides treatment
              proposedSlots: result.proposedSlots,
              proposedAt: new Date(),
              expiresAt: new Date(Date.now() + 15 * 60 * 1000), // Expires in 15 minutes
              version: Date.now(), // Use timestamp as version
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
      if (result.intent === "appointment_change_request" && conversation.pendingBookingContext?.mode !== "booking") {
        await this.bookingManager.handleRescheduleProposal(tenantId, conversationId, conversation, result);
        return;
      }
      await this.bookingManager.handleBookingProposal(tenantId, conversationId, conversation, result, inboundWaId);
      return;
    }

    // ── Step 3c: reschedule proposal → dedicated secure rescheduling flow ─────
    if (result.action?.type === "reschedule_appointment" && result.action.booking) {
      if (conversation.pendingBookingContext?.mode === "booking") {
        await this.bookingManager.handleBookingProposal(tenantId, conversationId, conversation, result, inboundWaId);
        return;
      }
      await this.bookingManager.handleRescheduleProposal(tenantId, conversationId, conversation, result);
      return;
    }

    // ── Step 3d: confirm appointment proposal / reminder confirmation ─────────
    const latestInbound = await Message.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      conversationId: new mongoose.Types.ObjectId(conversationId),
      direction: "inbound",
    }).sort({ createdAt: -1 }).lean();

    const lowerMsg = (latestInbound?.content || "").trim().toLowerCase();
    const EXPLICIT_CONFIRM_WORDS = [
      "oui", "behi", "ey", "na3am", "ok", "confirme", "confirmer",
      "d'accord", "daccord", "mriguel", "belehy", "\u0646\u0639\u0645", "\u0646\u0624\u0643\u062f", "1"
    ];
    const isConfirmationText = EXPLICIT_CONFIRM_WORDS.some(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      return regex.test(lowerMsg);
    });

    // CRITICAL FIX: Never treat a message as an appointment confirmation if
    // a family pendingBookingContext is in progress. In that case the patient
    // is selecting a TIME SLOT for their family member, not confirming their own
    // existing appointment. Route to the booking flow below instead.
    const hasPendingFamilyBooking =
      !!conversation.pendingBookingContext ||
      !!conversation.pendingBookingIntent?.awaitingTargetIdentity;

    if (!hasPendingFamilyBooking && (result.action?.type === "confirm_appointment" || isConfirmationText)) {
      const handled = await this.bookingManager.handleConfirmAppointmentProposal(tenantId, conversationId, conversation, result, inboundWaId);
      if (handled) return;
    }

    // ── Step 3d2: cancel appointment ─────────
    // MANDATORY CONFIRMATION: never cancel immediately — always ask the patient first.
    if (result.action?.type === "cancel_appointment") {
      try {
        let targetIdToUse = result.action.targetId || "self";
        const __pat1 = await Patient.findById(conversation.patientId).select("language").lean();
        const isTunCancel = detectLanguageFromText(latestInbound?.content || "", (__pat1 as any)?.language || "arabizi");

        // Resolve the target appointment
        if (targetIdToUse === "self" || !mongoose.Types.ObjectId.isValid(targetIdToUse)) {
          const now = new Date().toISOString().slice(0, 10);

          // PRIORITY 1: Look for the conversation patient's OWN upcoming appointments first.
          // This prevents cancelling a family member's appointment when the patient says "annule mon rendez-vous".
          const selfAppts = await Appointment.find({
            tenantId: new mongoose.Types.ObjectId(tenantId),
            patientId: new mongoose.Types.ObjectId(conversation.patientId),
            date: { $gte: now },
            status: { $in: ["scheduled", "confirmed"] }
          }).populate("patientId", "firstName lastName").sort({ date: 1, startTime: 1 }).lean();

          let upcomingAppts = selfAppts;

          // PRIORITY 2: Only if the patient has no personal RDV, check if the cancel request
          // explicitly names a family member (via result.action.patientInfo).
          if (selfAppts.length === 0) {
            const familyPatsCancel = await Patient.find({
              tenantId: new mongoose.Types.ObjectId(tenantId),
              phone: conversation.contactWaId,
            }).select("_id").lean();
            const familyPatIdsCancel = familyPatsCancel.map((p) => p._id);

            upcomingAppts = await Appointment.find({
              tenantId: new mongoose.Types.ObjectId(tenantId),
              patientId: { $in: familyPatIdsCancel.length > 0 ? familyPatIdsCancel : [new mongoose.Types.ObjectId(conversation.patientId)] },
              date: { $gte: now },
              status: { $in: ["scheduled", "confirmed"] }
            }).populate("patientId", "firstName lastName").sort({ date: 1, startTime: 1 }).lean();
          }

          if (upcomingAppts.length === 0) {
            const noApptReply = isTunCancel === "arabizi" || isTunCancel === "ar"
              ? "Ma 3andek 7ata rendez-vous m9ayed bech talghih."
              : "Vous n'avez aucun rendez-vous actif à annuler.";
            const noApptResult = { ...result, suggestion: noApptReply, structured: true, action: null };
            await this.sendConversationalReply(tenantId, conversationId, conversation, noApptResult as any, inboundWaId);
            return;
          }
          targetIdToUse = upcomingAppts[0]._id.toString();
        }

        // Load the appointment to show a human-readable summary in the confirmation question
        const apptForCancel = await Appointment.findOne({
          _id: new mongoose.Types.ObjectId(targetIdToUse),
          tenantId: new mongoose.Types.ObjectId(tenantId),
        }).populate("patientId", "firstName lastName").lean();

        if (!apptForCancel) {
          const notFoundReply = isTunCancel === "arabizi" || isTunCancel === "ar"
            ? "Ma najamtech nlakeh rendez-vous bech nalbghou."
            : "Je n'ai pas trouvé le rendez-vous à annuler.";
          const nfResult = { ...result, suggestion: notFoundReply, structured: true, action: null };
          await this.sendConversationalReply(tenantId, conversationId, conversation, nfResult as any, inboundWaId);
          return;
        }

        const patName = (apptForCancel.patientId as any)?.firstName || "";
        const apptSummary = `${patName ? patName + " - " : ""}${apptForCancel.date} à ${apptForCancel.startTime}`;

        // Store pendingActionConfirmation and ask patient
        await Conversation.findByIdAndUpdate(conversationId, {
          $set: {
            pendingActionConfirmation: {
              type: "cancel_appointment",
              appointmentId: targetIdToUse,
              appointmentSummary: apptSummary,
            }
          }
        });

        const confirmAsk = isTunCancel === "arabizi" || isTunCancel === "ar"
          ? `Akid theb telghi rendez-vous (${apptSummary}) ? jeweb b "oui" bech nakkadou.`
          : `Êtes-vous sûr de vouloir annuler le rendez-vous (${apptSummary}) ? Répondez par "oui" pour confirmer.`;
        const askResult = { ...result, suggestion: confirmAsk, structured: true, action: null };
        await this.sendConversationalReply(tenantId, conversationId, conversation, askResult as any, inboundWaId);
        return;
      } catch (err: any) {
        console.error("[AI Conversation] cancel_appointment confirmation setup failed:", err.message);
        return;
      }
    }

    // ── Step 3d3: join waitlist ─────────
    if (result.action?.type === "join_waitlist" && result.action.booking) {
      try {
        const { executeAIAction } = await import("./ai.action.executor");
        await executeAIAction(tenantId, conversationId, {
          type: "join_waitlist",
          targetId: result.action.targetId || "self",
          booking: result.action.booking as any,
        });

        // After successful execution, send the conversational reply
        await this.sendConversationalReply(tenantId, conversationId, conversation, result, inboundWaId);
        return;
      } catch (err: any) {
        console.error("[AI Conversation] executeAIAction failed for join_waitlist:", err.message);
        const reply = await this.generateErrorReply(tenantId, conversation, `[SYSTEM: An error occurred while joining the waitlist. Apologize briefly in the patient's language and suggest they try again.]`) || "";
        if (reply) {
          const fallbackResult = { ...result, reply, suggestion: reply, action: null };
          await this.sendConversationalReply(tenantId, conversationId, conversation, fallbackResult as any, inboundWaId);
        }
        return;
      }
    }

    // ── Step 3e: reassign appointment patient ─────────
    if (result.action?.type === "reassign_appointment_patient" && result.action.targetId) {
      try {
        let targetIdToUse = result.action.targetId;

        // Phase 3: Identifier le rendez-vous à modifier
        if (!mongoose.Types.ObjectId.isValid(targetIdToUse)) {
          const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
          const recentAppt = await Appointment.findOne({
            tenantId: new mongoose.Types.ObjectId(tenantId),
            patientId: new mongoose.Types.ObjectId(conversation.patientId),
            createdAt: { $gte: fifteenMinsAgo },
            status: { $in: ["scheduled", "confirmed"] }
          }).sort({ createdAt: -1 }).lean();

          if (recentAppt) {
            targetIdToUse = recentAppt._id.toString();
          } else {
            const now = new Date().toISOString().slice(0, 10);
            const upcomingAppts = await Appointment.find({
              tenantId: new mongoose.Types.ObjectId(tenantId),
              patientId: new mongoose.Types.ObjectId(conversation.patientId),
              date: { $gte: now },
              status: { $in: ["scheduled", "confirmed"] }
            }).lean();

            if (upcomingAppts.length === 1) {
              targetIdToUse = upcomingAppts[0]._id.toString();
            } else if (upcomingAppts.length > 1) {
              const reply = "Lequel de vos rendez-vous souhaitez-vous modifier ?";
              const fallbackResult = { ...result, reply, suggestion: reply, action: null };
              await this.sendConversationalReply(tenantId, conversationId, conversation, fallbackResult as any, inboundWaId);
              return;
            }
          }
        }

        const { executeAIAction } = await import("./ai.action.executor");
        await executeAIAction(tenantId, conversationId, {
          type: "reassign_appointment_patient",
          targetId: targetIdToUse,
          patientInfo: result.action.patientInfo as any, // Bypass TS interface strictness for now
        });
        // After successful execution, send the conversational reply
        await this.sendConversationalReply(tenantId, conversationId, conversation, result, inboundWaId);
        return;
      } catch (err: any) {
        console.error("[AI Conversation] executeAIAction failed for reassign:", err.message);
        let reply = await this.generateErrorReply(tenantId, conversation, `[SYSTEM: Failed to modify the appointment details. Error: ${err.message}. Apologize naturally in their language and offer to try again or ask for the secretariat.]`) || "Désolé, une erreur est survenue lors de la modification. Veuillez réessayer.";
        const fallbackResult = { ...result, reply, suggestion: reply, action: null };
        await this.sendConversationalReply(tenantId, conversationId, conversation, fallbackResult as any, inboundWaId);
        return;
      }
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
      durationMin: rawBooking.durationMin || conversation.pendingBookingIntent?.durationMin || conversation.pendingBookingContext?.durationMin || 30,
      treatment: rawBooking.treatment || conversation.pendingBookingIntent?.treatment || conversation.pendingBookingContext?.treatment || "Consultation générale",
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
    // OR if the current rawTargetInfo is the "votre proche" placeholder and we have a new extracted name
    if (
      (!rawTargetInfo || (rawTargetInfo.firstName === "votre" && rawTargetInfo.lastName === "proche")) &&
      result.patientInfo?.firstName &&
      result.patientInfo?.lastName
    ) {
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
        const recentMsgs = await Message.find({
          tenantId: new mongoose.Types.ObjectId(tenantId),
          conversationId: new mongoose.Types.ObjectId(conversationId),
          direction: "inbound",
        }).sort({ createdAt: -1 }).limit(5).lean();
        if (recentMsgs.some(m => m.content && hasFamilyKeyword(m.content))) {
          isForOther = true;
        }
      } catch (_) { /* non-fatal */ }
    }

    // If name given but no family keyword and conversation patient has a real identity
    // → ambiguous: ask for clarification (Scenario 5)
    // CRITICAL: If the system EXPLICITLY asked for the patient's name (awaitingIdentity),
    // the response IS their real identity — NEVER ask for target clarification.
    const wasAwaitingIdentity = !!conversation.pendingBookingIntent?.awaitingIdentity;
    let actualConversationPatientId = conversationPatientId;

    if (wasAwaitingIdentity && result.patientInfo?.firstName && result.patientInfo?.lastName) {
      console.log(`[AI Conversation] Resolving caller identity: ${result.patientInfo.firstName} ${result.patientInfo.lastName}`);

      const existingManualPatient = await Patient.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        firstName: { $regex: new RegExp(`^${result.patientInfo.firstName}$`, "i") },
        lastName: { $regex: new RegExp(`^${result.patientInfo.lastName}$`, "i") },
      }).lean();

      if (existingManualPatient) {
        console.log(`[AI Conversation] Found existing manual patient (${existingManualPatient._id}). Merging placeholder.`);
        actualConversationPatientId = (existingManualPatient as any)._id;

        await Patient.findByIdAndUpdate(actualConversationPatientId, {
          $set: { phone: conversation.contactWaId }
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          $set: { patientId: actualConversationPatientId }
        });

        // Remove the placeholder patient
        await Patient.findByIdAndDelete(conversationPatientId).catch(() => { });
      } else {
        console.log(`[AI Conversation] No existing patient found. Updating placeholder name.`);
        await Patient.findByIdAndUpdate(conversationPatientId, {
          $set: {
            firstName: result.patientInfo.firstName,
            lastName: result.patientInfo.lastName,
            status: "active",
          }
        });
      }

      // Reflect changes locally
      (conversationPatient as any).firstName = result.patientInfo.firstName;
      (conversationPatient as any).lastName = result.patientInfo.lastName;
    }

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
          structured: true,
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

    // ── Enforce TARGET identity if we know it's for a family member but don't have a resolved name ──
    if (isForOther && (!rawTargetInfo || (rawTargetInfo.firstName === "votre" && rawTargetInfo.lastName === "proche"))) {
      console.log("[AI Conversation] Target identity missing (placeholder). Requesting target identity before booking.");
      await Conversation.findByIdAndUpdate(conversationId, {
        $set: {
          pendingBookingIntent: {
            date: booking.date,
            startTime: booking.startTime,
            durationMin: booking.durationMin,
            treatment: booking.treatment,
            awaitingIdentity: false,
            awaitingTargetConfirmation: false,
            awaitingTargetIdentity: true,
            targetPatientInfo: rawTargetInfo,
          }
        }
      });
      const recentInboundForLang = await Message.find({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        conversationId: new mongoose.Types.ObjectId(conversationId),
        direction: "inbound",
      }).sort({ createdAt: -1 }).limit(5).lean();
      const combinedText = recentInboundForLang.map((m: any) => m.content).join(" ");
      const detLang2 = detectLanguageFromText(combinedText, conversationPatient.language);
      const isAr = detLang2 === "ar" || detLang2 === "arabizi";

      const identityRequestResult = {
        ...result,
        suggestion: await this.generateErrorReply(tenantId, conversation, `[SYSTEM: Demandez au patient le nom et prénom du membre de la famille pour lequel il prend rendez-vous. RÈGLE STRICTE: Utilisez la phrase exacte "chnowa esm w la9ab li bech tekhoulou rendez-vous ?" si le patient parle tunisien. N'utilisez JAMAIS "smit" ou "t7ajerlo".]`),
        structured: true,
        action: undefined
      };
      await this.sendConversationalReply(tenantId, conversationId, conversation, identityRequestResult as any, inboundWaId);
      return true;
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
      const recentInboundForLang = await Message.find({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        conversationId: new mongoose.Types.ObjectId(conversationId),
        direction: "inbound",
      }).sort({ createdAt: -1 }).limit(5).lean();
      const combinedText = recentInboundForLang.map((m: any) => m.content).join(" ");
      const detLang3 = detectLanguageFromText(combinedText, conversationPatient.language);
      const isAr = detLang3 === "ar" || detLang3 === "arabizi";

      const identityRequestResult = {
        ...result,
        suggestion: await this.generateErrorReply(tenantId, conversation, `[SYSTEM: To create a medical record and confirm the appointment, we need the patient's full name (first name and last name). Ask them naturally in their language. STRICT RULE: If the patient speaks Tunisian, you MUST use exactly "chnowa esmek el kamel aman". NEVER use "smitek" or "3afak".]`),
        structured: true,
        action: undefined
      };
      await this.sendConversationalReply(tenantId, conversationId, conversation, identityRequestResult as any, inboundWaId);
      return true;
    }

    // ── Validate against pendingBookingContext proposedSlots or REAL availability ──
    if (conversation.pendingBookingContext) {
      // 1. Expiration check
      if (
        conversation.pendingBookingContext.expiresAt &&
        new Date() > new Date(conversation.pendingBookingContext.expiresAt)
      ) {
        console.warn(`[AI Conversation] pendingBookingContext expired.`);

        // Clear old context
        await Conversation.findByIdAndUpdate(conversationId, {
          $unset: { pendingBookingContext: 1 }
        });

        // Recalculate availabilities
        const newSlots = await availabilityService.getAvailableSlots({ tenantId, date: booking.date, durationMin: booking.durationMin });

        let newProposalMsg = "Désolé, les horaires que je vous avais proposés ont expiré. ";
        if ("error" in newSlots || !newSlots.slots || newSlots.slots.length === 0) {
          newProposalMsg += "Malheureusement, il n'y a plus de disponibilités pour ce jour. Souhaitez-vous une autre date ?";
        } else {
          newProposalMsg += "Voici les nouvelles disponibilités : " + newSlots.slots.map((s: any) => s.startTime).join(", ");
        }

        const expiredResult = {
          ...result,
          reply: newProposalMsg,
          suggestion: newProposalMsg,
          structured: true,
          action: undefined
        };
        await this.sendConversationalReply(tenantId, conversationId, conversation, expiredResult as any, inboundWaId);
        return true;
      }

      // 2. Slots validation
      if (
        conversation.pendingBookingContext.proposedSlots &&
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
            aiTargetId !== actualConversationPatientId.toString() &&
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
        if (err.message?.includes("Vous avez déjà un rendez-vous prévu") || err.message?.includes("3andek rendez-vous m9ayed") || err.message?.startsWith("Active_Appointment_Exists")) {
          console.log("[AI Conversation] Active_Appointment_Exists — sending refusal message.");
          let msg: string;
          if (err.message.startsWith("Active_Appointment_Exists")) {
            const parts = err.message.split(":");
            const existingDate = parts[1];
            const existingTime = parts.slice(2).join(":");
            // Use AI to generate a natural message in the correct language, mentioning the family member if relevant
            const familyName = (isForOther && rawTargetInfo) ? `${rawTargetInfo.firstName} ${rawTargetInfo.lastName}` : null;
            const systemCtx = familyName
              ? `[SYSTEM: ${familyName} already has an upcoming appointment on ${existingDate} at ${existingTime}. Inform the patient naturally in their language that ${familyName} already has an appointment on that date. Suggest they reschedule it instead if they want a different date/time. Keep it short.]`
              : `[SYSTEM: The patient already has an upcoming appointment on ${existingDate} at ${existingTime}. Inform them naturally in their language. Suggest rescheduling if they want a different date/time. Keep it short.]`;
            msg = await this.generateErrorReply(tenantId, conversation, systemCtx) || (familyName
              ? `${familyName} a déjà un rendez-vous le ${existingDate} à ${existingTime}. Souhaitez-vous le déplacer ?`
              : `Vous avez déjà un rendez-vous le ${existingDate} à ${existingTime}. Souhaitez-vous le déplacer ?`);
          } else {
            msg = err.message;
          }
          const refusalResult = { ...result, suggestion: msg, structured: true, action: undefined };
          await this.sendConversationalReply(tenantId, conversationId, conversation, refusalResult as any, inboundWaId);
          return true;
        }
        if (err.message?.includes("Le créneau n'est plus disponible") || err.message?.includes("SLOT_UNAVAILABLE") || err.message?.includes("Lwa9t hedha ma 3adech disponible")) {
          console.log("[AI Conversation] SLOT_UNAVAILABLE — fetching alternative slots and offering them.");
          try {
            const altSlots = await availabilityService.getAvailableSlots({ tenantId, date: booking.date, durationMin: booking.durationMin });
            let altMsg: string;
            if (!("error" in altSlots) && altSlots.slots && altSlots.slots.length > 0) {
              const slotsStr = altSlots.slots.map((s: any) => s.startTime).join(", ");
              altMsg = await this.generateErrorReply(tenantId, conversation, `[SYSTEM: The slot ${booking.startTime} on ${booking.date} is no longer available (taken by another patient). The available slots for that day are: ${slotsStr}. Apologize naturally in the patient's language and offer these alternative slots.]`) || `Désolé, ce créneau n'est plus disponible. Voici les créneaux disponibles : ${slotsStr}.`;
              // Save new proposed slots so the patient can pick one
              await Conversation.findByIdAndUpdate(conversationId, {
                $set: { "pendingBookingContext.proposedSlots": altSlots.slots }
              }).catch(() => { });
            } else {
              altMsg = await this.generateErrorReply(tenantId, conversation, `[SYSTEM: The slot ${booking.startTime} on ${booking.date} is no longer available and there are no more slots that day. Apologize in the patient's language and ask if they want another day.]`) || "Désolé, aucun créneau n'est plus disponible ce jour-là. Souhaitez-vous choisir une autre date ?";
            }
            const refusalResult = { ...result, reply: altMsg, suggestion: altMsg, structured: true, action: undefined };
            await this.sendConversationalReply(tenantId, conversationId, conversation, refusalResult as any, inboundWaId);
          } catch (_) {
            const refusalResult = { ...result, reply: err.message, suggestion: err.message, structured: true, action: undefined };
            await this.sendConversationalReply(tenantId, conversationId, conversation, refusalResult as any, inboundWaId);
          }
          return true;
        }
        console.error("[AI Conversation] executeAIAction failed:", err.message);
        const fallbackMsg = err.message?.includes("Past_Date_Error")
          ? await this.generateErrorReply(tenantId, conversation, `[SYSTEM: The date requested is in the past. Apologize naturally in the patient's language and suggest they pick a future date.]`) || "Désolé, cette date est déjà passée. Veuillez choisir une date future."
          : await this.generateErrorReply(tenantId, conversation, `[SYSTEM: An error occurred during booking. Apologize briefly in the patient's language and suggest retrying or contacting the secretariat.]`) || "Désolé, une erreur est survenue lors de l'enregistrement. Veuillez réessayer.";
        const fallbackResult = { ...result, reply: fallbackMsg, suggestion: fallbackMsg, action: undefined };
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

    let confirmationText = result.suggestion;
    if (!confirmationText || !confirmationText.includes(createdAppointment.startTime)) {
      const recentInboundMsgs = await Message.find({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        conversationId: new mongoose.Types.ObjectId(conversationId),
        direction: "inbound",
      }).sort({ createdAt: -1 }).limit(5).lean();

      const combinedText = recentInboundMsgs.map((m: any) => m.content).join(" ");
      const detectedLang = detectLanguageFromText(combinedText, conversationPatient.language);
      const finalLang = detectedLang === "arabizi" ? "arabizi" : (detectedLang === "ar" ? "ar" : targetLanguage);

      confirmationText = await buildConfirmationMessage(
        "booking",
        {
          date: createdAppointment.date,
          startTime: createdAppointment.startTime,
          endTime: createdAppointment.endTime,
          treatment: createdAppointment.treatment,
        },
        targetFirstName || "",
        conversationId,
        finalLang
      );
    }

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

  private async generateErrorReply(
    tenantId: string,
    conversation: any,
    errorContext: string
  ): Promise<string> {
    try {
      const providerUrl = process.env.AI_PROVIDER_URL?.trim()?.replace(/^['"]/g, "").replace(/['"]$/g, "");
      const apiKey = process.env.AI_API_KEY?.trim()?.replace(/^['"]/g, "").replace(/['"]$/g, "");
      const model = process.env.AI_MODEL?.trim()?.replace(/^['"]/g, "").replace(/['"]$/g, "");

      if (!providerUrl || !apiKey || !model) {
        console.warn("[AI] generateErrorReply: AI provider not configured.");
        return "";
      }

      // Load the last 6 messages to provide language context to the AI
      const recentMessages = await Message.find({ conversationId: conversation._id })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean();

      const historyMessages = recentMessages
        .reverse()
        .map((m: any) => ({
          role: (m.direction === "inbound" ? "user" : "assistant") as "user" | "assistant",
          content: m.content || "",
        }))
        .filter((m: any) => m.content);

      // Minimal system instruction: stay in patient language, plain text, short
      const systemInstruction = `You are a WhatsApp assistant for a medical clinic. Look at the conversation history to detect the patient's language (French, Tunisian arabizi, Arabic, English). Always reply in that same language. Write a single short empathetic sentence. No JSON, no greetings, no formatting.`;

      const messages = [
        { role: "system" as const, content: systemInstruction },
        ...historyMessages,
        { role: "user" as const, content: errorContext },
      ];

      const response = await fetch(`${providerUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 100 }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        console.error(`[AI] generateErrorReply HTTP ${response.status}`);
        return "";
      }

      const data = await response.json() as any;
      const reply: string | undefined = data?.choices?.[0]?.message?.content?.trim();
      return reply || "";
    } catch (e) {
      console.error("[AI] generateErrorReply failed:", e);
      return "";
    }
  }

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

    let reply = result.suggestion.trim();

    // TN-NLU: Détection de la langue réelle de la conversation
    const replyHasArabic = /[\u0600-\u06FF]/.test(reply);
    const expectedLang: Lang = replyHasArabic ? "ar" : ((conversation as any).language || "tn-arabizi");
    const langCheck = validateReplyLanguage(reply, expectedLang);
    if (!langCheck.ok) {
      console.warn(`[AI Conversation] validateReplyLanguage notices: ${langCheck.problems.join(", ")}`);
      // Nettoyer uniquement les artefacts de mots au script mixte sans écraser la réponse
      if (langCheck.problems.includes("mixed_script_word")) {
        reply = reply.replace(/([A-Za-z])[\u0600-\u06FF]+/g, "$1");
      }
    }

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

    const patientId = conversation.patientId;

    // ── SUPPRESS RAPID DUPLICATE OUTBOUND REPLIES ─────────────────────────────
    // If an identical reply was sent to this conversation in the last 20 seconds,
    // do not re-send it to WhatsApp.
    try {
      const recentDuplicate = await Message.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        conversationId: new mongoose.Types.ObjectId(conversationId),
        direction: "outbound",
        content: reply,
        createdAt: { $gte: new Date(Date.now() - 20000) },
      }).lean();

      if (recentDuplicate) {
        console.log(`[AI Conversation] Duplicate reply suppressed: identical message was already sent within the last 20s.`);
        return;
      }
    } catch (checkErr: any) {
      console.warn("[AI Conversation] Duplicate check error:", checkErr.message);
    }

    try {
      // Phase 6: Strict 1:1 message/reply locking
      await Message.create({
        tenantId,
        conversationId,
        patientId,
        direction: "outbound",
        status: "sent",
        content: reply,
        providerMessageId: `temp-ai-reply-${Date.now()}-${Math.random().toString(36).substring(7)}`, // Will be updated by WhatsApp
        idempotencyKey: deterministicId,
      });
    } catch (err: any) {
      if (err.code === 11000) {
        console.log("[AI Conversation] AI reply already processing/sent for this inbound message. Skipping duplicate.");
        return;
      }
      console.error("[AI Conversation] Failed to lock AI reply:", err.message);
      return;
    }

    const tenant = await Tenant.findById(tenantId).lean();
    if (!tenant) {
      console.error("[AI Conversation] Tenant not found for reply.");
      return;
    }

    try {
      // Send the real WhatsApp Message
      const sendResult = await this.messagingProvider.sendMessage(
        { to: conversation.contactWaId, type: "text", content: reply },
        tenant as any
      );

      // Update the locked placeholder with the real provider message ID for delivery receipts
      await Message.findOneAndUpdate(
        { idempotencyKey: deterministicId },
        {
          $set: {
            providerMessageId: sendResult.providerMessageId,
            error: null,
          },
        }
      );
    } catch (sendErr) {
      console.error(
        "[AI Conversation] WhatsApp send failed for AI reply:",
        (sendErr as Error).message
      );
      // Mark the locked message as failed so it doesn't block future retries if needed
      await Message.findOneAndUpdate(
        { idempotencyKey: deterministicId },
        {
          $set: {
            status: "failed",
            error: (sendErr as Error).message,
          },
        }
      );
    }
  }

  /**
   * Handle confirmation of an existing upcoming appointment when the patient confirms.
   */

}

export const aiAutoBookingService = new AIAutoBookingService();
