"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.communicationService = exports.CommunicationService = void 0;
const tenant_model_1 = require("../tenants/tenant.model");
const patient_model_1 = require("../patients/patient.model");
const communication_model_1 = require("./communication.model");
const ai_auto_booking_service_1 = require("../ai/ai.auto-booking.service");
class CommunicationService {
    /**
     * Process a Meta WhatsApp Cloud API webhook payload
     */
    async handleWebhook(payload) {
        if (payload.object !== "whatsapp_business_account") {
            return;
        }
        for (const entry of payload.entry) {
            for (const change of entry.changes) {
                if (change.field !== "messages")
                    continue;
                const value = change.value;
                const phoneNumberId = value.metadata?.phone_number_id;
                if (!phoneNumberId)
                    continue;
                // Secure Tenant Resolution
                // We never trust a tenantId from the payload. We strictly resolve it via the phone_number_id mapping.
                const tenant = await tenant_model_1.Tenant.findOne({ "settings.whatsappConfig.phoneNumberId": phoneNumberId });
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
                        const existingMsg = await communication_model_1.Message.findOne({ providerMessageId: wamid });
                        if (existingMsg) {
                            console.log(`[Webhook] Duplicate message received: ${wamid}`);
                            continue;
                        }
                        // Attempt to resolve patient (Patient Matching)
                        // In a real scenario, phones might need normalization. 
                        // We just use basic matching as instructed, no patient creation.
                        const patient = await patient_model_1.Patient.findOne({ tenantId, phone: from });
                        let content = "";
                        if (msg.type === "text") {
                            content = msg.text.body;
                        }
                        else {
                            content = `[Message type: ${msg.type}]`;
                        }
                        // Find or create conversation
                        let conversation;
                        try {
                            conversation = await communication_model_1.Conversation.findOneAndUpdate({ tenantId, contactWaId: from }, {
                                $setOnInsert: { channel: "whatsapp" },
                                $set: {
                                    status: "active",
                                    lastMessageAt: new Date(),
                                    ...(patient ? { patientId: patient._id } : {})
                                }
                            }, { upsert: true, returnDocument: 'after', new: true });
                        }
                        catch (convErr) {
                            console.error(`[Webhook] Conversation upsert error:`, convErr.message);
                            throw convErr;
                        }
                        // Create message
                        try {
                            await communication_model_1.Message.create({
                                tenantId,
                                conversationId: conversation?._id,
                                patientId: patient?._id,
                                direction: "inbound",
                                status: "received",
                                content,
                                providerMessageId: wamid,
                            });
                            // Trigger auto-booking flow (blocking for tests/traceability)
                            // We only trigger this if the message is from a known patient
                            // (booking requires a patient context)
                            if (patient?._id && conversation?._id) {
                                try {
                                    await ai_auto_booking_service_1.aiAutoBookingService.processInboundMessage(tenantId.toString(), conversation._id.toString());
                                }
                                catch (err) {
                                    console.error("[Webhook] AutoBooking error:", err);
                                }
                            }
                        }
                        catch (err) {
                            // Catch duplicate key error in case of parallel webhook execution
                            if (err.code === 11000) {
                                console.log(`[Webhook] Concurrent duplicate message received: ${wamid}`);
                            }
                            else {
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
                        const msgToUpdate = await communication_model_1.Message.findOne({ providerMessageId: wamid });
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
exports.CommunicationService = CommunicationService;
exports.communicationService = new CommunicationService();
//# sourceMappingURL=communication.service.js.map