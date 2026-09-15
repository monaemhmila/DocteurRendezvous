"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("../shared/db"));
const tenant_model_1 = require("../modules/tenants/tenant.model");
const user_model_1 = require("../modules/users/user.model");
const patient_model_1 = require("../modules/patients/patient.model");
const appointment_model_1 = require("../modules/appointments/appointment.model");
const bcrypt_1 = __importDefault(require("bcrypt"));
// Import frontend mock data
const mock_1 = require("../../../src/data/mock");
dotenv_1.default.config();
async function seed() {
    await (0, db_1.default)();
    console.log("🧹 Clearing existing data...");
    await tenant_model_1.Tenant.deleteMany({});
    await user_model_1.User.deleteMany({});
    await patient_model_1.Patient.deleteMany({});
    await appointment_model_1.Appointment.deleteMany({});
    const passwordHash = await bcrypt_1.default.hash("demo123", 10);
    // ── Super Admin (platform owner) ──────────────────
    console.log("👑 Creating Super Admin...");
    const adminPasswordHash = await bcrypt_1.default.hash("admin123", 10);
    await user_model_1.User.create({
        email: "admin@medical-ai.com",
        passwordHash: adminPasswordHash,
        firstName: "Super",
        lastName: "Admin",
        role: "super_admin",
        // no tenantId — super admin is not tied to a tenant
    });
    // ── Clinic Tenant ──────────────────────────────────
    console.log("🏢 Creating Clinic tenant...");
    const tenant1 = await tenant_model_1.Tenant.create({ name: mock_1.clinic.name });
    console.log("👤 Creating Clinic demo user...");
    await user_model_1.User.create({
        tenantId: tenant1._id,
        email: "demo@dentaire-tunis.com",
        passwordHash,
        firstName: "Sami",
        lastName: "Ben Amor",
        role: "clinic_owner"
    });
    console.log("🏢 Creating Cabinet tenant...");
    const tenant2 = await tenant_model_1.Tenant.create({ name: "Cabinet Cardiologie Manouba" });
    console.log("👤 Creating Cabinet demo user...");
    await user_model_1.User.create({
        tenantId: tenant2._id,
        email: "demo@cabinet-cardio.com",
        passwordHash,
        firstName: "Leila",
        lastName: "Mansour",
        role: "clinic_owner" // Un indépendant a aussi le rôle propriétaire de son espace
    });
    console.log(`🧑‍⚕️ Inserting ${mock_1.patients.length} patients (for Clinic)...`);
    // Map mock frontend patients to DB model
    const dbPatients = mock_1.patients.map((p) => ({
        tenantId: tenant1._id,
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone,
        email: p.email,
        language: p.language,
        status: p.status,
        tags: p.tags,
        metrics: {
            totalVisits: p.metrics?.totalVisits ?? 0,
            noShowCount: p.metrics?.noShowCount ?? 0,
            lastVisit: p.metrics?.lastVisit ? new Date(p.metrics.lastVisit) : undefined,
            revenue: p.metrics?.revenue ?? 0,
        }
    }));
    const insertedPatients = await patient_model_1.Patient.insertMany(dbPatients);
    // We need to map the old string IDs from mock to the new MongoDB ObjectIds for appointments
    const patientMap = new Map();
    mock_1.patients.forEach((p, index) => {
        patientMap.set(p.id, insertedPatients[index]._id);
    });
    console.log(`📅 Inserting ${mock_1.appointments.length} appointments (for Clinic)...`);
    const dbAppointments = mock_1.appointments.map((a) => ({
        tenantId: tenant1._id,
        patientId: patientMap.get(a.patientId),
        doctorId: a.doctorId,
        date: a.date,
        time: a.time,
        durationMin: a.durationMin || 30,
        treatment: a.treatment,
        status: a.status
    }));
    await appointment_model_1.Appointment.insertMany(dbAppointments);
    console.log("✅ Database seeded successfully!");
    process.exit(0);
}
seed().catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
});
//# sourceMappingURL=seed-database.js.map