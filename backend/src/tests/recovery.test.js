"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const recovery_service_1 = require("../modules/recovery/recovery.service");
const appointment_service_1 = require("../modules/appointments/appointment.service");
const patient_model_1 = require("../modules/patients/patient.model");
const appointment_model_1 = require("../modules/appointments/appointment.model");
const recovery_model_1 = require("../modules/recovery/recovery.model");
dotenv_1.default.config();
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/medical-ai-test";
async function runTests() {
    console.log("🧪 Starting Phase 2.1 Recovery Engine Hardening Automated Tests...");
    try {
        await mongoose_1.default.connect(MONGO_URI);
        console.log("Connected to MongoDB for testing.");
        const tenantAId = new mongoose_1.default.Types.ObjectId().toString();
        const tenantBId = new mongoose_1.default.Types.ObjectId().toString();
        // Clean test database collections
        await patient_model_1.Patient.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
        await appointment_model_1.Appointment.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
        await recovery_model_1.Recovery.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
        // Setup Test Data
        const patientA = await patient_model_1.Patient.create({
            tenantId: tenantAId,
            firstName: "John",
            lastName: "Doe",
            phone: "+21699000111",
            email: "john@example.com",
        });
        const patientB = await patient_model_1.Patient.create({
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
            await recovery_service_1.recoveryService.createOpportunity({
                patientId: patientB._id,
                type: "inactive_patient",
                priority: "high",
            }, tenantAId);
        }
        catch (err) {
            if (err.message.includes("Patient not found or does not belong to authenticated tenant")) {
                test1Passed = true;
            }
            else {
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
        const appt1 = await appointment_model_1.Appointment.create({
            tenantId: tenantAId,
            patientId: patientA._id,
            doctorId: "doc_123",
            treatment: "Détartrage",
            date: "2026-09-01",
            startTime: "09:00",
            endTime: "09:30",
            status: "cancelled",
        });
        const appt2 = await appointment_model_1.Appointment.create({
            tenantId: tenantAId,
            patientId: patientA._id,
            doctorId: "doc_123",
            treatment: "Consultation",
            date: "2026-09-15",
            startTime: "10:00",
            endTime: "10:30",
            status: "scheduled",
        });
        const appt3 = await appointment_model_1.Appointment.create({
            tenantId: tenantAId,
            patientId: patientA._id,
            doctorId: "doc_123",
            treatment: "Couronne",
            date: "2026-09-02",
            startTime: "11:00",
            endTime: "11:30",
            status: "no_show",
        });
        const appt4 = await appointment_model_1.Appointment.create({
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
        const recA = await recovery_service_1.recoveryService.createOpportunity({
            patientId: patientA._id,
            sourceAppointmentId: appt1._id,
            type: "cancellation",
            priority: "medium",
            estimatedValue: 150,
        }, tenantAId);
        // Transition recA: identified -> contacted -> responded -> booked with appt2
        await recovery_service_1.recoveryService.markContacted(recA._id.toString(), tenantAId);
        await recovery_service_1.recoveryService.markResponded(recA._id.toString(), tenantAId);
        await recovery_service_1.recoveryService.markBooked(recA._id.toString(), appt2._id.toString(), 150, tenantAId);
        // Create Recovery B (for no_show appt3)
        const recB = await recovery_service_1.recoveryService.createOpportunity({
            patientId: patientA._id,
            sourceAppointmentId: appt3._id,
            type: "no_show",
            priority: "high",
            estimatedValue: 200,
        }, tenantAId);
        // Transition recB: identified -> contacted -> responded -> booked with appt4
        await recovery_service_1.recoveryService.markContacted(recB._id.toString(), tenantAId);
        await recovery_service_1.recoveryService.markResponded(recB._id.toString(), tenantAId);
        await recovery_service_1.recoveryService.markBooked(recB._id.toString(), appt4._id.toString(), 200, tenantAId);
        // Complete Appt 2
        await appointment_service_1.appointmentService.updateStatus(appt2._id.toString(), "completed", tenantAId);
        // Check statuses
        const updatedRecA = await recovery_model_1.Recovery.findById(recA._id);
        const updatedRecB = await recovery_model_1.Recovery.findById(recB._id);
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
        await appointment_service_1.appointmentService.updateStatus(appt2._id.toString(), "completed", tenantAId);
        await appointment_service_1.appointmentService.updateStatus(appt2._id.toString(), "completed", tenantAId);
        const recAAfterMultiple = await recovery_model_1.Recovery.findById(recA._id);
        if (recAAfterMultiple?.status !== "visited" || recAAfterMultiple?.recoveredValue !== 150) {
            throw new Error(`TEST 3 FAILED: Idempotent updates altered recoveredValue or status unexpectedly`);
        }
        console.log("✅ TEST 3 PASSED: Multiple completed updates remain idempotent.");
        // -------------------------------------------------------------
        // TEST 4 — Duplicate Event
        // Trigger no_show or cancelled multiple times for the exact same source appointment
        // -------------------------------------------------------------
        console.log("\n▶ Running TEST 4 — Duplicate Event Protection...");
        const dupeRec1 = await recovery_service_1.recoveryService.createOpportunity({
            patientId: patientA._id,
            sourceAppointmentId: appt1._id,
            type: "cancellation",
        }, tenantAId);
        const dupeRec2 = await recovery_service_1.recoveryService.createOpportunity({
            patientId: patientA._id,
            sourceAppointmentId: appt1._id,
            type: "cancellation",
        }, tenantAId);
        if (dupeRec1._id.toString() !== dupeRec2._id.toString()) {
            throw new Error("TEST 4 FAILED: Duplicate opportunity was created for the same source appointment!");
        }
        console.log("✅ TEST 4 PASSED: Single opportunity maintained for duplicate source appointment triggers.");
        // -------------------------------------------------------------
        // TEST 5 — Invalid State Transition
        // Attempt identified -> visited
        // -------------------------------------------------------------
        console.log("\n▶ Running TEST 5 — Invalid State Transition...");
        const newRec = await recovery_service_1.recoveryService.createOpportunity({
            patientId: patientA._id,
            type: "inactive_patient",
        }, tenantAId);
        let test5Passed = false;
        try {
            await recovery_service_1.recoveryService.markVisited(newRec._id.toString(), 100, tenantAId);
        }
        catch (err) {
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
        await recovery_service_1.recoveryService.markContacted(newRec._id.toString(), tenantAId);
        await recovery_service_1.recoveryService.markResponded(newRec._id.toString(), tenantAId);
        const bookedRec = await recovery_service_1.recoveryService.markBooked(newRec._id.toString(), appt4._id.toString(), 250, tenantAId);
        if (bookedRec.bookedValue !== 250 || bookedRec.recoveredValue !== 0) {
            throw new Error("TEST 6 FAILED: Booked value not recorded properly or recoveredValue is non-zero before completion");
        }
        const statsBeforeCompletion = await recovery_service_1.recoveryService.getStats(tenantAId);
        if (statsBeforeCompletion.financials.bookedValue < 250) {
            throw new Error("TEST 6 FAILED: getStats did not reflect bookedValue before visit");
        }
        // Now complete appt4
        await appointment_service_1.appointmentService.updateStatus(appt4._id.toString(), "completed", tenantAId);
        const statsAfterCompletion = await recovery_service_1.recoveryService.getStats(tenantAId);
        if (statsAfterCompletion.financials.recoveredValue < 250) {
            throw new Error("TEST 6 FAILED: getStats did not reflect recoveredValue after visit");
        }
        console.log("✅ TEST 6 PASSED: Financial integrity strictly enforced across booked and recovered stages.");
        console.log("\n🎉 ALL 6 AUTOMATED TESTS PASSED SUCCESSFULLY!");
    }
    catch (error) {
        console.error("\n❌ TEST SUITE FAILED:", error.message);
        process.exit(1);
    }
    finally {
        await mongoose_1.default.disconnect();
    }
}
runTests();
//# sourceMappingURL=recovery.test.js.map