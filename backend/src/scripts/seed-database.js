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
    const tenant1 = await tenant_model_1.Tenant.create({
        name: mock_1.clinic.name || "Clinique Dentaire Tunis",
        specialty: "Dentisterie",
        email: "demo@dentaire-tunis.com",
        phone: "+216 71 962 480",
        address: "12 Rue de Marseille, Lac 2, Tunis",
        status: "active",
        plan: "enterprise",
        settings: {
            businessHours: {
                monday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
                tuesday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
                wednesday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
                thursday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
                friday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
                saturday: [{ start: "09:00", end: "13:00" }],
                sunday: [],
            },
        },
    });
    console.log("👤 Creating Clinic demo user...");
    await user_model_1.User.create({
        tenantId: tenant1._id,
        email: "demo@dentaire-tunis.com",
        passwordHash,
        firstName: "Sami",
        lastName: "Ben Amor",
        role: "clinic_owner",
    });
    console.log("🏢 Creating Cabinet tenant...");
    const tenant2 = await tenant_model_1.Tenant.create({
        name: "Cabinet Cardiologie Manouba",
        specialty: "Cardiologie",
        email: "demo@cabinet-cardio.com",
        phone: "+216 71 600 700",
        address: "Avenue Habib Bourguiba, Manouba",
        status: "active",
        plan: "pro",
    });
    console.log("👤 Creating Cabinet demo user...");
    await user_model_1.User.create({
        tenantId: tenant2._id,
        email: "demo@cabinet-cardio.com",
        passwordHash,
        firstName: "Leila",
        lastName: "Mansour",
        role: "clinic_owner",
    });
    console.log(`🧑‍⚕️ Inserting ${mock_1.patients.length} patients (for Clinic)...`);
    // Map mock frontend patients to DB model
    const dbPatients = mock_1.patients.map((p) => ({
        tenantId: tenant1._id,
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone,
        email: p.email,
        language: p.language || "fr",
        status: p.status,
        tags: p.tags,
        metrics: {
            totalVisits: p.metrics?.totalVisits ?? 0,
            noShowCount: p.metrics?.noShowCount ?? 0,
            lastVisit: p.metrics?.lastVisit ? new Date(p.metrics.lastVisit) : undefined,
            revenue: p.metrics?.revenue ?? 0,
        },
    }));
    const insertedPatients = await patient_model_1.Patient.insertMany(dbPatients);
    // We need to map the old string IDs from mock to the new MongoDB ObjectIds for appointments
    const patientMap = new Map();
    mock_1.patients.forEach((p, index) => {
        patientMap.set(p.id, insertedPatients[index]._id);
    });
    console.log(`📅 Inserting ${mock_1.appointments.length} appointments (for Clinic)...`);
    const dbAppointments = mock_1.appointments.map((a) => {
        const startTime = a.startTime || a.time || "09:00";
        const endTime = a.endTime || "09:30";
        return {
            tenantId: tenant1._id,
            patientId: patientMap.get(a.patientId) || insertedPatients[0]._id,
            doctorId: a.doctorId || "d1",
            date: a.date,
            startTime,
            endTime,
            durationMin: a.durationMin || 30,
            treatment: a.treatment,
            status: a.status || "scheduled",
        };
    });
    const insertedAppointments = await appointment_model_1.Appointment.insertMany(dbAppointments);
    // ── Waitlist Entries ──────────────────────────────
    console.log("⏳ Inserting Waitlist entries...");
    const { WaitlistEntry } = await import("../modules/waitlist/waitlist.model");
    const { FollowUpTask } = await import("../modules/followups/followup.model");
    await WaitlistEntry.deleteMany({});
    await FollowUpTask.deleteMany({});
    const waitlistEntries = [
        {
            tenantId: tenant1._id.toString(),
            patientId: insertedPatients[0]._id, // Amira Ben Salem
            treatment: "Détartrage",
            priority: "high",
            preferredDays: ["Monday", "Wednesday", "Friday"],
            preferredTimeRanges: ["morning"],
            status: "active",
            notes: "Demande un créneau le matin dès qu'une place se libère",
        },
        {
            tenantId: tenant1._id.toString(),
            patientId: insertedPatients[2]._id, // Mariem Bouazizi
            treatment: "Composite",
            priority: "medium",
            preferredDays: ["Tuesday", "Thursday"],
            preferredTimeRanges: ["afternoon"],
            status: "active",
            notes: "Disponible en fin de journée",
        },
        {
            tenantId: tenant1._id.toString(),
            patientId: insertedPatients[4]._id, // Sonia Mejri
            treatment: "Blanchiment",
            priority: "medium",
            preferredDays: ["Saturday"],
            preferredTimeRanges: ["morning"],
            status: "active",
            notes: "Préférence pour le samedi matin",
        },
        {
            tenantId: tenant1._id.toString(),
            patientId: insertedPatients[8]._id, // Fatma Zouari
            treatment: "Implant",
            priority: "high",
            preferredDays: ["Monday", "Tuesday", "Thursday"],
            preferredTimeRanges: ["morning", "afternoon"],
            status: "active",
            notes: "Urgence devis implant, prête à venir sous 2h",
        },
        {
            tenantId: tenant1._id.toString(),
            patientId: insertedPatients[10]._id, // Ines Marzouki
            treatment: "Consultation",
            priority: "low",
            preferredDays: [],
            preferredTimeRanges: [],
            status: "active",
            notes: "Contrôle annuel",
        },
    ];
    const insertedWaitlist = await WaitlistEntry.insertMany(waitlistEntries);
    // ── Create 1 Active Slot Fill Offer (from a cancelled appointment) ──
    console.log("⚡ Creating active slot fill offer...");
    const cancelledAppt = insertedAppointments.find((a) => a.status === "cancelled") || insertedAppointments[0];
    await FollowUpTask.create({
        tenantId: tenant1._id.toString(),
        patientId: insertedWaitlist[0].patientId,
        waitlistEntryId: insertedWaitlist[0]._id,
        sourceAppointmentId: cancelledAppt._id,
        type: "slot_fill_offer",
        priority: "high",
        status: "pending",
        scheduledFor: new Date(),
        attemptCount: 0,
        notes: `Créneau libéré (${cancelledAppt.startTime} - ${cancelledAppt.endTime}) proposé automatiquement à ${insertedPatients[0].firstName} ${insertedPatients[0].lastName}`,
    });
    console.log("✅ Database seeded successfully with waitlist and tasks!");
    process.exit(0);
}
seed().catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
});
//# sourceMappingURL=seed-database.js.map