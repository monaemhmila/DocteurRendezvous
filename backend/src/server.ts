import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Request } from "express";
import connectDB from "./shared/db";
import { requestLogger } from "./shared/middleware/requestLogger";
import authRoutes from "./modules/auth/auth.routes";
import tenantRoutes from "./modules/tenants/tenant.routes";
import patientRoutes from "./modules/patients/patient.routes";
import appointmentRoutes from "./modules/appointments/appointment.routes";
import statsRoutes from "./modules/stats/stats.routes";
import recoveryRoutes from "./modules/recovery/recovery.routes";
import followupRoutes from "./modules/followups/followup.routes";
import waitlistRoutes from "./modules/waitlist/waitlist.routes";
import userRoutes from "./modules/users/user.routes";
import communicationRoutes from "./modules/communications/communication.routes";
import aiRoutes from "./modules/ai/ai.routes";
import sseRoutes from "./modules/communications/sse.routes";
import auditRoutes from "./modules/audit/audit.routes";
import prescriptionRoutes from "./modules/prescriptions/prescription.routes";
import subscriptionRoutes from "./modules/subscriptions/subscription.routes";
import { apiLimiter } from "./shared/middleware/rateLimiter";
import bcrypt from "bcrypt";
import { User } from "./modules/users/user.model";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// ── Reverse proxy trust ────────────────────────────────────────────────────
// Required for express-rate-limit to read X-Forwarded-For correctly.
// dev=1 (ngrok), prod: adjust TRUST_PROXY_HOPS in .env (e.g. 2 for nginx+ALB)
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS ?? 1));

// ── Health probes (P2-01) — no auth, no rate-limit, before logger ──────────
// GET /health/live   — process is alive (k8s liveness probe)
// GET /health/ready  — DB connected and ready for traffic (k8s readiness probe)
// GET /health        — legacy alias (backward compat)
app.get("/health/live", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/health/ready", async (_req, res) => {
  const dbState = mongoose.connection.readyState;
  if (dbState !== 1) {
    return res.status(503).json({
      status: "unavailable",
      reason: "mongodb_not_connected",
      dbState,
    });
  }
  res.status(200).json({ status: "ok", dbState });
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date() });
});

// ── Structured request logger (P2-03) ─────────────────────────────────────
// Emits one JSON line per request: requestId, tenantId, method, path, status, durationMs
// Health endpoints are skipped. X-Request-Id header echoed to clients.
app.use(requestLogger);

// ── CORS ───────────────────────────────────────────────────────────────────
const corsOriginEnv = process.env.CORS_ORIGIN;
const allowedOrigins = corsOriginEnv
  ? corsOriginEnv.split(",").map((s) => s.trim())
  : ["http://localhost:8080", "http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else if (process.env.NODE_ENV !== "production") {
        // In development allow all origins for ease of testing
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "50mb",
    verify: (req: Request, _res: express.Response, buf: Buffer) => {
      (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
    },
  })
);

// Static file serving of /uploads is disabled. All files must be accessed securely via /api/v1/patients/:id/files/:fileId/download

// ── Routes ─────────────────────────────────────────────────────────────────
// Auth and webhook routes FIRST — they carry their own tighter/looser limiters.
app.use("/api/v1/auth", authRoutes);            // loginLimiter + refreshTokenLimiter inside
app.use("/api/v1/communications", communicationRoutes); // webhookLimiter inside
app.use("/api/v1/ai", aiRoutes);                // aiLimiter inside

// General API limiter — safety net for all other authenticated routes.
app.use("/api/v1", apiLimiter);

app.use("/api/v1/tenants", tenantRoutes);
app.use("/api/v1/patients", patientRoutes);
app.use("/api/v1/appointments", appointmentRoutes);
app.use("/api/v1/stats", statsRoutes);
app.use("/api/v1/recovery", recoveryRoutes);
app.use("/api/v1/follow-ups", followupRoutes);
app.use("/api/v1/waitlist", waitlistRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/notifications", sseRoutes);
app.use("/api/v1/audit-logs", auditRoutes);
app.use("/api/v1/prescriptions", prescriptionRoutes);
app.use("/api/v1/subscriptions", subscriptionRoutes);

// ── 404 ────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: express.Response) => {
  res.status(404).json({ error: "Not Found" });
});

