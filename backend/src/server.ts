import express from "express";
import cors from "cors";
import dotenv from "dotenv";
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
app.use(cors());
app.use(express.json());

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

const startServer = async () => {
  await connectDB();
  app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });
};

startServer();
