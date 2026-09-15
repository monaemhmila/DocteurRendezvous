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
app.use((0, cors_1.default)());
app.use(express_1.default.json());
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
const startServer = async () => {
    await (0, db_1.default)();
    app.listen(port, () => {
        console.log(`🚀 Server running on http://localhost:${port}`);
    });
};
startServer();
//# sourceMappingURL=server.js.map