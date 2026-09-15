import { Response, NextFunction } from "express";
import { AuthRequest } from "./requireAuth";
export declare const tenantContext: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=tenantContext.d.ts.map