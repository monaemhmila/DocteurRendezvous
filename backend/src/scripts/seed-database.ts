import dotenv from "dotenv";
import connectDB from "../shared/db";
import { Tenant } from "../modules/tenants/tenant.model";
import { User } from "../modules/users/user.model";
import { Patient } from "../modules/patients/patient.model";
import { Appointment } from "../modules/appointments/appointment.model";
import bcrypt from "bcrypt";
// Import frontend mock data
import { clinic, patients, appointments } from "../../../src/data/mock";

dotenv.config();

async function seed() {
  await connectDB();

  console.log("🧹 Clearing existing data...");
  await Tenant.deleteMany({});
  await User.deleteMany({});
  await Patient.deleteMany({});
  await Appointment.deleteMany({});

  const passwordHash = await bcrypt.hash("demo123", 10);

  // ── Super Admin (platform owner) ──────────────────
  console.log("👑 Creating Super Admin...");
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  await User.create({
    email: "admin@medical-ai.com",
    passwordHash: adminPasswordHash,
    firstName: "Super",
    lastName: "Admin",
    role: "super_admin",
    // no tenantId — super admin is not tied to a tenant
  });

  // ── Clinic Tenant ──────────────────────────────────
  console.log("🏢 Creating Clinic tenant...");
  const tenant1 = await Tenant.create({ name: clinic.name });

  console.log("👤 Creating Clinic demo user...");
  await User.create({
    tenantId: tenant1._id,
    email: "demo@dentaire-tunis.com",
    passwordHash,
    firstName: "Sami",
    lastName: "Ben Amor",
    role: "clinic_owner"
  });

  console.log("🏢 Creating Cabinet tenant...");
  const tenant2 = await Tenant.create({ name: "Cabinet Cardiologie Manouba" });

  console.log("👤 Creating Cabinet demo user...");
  await User.create({
    tenantId: tenant2._id,
    email: "demo@cabinet-cardio.com",
    passwordHash,
    firstName: "Leila",
    lastName: "Mansour",
    role: "clinic_owner" // Un indépendant a aussi le rôle propriétaire de son espace
  });

  console.log(`🧑‍⚕️ Inserting ${patients.length} patients (for Clinic)...`);
  // Map mock frontend patients to DB model
  const dbPatients = patients.map((p) => ({
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
  const insertedPatients = await Patient.insertMany(dbPatients);
  
  // We need to map the old string IDs from mock to the new MongoDB ObjectIds for appointments
  const patientMap = new Map();
  patients.forEach((p, index) => {
    patientMap.set(p.id, insertedPatients[index]._id);
  });

  console.log(`📅 Inserting ${appointments.length} appointments (for Clinic)...`);
  const dbAppointments = appointments.map((a) => ({
    tenantId: tenant1._id,
    patientId: patientMap.get(a.patientId),
    doctorId: a.doctorId,
    date: a.date,
    time: a.time,
    durationMin: a.durationMin || 30,
    treatment: a.treatment,
    status: a.status
  }));
  await Appointment.insertMany(dbAppointments);

  console.log("✅ Database seeded successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
