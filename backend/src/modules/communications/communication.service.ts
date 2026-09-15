import { Tenant } from "../tenants/tenant.model";
import { Patient } from "../patients/patient.model";
import { Conversation, Message } from "./communication.model";
import { aiAutoBookingService } from "../ai/ai.auto-booking.service";

export class CommunicationService {
  /**
   * Process a Meta WhatsApp Cloud API webhook payload
   */
  public async handleWebhook(payload: any) {
    if (payload.object !== "whatsapp_business_account") {
      return;
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field !== "messages") continue;
        
        const value = change.value;
        const phoneNumberId = value.metadata?.phone_number_id;
        
        if (!phoneNumberId) continue;

        // Secure Tenant Resolution
        // We never trust a tenantId from the payload. We strictly resolve it via the phone_number_id mapping.
        const tenant = await Tenant.findOne({ "settings.whatsappConfig.phoneNumberId": phoneNumberId });
        if (!tenant) {
          console.warn(`[Webhook] No tenant found for phone_number_id: ${phoneNumberId}`);
          continue;
        }

        const tenantId = tenant._id;

        // 1. Handle incoming messages
        if (value.messages && Array.isArray(value.messages)) {
          for (const msg of value.messages) {
            const wamid = msg.id;
            const from = msg.from; // Contact's WhatsApp ID (phone number)
            
            // Check idempotency first to avoid race conditions
            const existingMsg = await Message.findOne({ providerMessageId: wamid });
            if (existingMsg) {
              console.log(`[Webhook] Duplicate message received: ${wamid}`);
              continue;
            }

            // Attempt to resolve patient (Patient Matching)
            // In a real scenario, phones might need normalization. 
            // We just use basic matching as instructed, no patient creation.
            const patient = await Patient.findOne({ tenantId, phone: from });

            let content = "";
            if (msg.type === "text") {
              content = msg.text.body;
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
                    ...(patient ? { patientId: patient._id } : {}) 
                  }
                },
                { upsert: true, returnDocument: 'after', new: true }
              );
            } catch (convErr: any) {
              console.error(`[Webhook] Conversation upsert error:`, convErr.message);
              throw convErr;
            }

            // Create message
            try {
              await Message.create({
                tenantId,
                conversationId: conversation?._id,
                patientId: patient?._id,
                direction: "inbound",
                status: "received",
                content,
                providerMessageId: wamid,
              });

              // Trigger the AI conversation flow (blocking for tests/traceability)
              // We only trigger this if the message is from a known patient
              // (booking requires a patient context).
              // The inbound wamid is passed so the AI reply gets a deterministic,
              // idempotent outbound message id (ai-reply-<wamid>).
              if (patient?._id && conversation?._id) {
                try {
                  await aiAutoBookingService.processInboundMessage(
                    tenantId.toString(),
                    conversation._id.toString(),
                    (msg.id as string) ?? undefined
                  );
                } catch (err) {
                  console.error("[Webhook] AI Conversation error:", err);
                }
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
        }

        // 2. Handle message status updates (sent, delivered, read, failed)
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const statusObj of value.statuses) {
            const wamid = statusObj.id;
            const status = statusObj.status; // sent, delivered, read, failed

            const msgToUpdate = await Message.findOne({ providerMessageId: wamid });
            if (msgToUpdate) {
              // Ensure we don't update if it crosses tenants, although wamid is globally unique per meta.
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
      }
    }
  }
}

export const communicationService = new CommunicationService();
