import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/requireAuth";
export declare const recoveryController: {
    getOpportunities: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    getOpportunityById: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    createOpportunity: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    updateOpportunity: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    markContacted: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    markResponded: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    markBooked: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    markVisited: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    dismissOpportunity: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    detectOpportunities: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    getStats: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
};
//# sourceMappingURL=recovery.controller.d.ts.map