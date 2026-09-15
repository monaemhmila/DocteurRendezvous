import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/requireAuth";
export declare const createTenant: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getTenants: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getCurrentTenant: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=tenant.controller.d.ts.map