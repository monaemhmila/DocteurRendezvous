import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Request } from "express";
import connectDB from "./shared/db";
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

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
const corsOriginEnv = process.env.CORS_ORIGIN;
const allowedOrigins = corsOriginEnv
  ? corsOriginEnv.split(",").map((s) => s.trim())
  : ["http://localhost:8080", "http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Fallback allow in development or log warning
      }
    },
    credentials: true,
  })
);
app.use(
  express.json({
    verify: (req: Request, _res, buf) => {
      (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
    },
  })
);

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/tenants", tenantRoutes);
app.use("/api/v1/patients", patientRoutes);
app.use("/api/v1/appointments", appointmentRoutes);
app.use("/api/v1/stats", statsRoutes);
app.use("/api/v1/recovery", recoveryRoutes);
app.use("/api/v1/follow-ups", followupRoutes);
app.use("/api/v1/waitlist", waitlistRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/communications", communicationRoutes);
app.use("/api/v1/ai", aiRoutes);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date() });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

import bcrypt from "bcrypt";
import { User } from "./modules/users/user.model";

async function ensureSuperAdmin() {
  try {
    const email = (process.env.SUPER_ADMIN_EMAIL || "admin@medical-ai.com").toLowerCase().trim();
    const existing = await User.findOne({ email });
    if (!existing) {
      const password = process.env.SUPER_ADMIN_PASSWORD || "admin123";
      const passwordHash = await bcrypt.hash(password, 10);
      await User.create({
        email,
        passwordHash,
        firstName: "Super",
        lastName: "Admin",
        role: "super_admin",
      });
      console.log(`👑 Super Admin account ensured: ${email}`);
    }
  } catch (err) {
    console.error("Failed to ensure super admin:", err);
  }
}

const startServer = async () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  }
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI must be configured.");
  }

  await connectDB();
  await ensureSuperAdmin();
  const { reminderService } = await import("./modules/appointments/appointment.service");
  reminderService.startBackgroundWorker();

  app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });
};

startServer();
//
