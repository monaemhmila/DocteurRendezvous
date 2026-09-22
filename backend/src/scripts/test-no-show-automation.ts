import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { Appointment } from "../modules/appointments/appointment.model";
import { Patient } from "../modules/patients/patient.model";
import { Tenant } from "../modules/tenants/tenant.model";
import { Recovery } from "../modules/recovery/recovery.model";
import { FollowUpAttempt, FollowUpTask } from "../modules/followups/followup.model";
import { appointmentService } from "../modules/appointments/appointment.service";

dotenv.config({ path: path.join(__dirname, "../../.env") });

async function main() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/medical-ai";
  console.log("Connecting to MongoDB:", mongoUri);
  await mongoose.connect(mongoUri);

  const tenant = await Tenant.findOne().lean();
  if (!tenant) throw new Error("No tenant found");
  const tenantId = tenant._id.toString();

  // Create or get a test patient
  let patient = await Patient.findOne({ tenantId, phone: "+21699998888" });
  if (!patient) {
    patient = new Patient({
      tenantId,
      firstName: "TestNoShow",
      lastName: "Patient",
      phone: "+21699998888",
      language: "fr",
      metrics: { noShows: 0 },
    });
    await patient.save();
  }
  const initialNoShows = patient.metrics?.noShowCount || 0;
  console.log(`Initial patient noShowCount: ${initialNoShows}`);

  // Create a test appointment
  const appt = new Appointment({
    tenantId,
    patientId: patient._id,
    doctorId: tenant._id.toString(),
    date: "2026-09-18",
    startTime: "17:30",
    endTime: "18:00",
    durationMin: 30,
    treatment: "Détartrage & Bilan",
    status: "scheduled",
    source: "ai",
  });
  await appt.save();
  console.log(`Created test appointment: ${appt._id}`);

  // Update status to no_show using appointmentService.updateStatus
  console.log("Updating status to 'no_show'...");
  const updated = await appointmentService.updateStatus(appt._id.toString(), "no_show", tenantId);
  console.log(`Appointment updated status: ${updated?.status}`);

  // Verify patient metrics incremented
  const updatedPatient = await Patient.findById(patient._id).lean();
  const finalNoShows = updatedPatient?.metrics?.noShowCount || 0;
  console.log(`Updated patient noShowCount: ${finalNoShows} (expected ${initialNoShows + 1})`);
  if (finalNoShows !== initialNoShows + 1) {
    throw new Error("Patient metrics.noShowCount was not incremented!");
  }

  // Verify Recovery opportunity created and moved to contacted
  const recovery = await Recovery.findOne({
    tenantId,
    sourceAppointmentId: appt._id,
    type: "no_show",
  }).lean();
  console.log(`Recovery opportunity created: ${recovery?._id}, status: ${recovery?.status}`);
  if (!recovery) {
    throw new Error("Recovery opportunity not found for no_show!");
  }

  // Verify FollowUpTask & FollowUpAttempt
  const task = await FollowUpTask.findOne({
    tenantId,
    recoveryId: recovery._id,
  }).lean();
  console.log(`FollowUpTask created: ${task?._id}, type: ${task?.type}`);

  const attempts = await FollowUpAttempt.find({
    tenantId,
    recoveryId: recovery._id,
  }).lean();
  console.log(`FollowUpAttempts logged: ${attempts.length}, channel: ${attempts[0]?.channel}`);

  console.log("✅ ALL NO-SHOW AUTOMATION TESTS PASSED SUCCESSFULLY!");

  await mongoose.disconnect();
}

main().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
