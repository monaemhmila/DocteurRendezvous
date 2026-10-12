import mongoose from "mongoose";
import { Conversation, Message } from "../communications/communication.model";
import { Appointment } from "../appointments/appointment.model";
import { Patient } from "../patients/patient.model";
import { Tenant } from "../tenants/tenant.model";
import { AISuggestionResult } from "./ai.service";
import { executeAIAction } from "./ai.action.executor";
import { IMessagingProvider } from "../communications/providers/messaging.provider";
import { availabilityService } from "../appointments/availability.service";
import {
  buildConfirmationMessage,
  normalizeTime,
  hasFamilyKeyword,
  detectLanguageFromText,
  isPlaceholderPatient,
} from "./ai.utils";
import { resolveTargetPatient } from "./ai.identity.resolver";

export class AIBookingManager {
  constructor(
    private messagingProvider: IMessagingProvider,
    private generateErrorReply: (tenantId: string, conversation: any, prompt: string) => Promise<string | null>,
    private sendConversationalReply: (tenantId: string, conversationId: string, conversation: any, result: any, inboundWaId?: string) => Promise<void>
  ) {}

  public async handleBookingProposal(
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

    // ── Hard Gate : Confirmation obligatoire pour toute réservation issue d'un message vocal ──
    if (conversation.pendingVoiceConfirmation) {
      console.log("[AI Conversation] pendingVoiceConfirmation active — asking explicit confirmation before booking.");
      // Détecter la langue
      const patLang = (conversation.patientId && (await Patient.findById(conversation.patientId).select("language").lean()) as any)?.language || "arabizi";
      const proposedDate = rawBooking.date || conversation.pendingBookingContext?.date || new Date().toISOString().slice(0, 10);
      const proposedTime = normalizeTime(rawBooking.startTime);
      const { formatDate } = await import("./tn-nlu");
      const todayIso = new Date().toISOString().slice(0, 10);
      const formattedDateStr = formatDate(proposedDate, patLang === "fr" ? "fr" : patLang === "ar" ? "ar" : "tn-arabizi", todayIso);
      
      let confirmPrompt = "";
      if (patLang === "fr") {
        confirmPrompt = `J'ai bien écouté votre message vocal. Pour confirmer votre rendez-vous ${formattedDateStr} à ${proposedTime}, répondez par « oui » ou précisez-moi le moment qui vous convient le mieux.`;
      } else if (patLang === "ar") {
        confirmPrompt = `استمعت إلى رسالتك الصوتية. لتأكيد موعدك ${formattedDateStr} في الساعة ${proposedTime}، أجب بـ «نعم» أو أعلمني بالوقت الذي يناسبك.`;
      } else {
        confirmPrompt = `Sma3t el vocal mte3ek. Theb n'confirmiw rendez-vous ${formattedDateStr} m3a ${proposedTime} ? (9olli ey wala mriguel, wala 9olli wa9tech theb).`;
      }

      // ── GUARD: Do NOT overwrite an already-active pendingActionConfirmation.
      // If a PAC is already set (e.g. from the first voice note), a second
      // voice note must not replace it — the patient is answering the existing
      // confirmation, not starting a new booking. Let the PAC handler take over.
      const freshConvForVoiceGate = await Conversation.findById(conversationId).select("pendingActionConfirmation").lean();
      if ((freshConvForVoiceGate as any)?.pendingActionConfirmation) {
        console.log("[AI Conversation] pendingActionConfirmation already active — voice gate skipping new PAC. Patient voice note treated as PAC reply.");
        await Conversation.findByIdAndUpdate(conversationId, { $unset: { pendingVoiceConfirmation: 1 } });
        return true;
      }

      await Conversation.findByIdAndUpdate(conversationId, {
        $set: {
          pendingActionConfirmation: {
            type: "confirm_appointment_status",
            appointmentId: "pending_voice",
            appointmentSummary: `${formattedDateStr} à ${proposedTime}`,
            actionData: {
              rawBooking,
              result
            }
          }
        },
        $unset: { pendingVoiceConfirmation: 1 }
      });

      const confirmResult = {
        ...result,
        suggestion: confirmPrompt,
        reply: confirmPrompt,
        structured: true,
        action: undefined
      };
      await this.sendConversationalReply(tenantId, conversationId, conversation, confirmResult as any, inboundWaId);
      return true;
    }

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
        const aiTargetId = result.action?.targetId || "self";
        const executorTargetId =
          aiTargetId !== "self" &&
            aiTargetId !== actualConversationPatientId.toString() &&
            !isForOther
            ? aiTargetId
            : targetPatientId;

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
              await Conversation.findByIdAndUpdate(conversationId, {
                $set: { "pendingBookingContext.proposedSlots": altSlots.slots }
              }).catch(() => {});
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
    try {
      await this.messagingProvider.sendMessage(
        { to: conversation.contactWaId, type: "text", content: confirmationText },
        tenant as any
      );
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

  public async handleRescheduleProposal(
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
      durationMin: rawBooking.durationMin || conversation.pendingBookingContext?.durationMin || 30,
      treatment: rawBooking.treatment || conversation.pendingBookingContext?.treatment || "Consultation générale",
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
      let errorContext = "";
      if (err.message?.includes("Le créneau n'est plus disponible") || err.message?.includes("SLOT_UNAVAILABLE")) {
        console.log("[AI Conversation] SLOT_UNAVAILABLE during reschedule — sending refusal message.");
        errorContext = `[SYSTEM: The slot chosen by the patient is no longer available (just taken by another patient). Inform the patient naturally in their language and ask if they want another time slot. Do NOT use any action, just a conversational reply.]`;
      } else if (err.message?.startsWith("Active_Appointment_Exists")) {
        console.log("[AI Conversation] Active_Appointment_Exists during reschedule — sending refusal message.");
        const parts = err.message.split(":");
        errorContext = `[SYSTEM: The patient already has an active appointment on ${parts[1]} at ${parts.slice(2).join(":")}. Inform them naturally in their language that a reschedule is not possible due to this conflict.]`;
      } else {
        console.error("[AI Conversation] Reschedule failed:", err.message);
        errorContext = `[SYSTEM: The reschedule operation failed due to a technical issue. Apologize briefly in the patient's language and ask them to provide more details or try again.]`;
      }
      // Re-use the AI's already-detected language by injecting the error context into the reply field
      const errorReply = await this.generateErrorReply(tenantId, conversation, errorContext);
      const errorResult = { ...result, reply: errorReply, suggestion: errorReply, structured: true, action: undefined };
      await this.sendConversationalReply(tenantId, conversationId, conversation, errorResult as any);
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

    let confirmationText = result.suggestion;
    if (!confirmationText || !confirmationText.includes(updatedAppointment.startTime)) {
      const recentInboundMsgs = await Message.find({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        conversationId: new mongoose.Types.ObjectId(conversationId),
        direction: "inbound",
      }).sort({ createdAt: -1 }).limit(5).lean();

      const combinedText = recentInboundMsgs.map((m: any) => m.content).join(" ");
      const __pat2 = await Patient.findById(conversation.patientId).select("language").lean();
      const detectedLang = detectLanguageFromText(combinedText, (__pat2 as any)?.language || "arabizi");
      // "arabizi" = Tunisian Latin → use arabizi template
      // "ar" = Arabic script → use Arabic script template
      // "fr" = French
      const finalLang = detectedLang === "arabizi" ? "arabizi" : (detectedLang === "ar" ? "ar" : targetLanguage);

      confirmationText = await buildConfirmationMessage(
        "reschedule",
        {
          date: updatedAppointment.date,
          startTime: updatedAppointment.startTime,
          endTime: updatedAppointment.endTime,
          treatment: updatedAppointment.treatment,
        },
        patientDisplayName,
        conversationId,
        finalLang
      );
    }

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
   * Generates a natural-language error reply in the patient's detected language.
   * Calls the AI directly with a plain-text request (no JSON schema) and the
   * conversation history, so it replies naturally in whatever language the patient
   * uses — French, Tunisian arabizi, Arabic, English — with zero hardcoded strings.
   */


  public async handleConfirmAppointmentProposal(
    tenantId: string,
    conversationId: string,
    conversation: any,
    result: AISuggestionResult,
    inboundWaId?: string
  ): Promise<boolean> {
    const patientId = conversation.patientId;
    if (!patientId) return false;

    // CRITICAL GUARD 1: If a pendingBookingContext or pendingBookingIntent is present,
    // the patient is in the middle of a new booking flow (e.g. selecting a slot for a
    // family member). Bail out so the booking flow can handle it.
    if (conversation.pendingBookingContext || conversation.pendingBookingIntent?.awaitingTargetIdentity) {
      console.log("[AI Conversation] handleConfirmAppointmentProposal: pendingBooking in progress — skipping confirm handler.");
      return false;
    }

    // CRITICAL GUARD 2: Only handle confirmation when the patient EXPLICITLY sent a
    // confirmation word AND was replying to a reminder message (quotedProviderMessageId).
    // If there's no quoted reminder, we must ask the patient first via pendingActionConfirmation.
    const latestForConfirm = await Message.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      conversationId: new mongoose.Types.ObjectId(conversationId),
      direction: "inbound",
    }).sort({ createdAt: -1 }).lean();
    const latestTextForConfirm = (latestForConfirm?.content || "").trim().toLowerCase();
    const EXPLICIT_CONFIRM_WORDS = [
      "oui", "behi", "ey", "na3am", "ok", "confirme", "confirmer",
      "d'accord", "daccord", "mriguel", "belehy", "\u0646\u0639\u0645", "\u0646\u0624\u0643\u062f",
    ];
    const isExplicitConfirmText = EXPLICIT_CONFIRM_WORDS.some(kw => {
      // Create a regex to match the exact word to avoid partial matches like "behi" inside another word
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      return regex.test(latestTextForConfirm);
    });

    // Check if this was a reply to a reminder message
    let isReplyToReminder = false;
    let reminderApptId: string | null = null;
    if (inboundWaId) {
      try {
        const inboundMsg = await Message.findOne({ providerMessageId: inboundWaId }).lean();
        if (inboundMsg && (inboundMsg as any).quotedProviderMessageId) {
          const quotedMsg = await Message.findOne({
            providerMessageId: (inboundMsg as any).quotedProviderMessageId
          }).lean();
          if (quotedMsg && (quotedMsg as any).appointmentId) {
            isReplyToReminder = true;
            reminderApptId = (quotedMsg as any).appointmentId.toString();
          }
        }
      } catch (_) { }
    }

    const today = new Date().toISOString().slice(0, 10);

    // Case A: Explicit confirmation AND replying to a reminder → confirm directly
    if (isExplicitConfirmText && isReplyToReminder && reminderApptId) {
      const appt = await Appointment.findOne({
        _id: new mongoose.Types.ObjectId(reminderApptId),
        tenantId: new mongoose.Types.ObjectId(tenantId),
      });
      if (!appt) return false;
      appt.status = "confirmed";
      await appt.save();
      const targetPatient = await Patient.findById(appt.patientId).lean();
      const patientName = (targetPatient as any)?.firstName || "";
      const reply = await this.generateErrorReply(tenantId, conversation, `[SYSTEM: The appointment for ${patientName || "the patient"} on ${appt.date} at ${appt.startTime} has just been confirmed. Inform the patient naturally in their language.]`);
      await this.sendConversationalReply(tenantId, conversationId, conversation, { ...result, suggestion: reply, structured: true }, inboundWaId);
      return true;
    }

    // Case B: Patient says "oui" but not as a reply to a reminder → ask which appointment
    // they want to confirm, using pendingActionConfirmation.
    if (isExplicitConfirmText && !isReplyToReminder) {
      // Find the nearest unconfirmed appointment for this patient (or family)
      const familyPatsConfirm = await Patient.find({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        phone: conversation.contactWaId,
      }).select("_id").lean();
      const familyPatIdsConfirm = familyPatsConfirm.map((p) => p._id);

      const apptToAsk = await Appointment.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        patientId: { $in: familyPatIdsConfirm.length > 0 ? familyPatIdsConfirm : [new mongoose.Types.ObjectId(patientId)] },
        date: { $gte: today },
        status: "scheduled",
      }).populate("patientId", "firstName").sort({ date: 1, startTime: 1 });

      if (!apptToAsk) return false;

      const apptPatName = (apptToAsk.patientId as any)?.firstName || "";
      const apptSummaryConfirm = `${apptPatName ? apptPatName + " - " : ""}${apptToAsk.date} à ${apptToAsk.startTime}`;

      await Conversation.findByIdAndUpdate(conversationId, {
        $set: {
          pendingActionConfirmation: {
            type: "confirm_appointment_status",
            appointmentId: apptToAsk._id.toString(),
            appointmentSummary: apptSummaryConfirm,
          }
        }
      });

      const __pat3 = await Patient.findById(conversation.patientId).select("language").lean();
      const detLangCAsk = detectLanguageFromText(latestTextForConfirm, (__pat3 as any)?.language || "arabizi");
      const isArCAsk = detLangCAsk === "ar" || detLangCAsk === "arabizi";
      const askReply = isArCAsk
        ? `Theb t'akkid rendez-vous (${apptSummaryConfirm}) ? Redd "oui" bech nakkadou.`
        : `Souhaitez-vous confirmer le rendez-vous (${apptSummaryConfirm}) ? Répondez "oui" pour confirmer.`;
      await this.sendConversationalReply(tenantId, conversationId, conversation, { ...result, suggestion: askReply, structured: true }, inboundWaId);
      return true;
    }

    // Case C: AI inferred confirm_appointment but patient didn't say an explicit word
    // → Do NOT auto-confirm. Return false so the conversational reply is sent instead.
    console.log("[AI Conversation] handleConfirmAppointmentProposal: no explicit confirmation word — not auto-confirming.");
    return false;
  }

}