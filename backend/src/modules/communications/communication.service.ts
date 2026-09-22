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
        const displayPhoneNumber = value.metadata?.display_phone_number;
        
        if (!phoneNumberId && !displayPhoneNumber) continue;

        // Secure Tenant Resolution (Multi-tenant)
        // 1. Direct match on configured Meta phoneNumberId
        let tenant = phoneNumberId 
          ? await Tenant.findOne({ "settings.whatsappConfig.phoneNumberId": phoneNumberId })
          : null;

        // 2. Match by display_phone_number against tenant's configured WhatsApp phone or clinic phone
        if (!tenant && displayPhoneNumber) {
          const cleanDisplay = displayPhoneNumber.replace(/\D/g, "");
          const allTenants = await Tenant.find({ status: { $in: ["active", "trial"] } });
          
          for (const t of allTenants) {
            const rawWaPhone = t.settings?.whatsappConfig?.phoneNumber || "";
            const rawClinicPhone = t.phone || "";
            const cleanWaPhone = rawWaPhone.replace(/\D/g, "");
            const cleanClinicPhone = rawClinicPhone.replace(/\D/g, "");

            if (
              (cleanWaPhone && (cleanWaPhone === cleanDisplay || cleanDisplay.endsWith(cleanWaPhone) || cleanWaPhone.endsWith(cleanDisplay))) ||
              (cleanClinicPhone && (cleanClinicPhone === cleanDisplay || cleanDisplay.endsWith(cleanClinicPhone) || cleanClinicPhone.endsWith(cleanDisplay)))
            ) {
              tenant = t;
              console.log(`[Webhook] Matched tenant "${t.name}" by WhatsApp phone number (${cleanDisplay})`);
              break;
            }
          }
        }

        // 3. Fallback to active tenant if only 1 exists or as safe default
        if (!tenant) {
          tenant = await Tenant.findOne({ status: "active" });
        }

        if (!tenant) {
          console.warn(`[Webhook] No active clinic tenant found in database for incoming WhatsApp event.`);
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
            // If patient does not exist, auto-create a patient record with lead status so AI can intake, book & respond
            let patient = await Patient.findOne({ tenantId, phone: from });
            if (!patient) {
              const nameFromProfile = value.contacts?.[0]?.profile?.name || "Patient";
              const parts = nameFromProfile.trim().split(" ");
              patient = await Patient.create({
                tenantId,
                phone: from,
                firstName: parts[0] || "Patient",
                lastName: parts.slice(1).join(" ") || "WhatsApp",
                language: "fr",
                status: "lead",
              });
              console.log(`[Webhook] Auto-created new patient record for WhatsApp number ${from}: ${patient.firstName} ${patient.lastName}`);
            }

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
              await Message.create({
                tenantId,
                conversationId: conversation?._id,
                patientId: patient?._id,
                direction: "inbound",
                status: "received",
                content,
                providerMessageId: wamid,
              });

              // Trigger the AI conversation flow
              if (conversation?._id) {
                try {
                  console.log(`[Webhook] Processing AI auto-booking for WhatsApp message: "${content}"`);
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
