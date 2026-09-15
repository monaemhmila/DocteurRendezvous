import { Request, Response } from "express";
export declare const verifyWebhook: (req: Request, res: Response) => Response<any, Record<string, any>>;
export declare const handleWebhookEvent: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=webhook.controller.d.ts.map