// ── Demo / super-admin seed ────────────────────────────────────────────────
async function ensureDemoAccounts() {
  try {
    const adminEmail = (process.env.SUPER_ADMIN_EMAIL || "admin@medical-ai.com").toLowerCase().trim();
    if (!(await User.findOne({ email: adminEmail }))) {
      const passwordHash = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD || "admin123", 10);
      await User.create({ email: adminEmail, passwordHash, firstName: "Super", lastName: "Admin", role: "super_admin" });
      console.log(`👑 Super Admin account ensured: ${adminEmail}`);
    }

    const demoEmails = ["demo@dentaire-tunis.com", "demo@cabinet-cardio.com"];
    for (const email of demoEmails) {
      if (!(await User.findOne({ email }))) {
        console.log(`⚠️  Demo account missing for ${email} — auto-seed disabled to prevent data loss.`);
        break;
      }
    }
  } catch (err) {
    console.error("Failed to ensure demo accounts:", err);
  }
}

// ── Graceful shutdown (P2-02) ──────────────────────────────────────────────
/**
 * Handles SIGTERM (Docker / k8s stop) and SIGINT (Ctrl+C):
 *   1. Stop accepting new HTTP connections
 *   2. Stop background workers (webhook worker, outbox worker, reminder timer)
 *   3. Close MongoDB connection
 *   4. Exit cleanly
 *
 * Hard-kill fires after SHUTDOWN_TIMEOUT_MS (default 10 s) to prevent hangs.
 */
let workerRef: { stop: () => void } | null = null;
let outboxWorkerRef: { stop: () => void } | null = null;
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS ?? 10_000);

async function gracefulShutdown(signal: string, httpServer: ReturnType<typeof app.listen>) {
  console.log(`\n[Server] ${signal} received — graceful shutdown (timeout: ${SHUTDOWN_TIMEOUT_MS} ms)`);

  const hard = setTimeout(() => {
    console.error("[Server] Shutdown timed out — forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  try {
    // 1. Stop HTTP server (drain existing requests, reject new ones)
    await new Promise<void>((resolve, reject) =>
      httpServer.close((err) => (err ? reject(err) : resolve()))
    );
    console.log("[Server] ✓ HTTP server closed");

    // 2. Stop background workers
    workerRef?.stop();
    outboxWorkerRef?.stop();
    console.log("[Server] ✓ Workers stopped");

    // 3. Close MongoDB
    await mongoose.connection.close();
    console.log("[Server] ✓ MongoDB connection closed");

    clearTimeout(hard);
    console.log("[Server] Graceful shutdown complete — exiting");
    process.exit(0);
  } catch (err) {
    console.error("[Server] Error during shutdown:", err);
    process.exit(1);
  }
}

// ── Startup ────────────────────────────────────────────────────────────────
const startServer = async () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  }
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI must be configured.");
  }

  await connectDB();
  await ensureDemoAccounts();

  const { reminderService } = await import("./modules/appointments/appointment.service");
  const { Appointment } = await import("./modules/appointments/appointment.model");
  const { WorkerService } = await import("./modules/jobs/worker.service");
  const { OutboxWorkerService } = await import("./modules/jobs/outbox-worker.service");
  const { retentionService } = await import("./modules/retention/retention.service");

  // Webhook job worker (processes inbound WhatsApp messages async)
  const workerService = new WorkerService();
  workerService.start();
  workerRef = workerService;

  // Outbox worker (sends WhatsApp confirmations enqueued by updateStatus)
  const outboxWorker = new OutboxWorkerService();
  outboxWorker.start();
  outboxWorkerRef = outboxWorker;

  await Appointment.syncIndexes();
  reminderService.startBackgroundWorker();
  
  // Start daily cleanup for GDPR/HIPAA compliance
  retentionService.startDailyCron();

  const httpServer = app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`   ENV=${process.env.NODE_ENV ?? "development"} | ASYNC_WEBHOOK=${process.env.ASYNC_WEBHOOK_PROCESSING ?? "false"} | MONGO_STANDALONE=${process.env.MONGO_STANDALONE ?? "false"}`);
  });

  // Register OS signal handlers for clean shutdown
  process.once("SIGTERM", () => gracefulShutdown("SIGTERM", httpServer));
  process.once("SIGINT",  () => gracefulShutdown("SIGINT",  httpServer));
};

startServer().catch((err) => {
  console.error("[Server] Fatal startup error:", err);
  process.exit(1);
});
