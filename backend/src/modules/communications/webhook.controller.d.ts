import { Request, Response } from "express";
interface RawBodyRequest extends Request {
    rawBody?: Buffer;
}
export declare const verifyWebhook: (req: Request, res: Response) => Response<any, Record<string, any>>;
export declare const handleWebhookEvent: (req: RawBodyRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export {};
//# sourceMappingURL=webhook.controller.d.ts.map