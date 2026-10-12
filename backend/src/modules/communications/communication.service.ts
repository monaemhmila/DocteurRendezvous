import { Tenant } from "../tenants/tenant.model";
import { Patient } from "../patients/patient.model";
import { Conversation, Message } from "./communication.model";
import { aiAutoBookingService } from "../ai/ai.auto-booking.service";
import { aiDoctorService } from "../ai/ai.doctor.service";
import { audioTranscriptionService } from "../ai/audio-transcription.service";

import { createDebouncer } from "../ai/conversation-queue";

// ── Message Burst Debounce & Exclusive Queue ──────────────────────────────────
// Regroupe les messages rapprochés d'un même patient (3.5s sans dépasser 8s)
// et garantit un traitement STRICTEMENT séquentiel par conversation (runExclusive)
// pour éliminer les réponses en double et les conflits d'état MongoDB.
const conversationDebouncer = createDebouncer(3500, 8000);

export class CommunicationService {
  /**
   * Handle an individual incoming message
   */
  public async handleIncomingMessage(tenantId: string, msg: any, value: any) {
    const wamid = msg.id;
    const from = msg.from; // Contact's WhatsApp ID (phone number)
    
    // Check if sender is a registered doctor (bypass normal patient flow)
    const tenantDoc = await Tenant.findById(tenantId).lean();
    if (tenantDoc?.settings?.doctorPhones && Array.isArray(tenantDoc.settings.doctorPhones)) {
      const normalizedFrom = from.replace(/\D/g, "");
      const isDoctor = tenantDoc.settings.doctorPhones.some((p: string) => p.replace(/\D/g, "") === normalizedFrom);
      
      if (isDoctor) {
        console.log(`[Webhook] Recognized doctor phone ${from}. Routing to AI Doctor Service.`);
        // Find or create internal conversation
        let conversation;
        try {
          conversation = await Conversation.findOneAndUpdate(
            { tenantId, contactWaId: from },
            { 
              $setOnInsert: { channel: "whatsapp" },
              $set: { 
                status: "internal", 
                lastMessageAt: new Date(),
                needsHuman: false,
              }
            },
            { upsert: true, returnDocument: 'after' }
          );
        } catch (convErr: any) {
          console.error(`[Webhook] Doctor Conversation upsert error:`, convErr.message);
          throw convErr;
        }

        let content = "";
        if (msg.type === "text") {
          content = msg.text.body;
        } else if (msg.type === "audio") {
          const mediaId = msg.audio?.id;
          if (mediaId && tenantDoc) {
            console.log(`[Webhook Doctor] Transcribing audio note (mediaId: ${mediaId})...`);
            const hints = [tenantDoc.name || ""];
            const res = await audioTranscriptionService.transcribeVoiceNote(mediaId, tenantDoc as any, hints, from);
            if (res.ok) {
              content = res.text;
            } else {
              console.warn(`[Webhook Doctor] Voice note transcription failed (code: ${res.code})`);
              content = "[Message vocal non transcrit]";
            }
          }
          if (!content) {
            content = "[Message vocal non transcrit]";
          }
        }

        await Message.create({
          tenantId,
          conversationId: conversation._id,
          direction: "inbound",
          status: "received",
          content,
          providerMessageId: wamid,
          quotedProviderMessageId: msg.context?.id,
        });

        await aiDoctorService.processDoctorMessage(tenantId.toString(), conversation._id.toString(), msg.id);
        return;
      }
    }

    // Attempt to resolve patient (Patient Matching)
    let patient = await Patient.findOne({ tenantId, phone: from }).sort({ createdAt: 1 });
    if (!patient) {
      const nameFromProfile = value.contacts?.[0]?.profile?.name || "Patient";
      const parts = nameFromProfile.trim().split(" ");
      patient = await Patient.create({
        tenantId,
        phone: from,
        firstName: parts[0] || "Patient",
        lastName: parts.slice(1).join(" ") || "WhatsApp",
        language: "arabizi",
        status: "lead",
      });
      console.log(`[Webhook] Auto-created new patient record for WhatsApp number ${from}: ${patient.firstName} ${patient.lastName}`);
    }

    let isVoiceNoteInbound = false;
    let content = "";
    if (msg.type === "text") {
      content = msg.text.body;
    } else if (msg.type === "audio") {
      isVoiceNoteInbound = true;
      const mediaId = msg.audio?.id;
      if (mediaId && tenantDoc) {
        console.log(`[Webhook Patient] Transcribing voice note from ${from} (mediaId: ${mediaId})...`);
        const hints = [
          tenantDoc.name || "",
          ...(tenantDoc.settings?.doctors?.map((d: any) => d.name) || []),
        ].filter(Boolean);

        const res = await audioTranscriptionService.transcribeVoiceNote(mediaId, tenantDoc as any, hints, from);
        if (res.ok) {
          content = res.text;
        } else {
          console.warn(`[Webhook Patient] Voice note transcription failed (code: ${res.code})`);
          // Send helpful feedback to the patient
          try {
            const patientLang = (patient as any)?.language === "fr" ? "fr" : "tn-arabizi";
            const { t } = await import("../ai/tn-templates");
            let errorReply = t(patientLang as any, "voiceUnclear");

            if (res.code === "too_large") {
              errorReply = patientLang === "fr" 
                ? "Votre message vocal est trop volumineux (max 3 Mo). Pouvez-vous nous envoyer un vocal plus court ou écrire votre message ?"
                : "El vocal kbir barcha (max 3 Mo). Tnajem tab3ath vocal a9sar wala tekteb talabek ?";
            } else if (res.code === "too_long") {
              errorReply = patientLang === "fr"
                ? "Votre message vocal est trop long (max 2 minutes). Pouvez-vous nous envoyer un vocal plus court ou nous écrire ?"
                : "El vocal twil barcha (feyet 2 d9aye9). Tnajem tab3ath vocal a9sar wala tekteb ?";
            } else if (res.code === "rate_limited") {
              errorReply = patientLang === "fr"
                ? "Vous avez envoyé plusieurs messages vocaux récemment. Merci de patienter ou de nous écrire directement par message texte."
                : "B3atht barcha vocaux wara b3adhhom. Stanna chwaya wala ektebelna bel klem.";
            } else if (res.code === "unsupported_format") {
              errorReply = patientLang === "fr"
                ? "Le format de votre note vocale n'est pas pris en charge. Pouvez-vous nous écrire par message ?"
                : "El format mta3 el vocal mch ma9boul. Tnajem tekteb talabek ?";
            }

            const { MetaWhatsAppProvider } = await import("./providers/messaging.provider");
            const provider = new MetaWhatsAppProvider();
            await provider.sendMessage(
              {
                to: from,
                type: "text",
                content: errorReply,
              },
              tenantDoc as any
            );
          } catch (replyErr) {
            console.error(`[Webhook Patient] Failed to send transcription failure reply:`, replyErr);
          }

          content = "[Message vocal inaudible / non transcrit]";
        }
      }
      if (!content) {
        content = "[Message vocal non transcrit]";
      }
    } else if (msg.type === "interactive") {
      if (msg.interactive.type === "button_reply") {
        content = msg.interactive.button_reply.title;
      } else if (msg.interactive.type === "list_reply") {
        content = msg.interactive.list_reply.title;
      } else {
        content = `[Interactive: ${msg.interactive.type}]`;
      }
    } else {
      content = `[Message type: ${msg.type}]`;
    }

    // Find or create conversation
    let conversation;
    try {
      // ── FIX: if a pendingActionConfirmation is already active, do NOT
      // set pendingVoiceConfirmation — the patient is answering the
      // confirmation question, not starting a new booking request.
      let setPendingVoice = isVoiceNoteInbound;
      if (isVoiceNoteInbound) {
        const existingConv = await Conversation.findOne({ tenantId, contactWaId: from }).select("pendingActionConfirmation").lean();
        if ((existingConv as any)?.pendingActionConfirmation) {
          setPendingVoice = false;
          console.log(`[Webhook Patient] Voice note received but pendingActionConfirmation is active — skipping pendingVoiceConfirmation flag.`);
        }
      }

      conversation = await Conversation.findOneAndUpdate(
        { tenantId, contactWaId: from },
        { 
          $setOnInsert: { channel: "whatsapp" },
          $set: { 
            status: "active", 
            lastMessageAt: new Date(),
            needsHuman: false,
            ...(patient ? { patientId: patient._id } : {}),
            ...(setPendingVoice ? { pendingVoiceConfirmation: true } : {})
          }
        },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (convErr: any) {
      console.error(`[Webhook] Conversation upsert error:`, convErr.message);
      throw convErr;
    }

    // ── Session boundary: clear sessionStartedAt on first new message ─────────
    // When the secretary marks a RDV as "completed", sessionStartedAt is set so
    // the AI greets the patient fresh. Once the patient actually sends their first
    // new message, we clear sessionStartedAt — the session is now underway and
    // messages should accumulate normally until the next completion.
    if (conversation?.sessionStartedAt) {
      await Conversation.updateOne(
        { _id: conversation._id },
        { $unset: { sessionStartedAt: "" } }
      );
      console.log(`[Webhook] New session started for conversation ${conversation._id} — sessionStartedAt cleared.`);
    }
    // ─────────────────────────────────────────────────────────────────────────


    // Create message
    try {
      const newMessage = await Message.create({
        tenantId,
        conversationId: conversation?._id,
        patientId: patient?._id,
        direction: "inbound",
        status: "received",
        content,
        providerMessageId: wamid,
        quotedProviderMessageId: msg.context?.id,
      });

      if (conversation?._id) {
        import("./sse.service").then(({ sseService }) => {
          sseService.notifyNewMessage(
            tenantId.toString(),
            conversation._id.toString(),
            newMessage
          );
        });
      }

      // Trigger the AI conversation flow (debounced & runExclusive per conversation)
      if (conversation?._id) {
        const convId = conversation._id.toString();
        conversationDebouncer(convId, (msg.id as string) ?? "", async (wamids: string[]) => {
          const latestWamid = wamids[wamids.length - 1];
          try {
            console.log(`[Webhook] Debounced batch (${wamids.length} msgs) — processing AI for conversation ${convId}`);
            await aiAutoBookingService.processInboundMessage(
              tenantId.toString(),
              convId,
              latestWamid ?? undefined
            );
          } catch (err) {
            console.error("[Webhook] AI Conversation error (debounced):", err);
          }
        });
      }
    } catch (err: any) {
      // Catch duplicate key error in case of parallel webhook execution
      if (err.code === 11000) {
        console.log(`[Webhook] Concurrent duplicate message received: ${wamid}`);
      } else {
        throw err;
      }
    }
  }

  /**
   * Handle an individual message status update
   */
  public async handleMessageStatus(tenantId: string, statusObj: any) {
    const wamid = statusObj.id;
    const status = statusObj.status; // sent, delivered, read, failed

    const msgToUpdate = await Message.findOne({ providerMessageId: wamid });
    if (msgToUpdate) {
      // Ensure we don't update if it crosses tenants
      if (msgToUpdate.tenantId.toString() === tenantId.toString()) {
        msgToUpdate.status = status;
        if (statusObj.errors && statusObj.errors.length > 0) {
          msgToUpdate.error = JSON.stringify(statusObj.errors);
        }
        await msgToUpdate.save();
      }
    }
  }
}

export const communicationService = new CommunicationService();
