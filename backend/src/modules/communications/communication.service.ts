import { Tenant } from "../tenants/tenant.model";
import { Patient } from "../patients/patient.model";
import { Conversation, Message } from "./communication.model";
import { aiAutoBookingService } from "../ai/ai.auto-booking.service";
import { aiDoctorService } from "../ai/ai.doctor.service";

// ── Message Burst Debounce ────────────────────────────────────────────────────
// When a patient sends several messages in quick succession, we wait until they
// stop typing (DEBOUNCE_MS of silence) before triggering the AI — so the AI
// always sees the complete thought and only replies once.
// stop typing (DEBOUNCE_MS of silence) before triggering the AI — so the AI
// processes the combined messages as a single query.
const DEBOUNCE_MS = 5000;
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
// lastWamid per conversationId so we always pass the most recent message id to the AI
const debounceLastWamid = new Map<string, string>();

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
          content = "[Audio Message]"; // Doctor Service will handle transcription later if needed
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

    let content = "";
    if (msg.type === "text") {
      content = msg.text.body;
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
      conversation = await Conversation.findOneAndUpdate(
        { tenantId, contactWaId: from },
        { 
          $setOnInsert: { channel: "whatsapp" },
          $set: { 
            status: "active", 
            lastMessageAt: new Date(),
            needsHuman: false,
            ...(patient ? { patientId: patient._id } : {}) 
          }
        },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (convErr: any) {
      console.error(`[Webhook] Conversation upsert error:`, convErr.message);
      throw convErr;
    }

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

      // Trigger the AI conversation flow (debounced — waits for patient to finish typing)
      if (conversation?._id) {
        const convId = conversation._id.toString();
        // Track the most recent wamid so the AI always processes from the latest message
        debounceLastWamid.set(convId, (msg.id as string) ?? "");
        // Cancel any pending timer for this conversation
        const existing = debounceTimers.get(convId);
        if (existing) clearTimeout(existing);
        // Schedule a new timer — fires only after DEBOUNCE_MS of silence
        const timer = setTimeout(async () => {
          debounceTimers.delete(convId);
          const latestWamid = debounceLastWamid.get(convId);
          debounceLastWamid.delete(convId);
          try {
            console.log(`[Webhook] Debounce fired — processing AI for conversation ${convId}`);
            await aiAutoBookingService.processInboundMessage(
              tenantId.toString(),
              convId,
              latestWamid ?? undefined
            );
          } catch (err) {
            console.error("[Webhook] AI Conversation error (debounced):", err);
          }
        }, DEBOUNCE_MS);
        debounceTimers.set(convId, timer);
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
