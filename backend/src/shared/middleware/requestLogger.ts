/**
 * Request Logger — DocteurRendezvous
 *
 * Provides structured per-request logging with:
 *   - Unique request ID (X-Request-Id header, echoed in response)
 *   - Tenant ID (from JWT, if auth middleware has run)
 *   - HTTP method, path, status, duration (ms)
 *   - Skips health check endpoints to avoid log noise
 *
 * Usage: mount BEFORE all routes in server.ts
 *   app.use(requestLogger);
 */

import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
      startedAt?: number;
    }
  }
}

const SKIP_PATHS = new Set(["/health/live", "/health/ready", "/health"]);

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (SKIP_PATHS.has(req.path)) {
    next();
    return;
  }

  const requestId = (req.headers["x-request-id"] as string | undefined) || crypto.randomUUID();
  req.requestId = requestId;
  req.startedAt = Date.now();

  // Echo the request ID so clients can correlate logs
  res.setHeader("X-Request-Id", requestId);

  res.on("finish", () => {
    const durationMs = Date.now() - (req.startedAt ?? Date.now());
    const tenantId = (req as any).user?.tenantId ?? "-";
    const level = res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARN" : "INFO";

    console.log(
      JSON.stringify({
        level,
        ts: new Date().toISOString(),
        requestId,
        tenantId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs,
      })
    );
  });

  next();
}
