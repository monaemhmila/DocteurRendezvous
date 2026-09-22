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
  const tenant1 = await Tenant.create({
    name: clinic.name || "Clinique Dentaire Tunis",
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
  await User.create({
    tenantId: tenant1._id,
    email: "demo@dentaire-tunis.com",
    passwordHash,
    firstName: "Sami",
    lastName: "Ben Amor",
    role: "clinic_owner",
  });

  console.log("🏢 Creating Cabinet tenant...");
  const tenant2 = await Tenant.create({
    name: "Cabinet Cardiologie Manouba",
    specialty: "Cardiologie",
    email: "demo@cabinet-cardio.com",
    phone: "+216 71 600 700",
    address: "Avenue Habib Bourguiba, Manouba",
    status: "active",
    plan: "pro",
  });

  console.log("👤 Creating Cabinet demo user...");
  await User.create({
    tenantId: tenant2._id,
    email: "demo@cabinet-cardio.com",
    passwordHash,
    firstName: "Leila",
    lastName: "Mansour",
    role: "clinic_owner",
  });

  console.log(`🧑‍⚕️ Inserting ${patients.length} patients (for Clinic)...`);
  // Map mock frontend patients to DB model
  const dbPatients = patients.map((p) => ({
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
  const insertedPatients = await Patient.insertMany(dbPatients);

  // We need to map the old string IDs from mock to the new MongoDB ObjectIds for appointments
  const patientMap = new Map();
  patients.forEach((p, index) => {
    patientMap.set(p.id, insertedPatients[index]._id);
  });

  console.log(`📅 Inserting ${appointments.length} appointments (for Clinic)...`);
  const dbAppointments = appointments.map((a) => {
    const startTime = a.startTime || (a as any).time || "09:00";
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
  const insertedAppointments = await Appointment.insertMany(dbAppointments);

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
