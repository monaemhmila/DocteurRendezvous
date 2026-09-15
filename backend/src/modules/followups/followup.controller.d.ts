import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/requireAuth";
export declare const followupController: {
    getTasks: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    getTaskById: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    createTask: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    completeTask: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    logAttempt: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    getAttemptsForRecovery: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    getAttemptsForWaitlistEntry: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
};
//# sourceMappingURL=followup.controller.d.ts.map