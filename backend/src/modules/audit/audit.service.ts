import { AuditLog } from "./audit.model";
import { Request } from "express";

export class AuditService {
  /**
   * Logs a user action for compliance (GDPR/HIPAA).
   */
  public async logAction(params: {
    req: Request; // Requires req.user to be populated by auth middleware
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: object;
  }): Promise<void> {
    try {
      const user = (params.req as any).user;
      if (!user) {
        console.warn("[Audit] Attempted to log action without authenticated user");
        return;
      }

      let ip = params.req.ip;
      if (!ip && params.req.headers["x-forwarded-for"]) {
        const forwarded = params.req.headers["x-forwarded-for"];
        ip = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      }

      await AuditLog.create({
        tenantId: user.tenantId,
        userId: user.id,
        userRole: user.role,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        details: params.details ? JSON.stringify(params.details) : undefined,
        ipAddress: ip,
      });
    } catch (err) {
      console.error("[Audit] Failed to create audit log:", err);
      // We do not throw here to prevent breaking the main business flow if auditing fails
    }
  }
}

export const auditService = new AuditService();
