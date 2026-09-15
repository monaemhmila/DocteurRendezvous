import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/requireAuth";
export declare const waitlistController: {
    getEntries: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    createEntry: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    cancelEntry: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    fulfillEntry: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
};
//# sourceMappingURL=waitlist.controller.d.ts.map