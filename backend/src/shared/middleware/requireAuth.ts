import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { User } from "../../modules/users/user.model";
import { Tenant } from "../../modules/tenants/tenant.model";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    tenantId: string;
    role: string;
  };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    console.error("[Auth] JWT_SECRET is missing or too weak.");
    return res.status(503).json({ error: "Authentication service is not configured" });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
  }

  try {
    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] }) as JwtPayload;

    if (typeof decoded.id !== "string") {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    const user = await User.findById(decoded.id).lean();
    if (!user || user.status !== "active") {
      return res.status(401).json({ error: "Unauthorized: User is inactive or deleted" });
    }

    if (user.tenantId && user.role !== "super_admin") {
      const tenant = await Tenant.findById(user.tenantId).lean();
      if (!tenant || tenant.status !== "active") {
        return res.status(403).json({ error: "Forbidden: Tenant is not available" });
      }
    }

    req.user = {
      id: user._id.toString(),
      tenantId: user.tenantId ? user.tenantId.toString() : "",
      role: user.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: "Unauthorized: No user role found" });
    }
    if (!roles.includes(req.user.role) && req.user.role !== "super_admin") {
      return res.status(403).json({ error: "Forbidden: Insufficient role permissions" });
    }
    next();
  };
};
