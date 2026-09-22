import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/requireAuth";
export declare const getConversations: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getConversationMessages: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const sendMessage: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const simulateInboundMessage: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=communication.controller.d.ts.map