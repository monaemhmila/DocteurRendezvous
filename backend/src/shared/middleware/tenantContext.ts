import { Response, NextFunction } from "express";
import { AuthRequest } from "./requireAuth";

// This middleware ensures that whenever a user makes a request, 
// we explicitly filter database queries by their tenantId.
export const tenantContext = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.tenantId) {
    return res.status(403).json({ error: "Forbidden: No tenant context found" });
  }
  
  // You can attach tenantId to a specific locals object or just rely on req.user.tenantId
  res.locals.tenantId = req.user.tenantId;
  next();
};
