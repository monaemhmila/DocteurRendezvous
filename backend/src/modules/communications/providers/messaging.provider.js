"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaWhatsAppProvider = void 0;
class MetaWhatsAppProvider {
    baseUrl = "https://graph.facebook.com/v19.0";
    async sendMessage(params, tenant) {
        const config = tenant.settings?.whatsappConfig;
        if (!config?.accessToken || !config?.phoneNumberId) {
            throw new Error("WhatsApp configuration missing for this tenant");
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
            const response = await fetch(`${this.baseUrl}/${config.phoneNumberId}/messages`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${config.accessToken}`,
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