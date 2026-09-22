"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("./shared/db"));
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const tenant_routes_1 = __importDefault(require("./modules/tenants/tenant.routes"));
const patient_routes_1 = __importDefault(require("./modules/patients/patient.routes"));
const appointment_routes_1 = __importDefault(require("./modules/appointments/appointment.routes"));
const stats_routes_1 = __importDefault(require("./modules/stats/stats.routes"));
const recovery_routes_1 = __importDefault(require("./modules/recovery/recovery.routes"));
const followup_routes_1 = __importDefault(require("./modules/followups/followup.routes"));
const waitlist_routes_1 = __importDefault(require("./modules/waitlist/waitlist.routes"));
const user_routes_1 = __importDefault(require("./modules/users/user.routes"));
const communication_routes_1 = __importDefault(require("./modules/communications/communication.routes"));
const ai_routes_1 = __importDefault(require("./modules/ai/ai.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
// Middleware
const corsOriginEnv = process.env.CORS_ORIGIN;
const allowedOrigins = corsOriginEnv
    ? corsOriginEnv.split(",").map((s) => s.trim())
    : ["http://localhost:8080", "http://localhost:5173", "http://localhost:3000"];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(null, true); // Fallback allow in development or log warning
        }
    },
    credentials: true,
}));
app.use(express_1.default.json({
    verify: (req, _res, buf) => {
        req.rawBody = Buffer.from(buf);
    },
}));
// Routes
app.use("/api/v1/auth", auth_routes_1.default);
app.use("/api/v1/tenants", tenant_routes_1.default);
app.use("/api/v1/patients", patient_routes_1.default);
app.use("/api/v1/appointments", appointment_routes_1.default);
app.use("/api/v1/stats", stats_routes_1.default);
app.use("/api/v1/recovery", recovery_routes_1.default);
app.use("/api/v1/follow-ups", followup_routes_1.default);
app.use("/api/v1/waitlist", waitlist_routes_1.default);
app.use("/api/v1/users", user_routes_1.default);
app.use("/api/v1/communications", communication_routes_1.default);
app.use("/api/v1/ai", ai_routes_1.default);
// Health check
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date() });
});
// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: "Not Found" });
});
const bcrypt_1 = __importDefault(require("bcrypt"));
const user_model_1 = require("./modules/users/user.model");
async function ensureSuperAdmin() {
    try {
        const email = (process.env.SUPER_ADMIN_EMAIL || "admin@medical-ai.com").toLowerCase().trim();
        const existing = await user_model_1.User.findOne({ email });
        if (!existing) {
            const password = process.env.SUPER_ADMIN_PASSWORD || "admin123";
            const passwordHash = await bcrypt_1.default.hash(password, 10);
            await user_model_1.User.create({
                email,
                passwordHash,
                firstName: "Super",
                lastName: "Admin",
                role: "super_admin",
            });
            console.log(`👑 Super Admin account ensured: ${email}`);
        }
    }
    catch (err) {
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
    await (0, db_1.default)();
    await ensureSuperAdmin();
    const { reminderService } = await import("./modules/appointments/appointment.service");
    reminderService.startBackgroundWorker();
    app.listen(port, () => {
        console.log(`🚀 Server running on http://localhost:${port}`);
    });
};
startServer();
//# sourceMappingURL=server.js.map