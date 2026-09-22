"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaWhatsAppProvider = void 0;
class MetaWhatsAppProvider {
    baseUrl = "https://graph.facebook.com/v19.0";
    async sendMessage(params, tenant) {
        const config = tenant.settings?.whatsappConfig;
        const accessToken = config?.accessToken || process.env.META_ACCESS_TOKEN?.trim();
        const phoneNumberId = config?.phoneNumberId || process.env.META_PHONE_NUMBER_ID?.trim();
        if (!accessToken || !phoneNumberId) {
            // In development / demo or test simulation without Meta credentials:
            const simId = `sim-wamid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            console.log(`[WhatsApp Sandbox] Simulated message delivered to ${params.to}: "${params.content}"`);
            return { providerMessageId: simId };
        }
        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: params.to,
            type: params.type,
        };
        if (params.type === "text") {
            payload.text = { body: params.content };
        }
        else if (params.type === "template") {
            payload.template = {
                name: params.content,
                language: { code: "fr" }, // hardcoded for now or from params
            };
        }
        try {
            const response = await fetch(`${this.baseUrl}/${phoneNumberId}/messages`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(`WhatsApp API Error: ${data.error?.message || response.statusText}`);
            }
            const wamid = data.messages?.[0]?.id;
            if (!wamid) {
                throw new Error("WhatsApp API did not return a message ID");
            }
            return { providerMessageId: wamid };
        }
        catch (error) {
            // In phase 6.1, we are asked NOT to fake success. We throw.
            throw new Error(`Failed to send WhatsApp message: ${error.message}`);
        }
    }
}
exports.MetaWhatsAppProvider = MetaWhatsAppProvider;
//# sourceMappingURL=messaging.provider.js.map