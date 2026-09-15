import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/requireAuth";
export declare const getDashboardStats: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=stats.controller.d.ts.map