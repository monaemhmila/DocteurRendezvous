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
                const displayPhoneNumber = value.metadata?.display_phone_number;
                if (!phoneNumberId && !displayPhoneNumber)
                    continue;
                // Secure Tenant Resolution (Multi-tenant)
                // 1. Direct match on configured Meta phoneNumberId
                let tenant = phoneNumberId
                    ? await tenant_model_1.Tenant.findOne({ "settings.whatsappConfig.phoneNumberId": phoneNumberId })
                    : null;
                // 2. Match by display_phone_number against tenant's configured WhatsApp phone or clinic phone
                if (!tenant && displayPhoneNumber) {
                    const cleanDisplay = displayPhoneNumber.replace(/\D/g, "");
                    const allTenants = await tenant_model_1.Tenant.find({ status: { $in: ["active", "trial"] } });
                    for (const t of allTenants) {
                        const rawWaPhone = t.settings?.whatsappConfig?.phoneNumber || "";
                        const rawClinicPhone = t.phone || "";
                        const cleanWaPhone = rawWaPhone.replace(/\D/g, "");
                        const cleanClinicPhone = rawClinicPhone.replace(/\D/g, "");
                        if ((cleanWaPhone && (cleanWaPhone === cleanDisplay || cleanDisplay.endsWith(cleanWaPhone) || cleanWaPhone.endsWith(cleanDisplay))) ||
                            (cleanClinicPhone && (cleanClinicPhone === cleanDisplay || cleanDisplay.endsWith(cleanClinicPhone) || cleanClinicPhone.endsWith(cleanDisplay)))) {
                            tenant = t;
                            console.log(`[Webhook] Matched tenant "${t.name}" by WhatsApp phone number (${cleanDisplay})`);
                            break;
                        }
                    }
                }
                // 3. Fallback to active tenant if only 1 exists or as safe default
                if (!tenant) {
                    tenant = await tenant_model_1.Tenant.findOne({ status: "active" });
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
                        const existingMsg = await communication_model_1.Message.findOne({ providerMessageId: wamid });
                        if (existingMsg) {
                            console.log(`[Webhook] Duplicate message received: ${wamid}`);
                            continue;
                        }
                        // Attempt to resolve patient (Patient Matching)
                        // If patient does not exist, auto-create a patient record with lead status so AI can intake, book & respond
                        let patient = await patient_model_1.Patient.findOne({ tenantId, phone: from });
                        if (!patient) {
                            const nameFromProfile = value.contacts?.[0]?.profile?.name || "Patient";
                            const parts = nameFromProfile.trim().split(" ");
                            patient = await patient_model_1.Patient.create({
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
                                    needsHuman: false,
                                    ...(patient ? { patientId: patient._id } : {})
                                }
                            }, { upsert: true, returnDocument: 'after' });
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
                            // Trigger the AI conversation flow
                            if (conversation?._id) {
                                try {
                                    console.log(`[Webhook] Processing AI auto-booking for WhatsApp message: "${content}"`);
                                    await ai_auto_booking_service_1.aiAutoBookingService.processInboundMessage(tenantId.toString(), conversation._id.toString(), msg.id ?? undefined);
                                }
                                catch (err) {
                                    console.error("[Webhook] AI Conversation error:", err);
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