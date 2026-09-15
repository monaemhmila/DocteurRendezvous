import mongoose from "mongoose";
import dotenv from "dotenv";
import { recoveryService } from "../modules/recovery/recovery.service";
import { appointmentService } from "../modules/appointments/appointment.service";
import { Patient } from "../modules/patients/patient.model";
import { Appointment } from "../modules/appointments/appointment.model";
import { Recovery } from "../modules/recovery/recovery.model";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/medical-ai-test";

async function runTests() {
  console.log("🧪 Starting Phase 2.1 Recovery Engine Hardening Automated Tests...");
  
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB for testing.");

    const tenantAId = new mongoose.Types.ObjectId().toString();
    const tenantBId = new mongoose.Types.ObjectId().toString();

    // Clean test database collections
    await Patient.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
    await Appointment.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
    await Recovery.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });

    // Setup Test Data
    const patientA = await Patient.create({
      tenantId: tenantAId,
      firstName: "John",
      lastName: "Doe",
      phone: "+21699000111",
      email: "john@example.com",
    });

    const patientB = await Patient.create({
      tenantId: tenantBId,
      firstName: "Jane",
      lastName: "Smith",
      phone: "+21699000222",
      email: "jane@example.com",
    });

    // -------------------------------------------------------------
    // TEST 1 — Cross-Tenant Patient
    // Tenant A attempts to create a Recovery using Patient B (Tenant B)
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 1 — Cross-Tenant Patient...");
    let test1Passed = false;
    try {
      await recoveryService.createOpportunity(
        {
          patientId: patientB._id as any,
          type: "inactive_patient",
          priority: "high",
        },
        tenantAId
      );
    } catch (err: any) {
      if (err.message.includes("Patient not found or does not belong to authenticated tenant")) {
        test1Passed = true;
      } else {
        console.error("Test 1 unexpected error:", err.message);
      }
    }
    if (!test1Passed) {
      throw new Error("TEST 1 FAILED: Cross-tenant patient creation was NOT rejected!");
    }
    console.log("✅ TEST 1 PASSED: Cross-tenant patient reference correctly rejected.");

    // -------------------------------------------------------------
    // TEST 2 — Correct Appointment Association
    // Create Patient X, Recovery A (Appt 1 -> Appt 2), Recovery B (Appt 3 -> Appt 4)
    // Complete Appt 2. ONLY Recovery A should become visited.
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 2 — Correct Appointment Association...");
    
    // Create appointments under Tenant A for Patient A
    const appt1 = await Appointment.create({
      tenantId: tenantAId,
      patientId: patientA._id,
      doctorId: "doc_123",
      treatment: "Détartrage",
      date: "2026-09-01",
      startTime: "09:00",
      endTime: "09:30",
      status: "cancelled",
    });

    const appt2 = await Appointment.create({
      tenantId: tenantAId,
      patientId: patientA._id,
      doctorId: "doc_123",
      treatment: "Consultation",
      date: "2026-09-15",
      startTime: "10:00",
      endTime: "10:30",
      status: "scheduled",
    });

    const appt3 = await Appointment.create({
      tenantId: tenantAId,
      patientId: patientA._id,
      doctorId: "doc_123",
      treatment: "Couronne",
      date: "2026-09-02",
      startTime: "11:00",
      endTime: "11:30",
      status: "no_show",
    });

    const appt4 = await Appointment.create({
      tenantId: tenantAId,
      patientId: patientA._id,
      doctorId: "doc_123",
      treatment: "Contrôle",
      date: "2026-09-16",
      startTime: "14:00",
      endTime: "14:30",
      status: "scheduled",
    });

    // Create Recovery A (for cancellation appt1)
    const recA = await recoveryService.createOpportunity(
      {
        patientId: patientA._id as any,
        sourceAppointmentId: appt1._id as any,
        type: "cancellation",
        priority: "medium",
        estimatedValue: 150,
      },
      tenantAId
    );

    // Transition recA: identified -> contacted -> responded -> booked with appt2
    await recoveryService.markContacted(recA._id.toString(), tenantAId);
    await recoveryService.markResponded(recA._id.toString(), tenantAId);
    await recoveryService.markBooked(recA._id.toString(), appt2._id.toString(), 150, tenantAId);

    // Create Recovery B (for no_show appt3)
    const recB = await recoveryService.createOpportunity(
      {
        patientId: patientA._id as any,
        sourceAppointmentId: appt3._id as any,
        type: "no_show",
        priority: "high",
        estimatedValue: 200,
      },
      tenantAId
    );

    // Transition recB: identified -> contacted -> responded -> booked with appt4
    await recoveryService.markContacted(recB._id.toString(), tenantAId);
    await recoveryService.markResponded(recB._id.toString(), tenantAId);
    await recoveryService.markBooked(recB._id.toString(), appt4._id.toString(), 200, tenantAId);

    // Complete Appt 2
    await appointmentService.updateStatus(appt2._id.toString(), "completed", tenantAId);

    // Check statuses
    const updatedRecA = await Recovery.findById(recA._id);
    const updatedRecB = await Recovery.findById(recB._id);

    if (updatedRecA?.status !== "visited") {
      throw new Error(`TEST 2 FAILED: Recovery A status is ${updatedRecA?.status}, expected 'visited'`);
    }
    if (updatedRecB?.status !== "booked") {
      throw new Error(`TEST 2 FAILED: Recovery B status is ${updatedRecB?.status}, expected 'booked'`);
    }
    console.log("✅ TEST 2 PASSED: Only Recovery A (linked to Appt 2) became visited. Recovery B remains booked.");

    // -------------------------------------------------------------
    // TEST 3 — Idempotence
    // Send completed status update multiple times on Appt 2
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 3 — Idempotence...");
    await appointmentService.updateStatus(appt2._id.toString(), "completed", tenantAId);
    await appointmentService.updateStatus(appt2._id.toString(), "completed", tenantAId);

    const recAAfterMultiple = await Recovery.findById(recA._id);
    if (recAAfterMultiple?.status !== "visited" || recAAfterMultiple?.recoveredValue !== 150) {
      throw new Error(`TEST 3 FAILED: Idempotent updates altered recoveredValue or status unexpectedly`);
    }
    console.log("✅ TEST 3 PASSED: Multiple completed updates remain idempotent.");

    // -------------------------------------------------------------
    // TEST 4 — Duplicate Event
    // Trigger no_show or cancelled multiple times for the exact same source appointment
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 4 — Duplicate Event Protection...");
    const dupeRec1 = await recoveryService.createOpportunity(
      {
        patientId: patientA._id as any,
        sourceAppointmentId: appt1._id as any,
        type: "cancellation",
      },
      tenantAId
    );

    const dupeRec2 = await recoveryService.createOpportunity(
      {
        patientId: patientA._id as any,
        sourceAppointmentId: appt1._id as any,
        type: "cancellation",
      },
      tenantAId
    );

    if (dupeRec1._id.toString() !== dupeRec2._id.toString()) {
      throw new Error("TEST 4 FAILED: Duplicate opportunity was created for the same source appointment!");
    }
    console.log("✅ TEST 4 PASSED: Single opportunity maintained for duplicate source appointment triggers.");

    // -------------------------------------------------------------
    // TEST 5 — Invalid State Transition
    // Attempt identified -> visited
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 5 — Invalid State Transition...");
    const newRec = await recoveryService.createOpportunity(
      {
        patientId: patientA._id as any,
        type: "inactive_patient",
      },
      tenantAId
    );

    let test5Passed = false;
    try {
      await recoveryService.markVisited(newRec._id.toString(), 100, tenantAId);
    } catch (err: any) {
      if (err.message.includes("Invalid recovery lifecycle transition")) {
        test5Passed = true;
      }
    }
    if (!test5Passed) {
      throw new Error("TEST 5 FAILED: Direct transition identified -> visited was NOT rejected!");
    }
    console.log("✅ TEST 5 PASSED: Invalid lifecycle transition identified -> visited correctly rejected.");

    // -------------------------------------------------------------
    // TEST 6 — Financial Integrity
    // Verify bookedValue is recorded when booked, recoveredValue is 0.
    // When completed, recoveredValue is set and getStats aggregates correctly.
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 6 — Financial Integrity...");
    
    // Transition newRec: identified -> contacted -> responded -> booked
    await recoveryService.markContacted(newRec._id.toString(), tenantAId);
    await recoveryService.markResponded(newRec._id.toString(), tenantAId);
    
    const bookedRec = await recoveryService.markBooked(
      newRec._id.toString(),
      appt4._id.toString(),
      250,
      tenantAId
    );

    if (bookedRec.bookedValue !== 250 || bookedRec.recoveredValue !== 0) {
      throw new Error("TEST 6 FAILED: Booked value not recorded properly or recoveredValue is non-zero before completion");
    }

    const statsBeforeCompletion = await recoveryService.getStats(tenantAId);
    if (statsBeforeCompletion.financials.bookedValue < 250) {
      throw new Error("TEST 6 FAILED: getStats did not reflect bookedValue before visit");
    }

    // Now complete appt4
    await appointmentService.updateStatus(appt4._id.toString(), "completed", tenantAId);

    const statsAfterCompletion = await recoveryService.getStats(tenantAId);
    if (statsAfterCompletion.financials.recoveredValue < 250) {
      throw new Error("TEST 6 FAILED: getStats did not reflect recoveredValue after visit");
    }
    console.log("✅ TEST 6 PASSED: Financial integrity strictly enforced across booked and recovered stages.");

    console.log("\n🎉 ALL 6 AUTOMATED TESTS PASSED SUCCESSFULLY!");
  } catch (error: any) {
    console.error("\n❌ TEST SUITE FAILED:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
