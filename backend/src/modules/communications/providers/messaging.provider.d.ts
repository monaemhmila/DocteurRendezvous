import { ITenant } from "../../tenants/tenant.model";
export interface SendMessageParams {
    to: string;
    type: "text" | "template";
    content: string;
}
export interface WebhookPayload {
    object: string;
    entry: any[];
}
export interface IMessagingProvider {
    sendMessage(params: SendMessageParams, tenant: ITenant): Promise<{
        providerMessageId: string;
    }>;
}
export declare class MetaWhatsAppProvider implements IMessagingProvider {
    private readonly baseUrl;
    sendMessage(params: SendMessageParams, tenant: ITenant): Promise<{
        providerMessageId: string;
    }>;
}
//# sourceMappingURL=messaging.provider.d.ts.map