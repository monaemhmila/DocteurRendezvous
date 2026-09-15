import { ITenant } from "../../tenants/tenant.model";

export interface SendMessageParams {
  to: string;
  type: "text" | "template";
  content: string; // Text content or template name
}

export interface WebhookPayload {
  object: string;
  entry: any[];
}

export interface IMessagingProvider {
  sendMessage(params: SendMessageParams, tenant: ITenant): Promise<{ providerMessageId: string }>;
  
  // This is a placeholder for the actual payload parsing logic
  // The service handles tenant resolution, the provider just formats the payload
  // into standard Conversation/Message formats if needed, or we just keep it
  // tightly coupled in the service for now since Phase 6.1 focuses on Meta.
}

export class MetaWhatsAppProvider implements IMessagingProvider {
  private readonly baseUrl = "https://graph.facebook.com/v19.0";

  public async sendMessage(params: SendMessageParams, tenant: ITenant): Promise<{ providerMessageId: string }> {
    const config = tenant.settings?.whatsappConfig;
    if (!config?.accessToken || !config?.phoneNumberId) {
      throw new Error("WhatsApp configuration missing for this tenant");
    }

    const payload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: params.to,
      type: params.type,
    };

    if (params.type === "text") {
      payload.text = { body: params.content };
    } else if (params.type === "template") {
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
    } catch (error: any) {
      // In phase 6.1, we are asked NOT to fake success. We throw.
      throw new Error(`Failed to send WhatsApp message: ${error.message}`);
    }
  }
}
