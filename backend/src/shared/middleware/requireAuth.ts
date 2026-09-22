import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    tenantId: string;
    role: string;
  };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    // Fail closed: never authenticate with a built-in/default signing secret.
    console.error("[Auth] JWT_SECRET is missing or too weak.");
    return res.status(503).json({ error: "Authentication service is not configured" });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
  }

  try {
    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] }) as JwtPayload;

    if (typeof decoded.id !== "string" || typeof decoded.role !== "string") {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    req.user = {
      id: decoded.id,
      tenantId: decoded.tenantId || "",
      role: decoded.role,
    };
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};
