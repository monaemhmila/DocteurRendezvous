import { Tenant } from "../tenants/tenant.model";
import { Patient } from "../patients/patient.model";
import { Conversation, Message } from "./communication.model";
import { aiAutoBookingService } from "../ai/ai.auto-booking.service";

export class CommunicationService {
  /**
   * Handle an individual incoming message
   */
  public async handleIncomingMessage(tenantId: string, msg: any, value: any) {
    const wamid = msg.id;
    const from = msg.from; // Contact's WhatsApp ID (phone number)
    
    // Attempt to resolve patient (Patient Matching)
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
