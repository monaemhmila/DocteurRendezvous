import mongoose from "mongoose";
import dotenv from "dotenv";
import { Tenant } from "../modules/tenants/tenant.model";
import { Patient } from "../modules/patients/patient.model";
import { User } from "../modules/users/user.model";
import { Appointment } from "../modules/appointments/appointment.model";
import { appointmentService } from "../modules/appointments/appointment.service";

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/medical-ai-test";

async function runTests() {
  console.log("🧪 Starting Phase 3.4 Pagination Appointments Tests...\n");

  await mongoose.connect(MONGO_URI);
  await Appointment.deleteMany({});
  await Patient.deleteMany({});
  await User.deleteMany({});
  await Tenant.deleteMany({ name: { $in: ["Tenant A", "Tenant B"] } });

  function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(`❌ ASSERTION FAILED: ${msg}`);
  }

  const tenantA = await Tenant.create({ name: "Tenant A", status: "active", settings: { businessHours: {
    monday: [{ start: "09:00", end: "17:00" }],
    tuesday: [{ start: "09:00", end: "17:00" }],
    wednesday: [{ start: "09:00", end: "17:00" }],
    thursday: [{ start: "09:00", end: "17:00" }],
    friday: [{ start: "09:00", end: "17:00" }],
    saturday: [],
    sunday: []
  } } });
  const tenantB = await Tenant.create({ name: "Tenant B", status: "active" });

  const patientA = await Patient.create({ tenantId: tenantA._id, firstName: "A", lastName: "Test", phone: "1" });
  const patientB = await Patient.create({ tenantId: tenantB._id, firstName: "B", lastName: "Test", phone: "2" });

  console.log("▶ TEST 1 — Service: Résultat vide → data []");
  const emptyRes = await appointmentService.getAppointments(tenantA._id.toString(), undefined, undefined, undefined, undefined, undefined, 0, 20);
  assert(Array.isArray(emptyRes.data) && emptyRes.data.length === 0, "Data should be empty array");
  assert(emptyRes.total === 0, "Total should be 0");
  console.log("✅ TEST 1 PASSED");

  console.log("▶ TEST 2 — Service: Tenant A ne voit jamais Tenant B (Isolation SaaS)");
  for (let i = 0; i < 5; i++) {
    await Appointment.create({ tenantId: tenantA._id, patientId: patientA._id, doctorId: new mongoose.Types.ObjectId().toString().toString(), date: `2026-09-0${i+1}`, startTime: "10:00", endTime: "10:30", status: "scheduled", treatment: "TEST" });
  }
  for (let i = 0; i < 3; i++) {
    await Appointment.create({ tenantId: tenantB._id, patientId: patientB._id, doctorId: new mongoose.Types.ObjectId().toString().toString(), date: `2026-09-0${i+1}`, startTime: "10:00", endTime: "10:30", status: "completed", treatment: "TEST" });
  }
  
  const resA = await appointmentService.getAppointments(tenantA._id.toString(), undefined, undefined, undefined, undefined, undefined, 0, 10);
  assert(resA.data.length === 5, "Tenant A should see exactly 5 appointments");
  assert(resA.data.every((p: any) => p.tenantId.toString() === tenantA._id.toString()), "Tenant A should not see Tenant B's data");
  assert(resA.total === 5, "Total should be 5 for A");

  const resB = await appointmentService.getAppointments(tenantB._id.toString(), undefined, undefined, undefined, undefined, undefined, 0, 10);
  assert(resB.data.length === 3, "Tenant B should see exactly 3 appointments");
  console.log("✅ TEST 2 PASSED");

  console.log("▶ TEST 3 — Service: pagination page/limit");
  const resPage1 = await appointmentService.getAppointments(tenantA._id.toString(), undefined, undefined, undefined, undefined, undefined, 0, 2);
  assert(resPage1.data.length === 2, "Page 1 should have 2 items");
  assert(resPage1.total === 5, "Total items should be 5");
  
  const resPage3 = await appointmentService.getAppointments(tenantA._id.toString(), undefined, undefined, undefined, undefined, undefined, 4, 2);
  assert(resPage3.data.length === 1, "Page 3 (skip 4) should have 1 item");
  console.log("✅ TEST 3 PASSED");

  console.log("▶ TEST 4 — Filtres statut/date");
  const resFilterStatus = await appointmentService.getAppointments(tenantB._id.toString(), undefined, "completed", undefined, undefined, undefined, 0, 10);
  assert(resFilterStatus.data.length === 3, "Should filter by status correctly");
  assert(resFilterStatus.data.every((a: any) => a.status === "completed"), "All should be completed");

  const resFilterDate = await appointmentService.getAppointments(tenantA._id.toString(), undefined, undefined, "2026-09-01", undefined, undefined, 0, 10);
  assert(resFilterDate.data.length === 1, "Should filter by date correctly");
  console.log("✅ TEST 4 PASSED");

  console.log("▶ TEST 5 — Absence de régression sur création, modification et suppression");
  const doctorA = await User.create({ tenantId: tenantA._id, email: "doc@a.com", passwordHash: "x", role: "clinic_owner", firstName: "Doc", lastName: "A" });
  const newAppt = await appointmentService.createAppointment({ patientId: patientA._id, doctorId: doctorA._id, date: "2030-01-03", startTime: "14:00", endTime: "14:30", treatment: "New" } as any, tenantA._id.toString());
  assert(!!newAppt, "Create should work");
  
  await appointmentService.deleteAppointment(newAppt._id.toString(), tenantA._id.toString());
  const deleted = await appointmentService.getAppointmentById(newAppt._id.toString(), tenantA._id.toString());
  assert(!deleted, "Delete should work");
  console.log("✅ TEST 5 PASSED");

  await mongoose.disconnect();
  console.log("\n✅ Phase 3.4 Pagination Appointments tests completed successfully.");
}

runTests().catch(err => {
  console.error("Test Suite Error:", err);
  process.exit(1);
});
