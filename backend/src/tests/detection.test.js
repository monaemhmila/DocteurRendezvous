"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const recovery_service_1 = require("../modules/recovery/recovery.service");
const patient_model_1 = require("../modules/patients/patient.model");
const appointment_model_1 = require("../modules/appointments/appointment.model");
const recovery_model_1 = require("../modules/recovery/recovery.model");
const followup_model_1 = require("../modules/followups/followup.model");
dotenv_1.default.config();
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/medical-ai-test";
async function runDetectionTests() {
    console.log("🧪 Starting Phase 3.3 Hardened Inactive & Overdue Detection Automated Tests...");
    try {
        await mongoose_1.default.connect(MONGO_URI);
        console.log("Connected to MongoDB for Phase 3.3 testing.");
        const tenantAId = new mongoose_1.default.Types.ObjectId().toString();
        const tenantBId = new mongoose_1.default.Types.ObjectId().toString();
        // Clean test collections
        await patient_model_1.Patient.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
        await appointment_model_1.Appointment.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
        await recovery_model_1.Recovery.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
        await followup_model_1.FollowUpTask.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
        await followup_model_1.FollowUpAttempt.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
        // Dates for test scenarios
        const now = new Date();
        const sevenMonthsAgoDate = new Date(now);
        sevenMonthsAgoDate.setMonth(sevenMonthsAgoDate.getMonth() - 7);
        const sevenMonthsAgoIso = sevenMonthsAgoDate.toISOString().split("T")[0];
        const thirteenMonthsAgoDate = new Date(now);
        thirteenMonthsAgoDate.setMonth(thirteenMonthsAgoDate.getMonth() - 13);
        const thirteenMonthsAgoIso = thirteenMonthsAgoDate.toISOString().split("T")[0];
        const nextMonthDate = new Date(now);
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        const nextMonthIso = nextMonthDate.toISOString().split("T")[0];
        // Setup Test Patients under Tenant A
        const patientInactive = await patient_model_1.Patient.create({
            tenantId: tenantAId,
            firstName: "Claire",
            lastName: "Dupont",
            phone: "+21699111333",
        });
        await appointment_model_1.Appointment.create({
            tenantId: tenantAId,
            patientId: patientInactive._id,
            doctorId: "doc_123",
            treatment: "Détartrage",
            date: sevenMonthsAgoIso,
            startTime: "10:00",
            endTime: "10:30",
            status: "completed",
        });
        const patientOverdue = await patient_model_1.Patient.create({
            tenantId: tenantAId,
            firstName: "Eric",
            lastName: "Moreau",
            phone: "+21699444555",
        });
        await appointment_model_1.Appointment.create({
            tenantId: tenantAId,
            patientId: patientOverdue._id,
            doctorId: "doc_123",
            treatment: "Consultation",
            date: thirteenMonthsAgoIso,
            startTime: "11:00",
            endTime: "11:30",
            status: "completed",
        });
        const patientWithUpcoming = await patient_model_1.Patient.create({
            tenantId: tenantAId,
            firstName: "Florence",
            lastName: "Foresti",
            phone: "+21699777888",
        });
        await appointment_model_1.Appointment.create({
            tenantId: tenantAId,
            patientId: patientWithUpcoming._id,
            doctorId: "doc_123",
            treatment: "Soin",
            date: sevenMonthsAgoIso,
            startTime: "09:00",
            endTime: "09:30",
            status: "completed",
        });
        await appointment_model_1.Appointment.create({
            tenantId: tenantAId,
            patientId: patientWithUpcoming._id,
            doctorId: "doc_123",
            treatment: "Contrôle annuel",
            date: nextMonthIso,
            startTime: "14:00",
            endTime: "14:30",
            status: "scheduled",
        });
        const patientNoVisits = await patient_model_1.Patient.create({
            tenantId: tenantAId,
            firstName: "Gabriel",
            lastName: "NewLead",
            phone: "+21699000999",
        });
        // -------------------------------------------------------------
        // TEST 1 — Inactive Patient (> 6 months)
        // -------------------------------------------------------------
        console.log("\n▶ Running TEST 1 — Inactive Patient Detection (> 6 months)...");
        await recovery_service_1.recoveryService.detectRecoveryOpportunities(tenantAId);
        const recInactive = await recovery_model_1.Recovery.findOne({ tenantId: tenantAId, patientId: patientInactive._id });
        if (!recInactive || recInactive.type !== "inactive_patient") {
            throw new Error("TEST 1 FAILED: Inactive patient Recovery not created properly");
        }
        const taskInactive = await followup_model_1.FollowUpTask.findOne({ tenantId: tenantAId, recoveryId: recInactive._id });
        if (!taskInactive || taskInactive.type !== "inactive_reengagement") {
            throw new Error("TEST 1 FAILED: Inactive FollowUpTask not created properly");
        }
        console.log("✅ TEST 1 PASSED: Inactive patient (> 6 months) created Recovery + FollowUpTask.");
        // -------------------------------------------------------------
        // TEST 2 — Overdue Checkup (> 12 months)
        // -------------------------------------------------------------
        console.log("\n▶ Running TEST 2 — Overdue Checkup Detection (> 12 months)...");
        const recOverdue = await recovery_model_1.Recovery.findOne({ tenantId: tenantAId, patientId: patientOverdue._id });
        if (!recOverdue || recOverdue.type !== "overdue_checkup") {
            throw new Error("TEST 2 FAILED: Overdue checkup Recovery not created properly");
        }
        const taskOverdue = await followup_model_1.FollowUpTask.findOne({ tenantId: tenantAId, recoveryId: recOverdue._id });
        if (!taskOverdue || taskOverdue.type !== "checkup_reminder") {
            throw new Error("TEST 2 FAILED: Overdue FollowUpTask not created properly");
        }
        console.log("✅ TEST 2 PASSED: Overdue checkup (> 12 months) created Recovery + FollowUpTask.");
        // -------------------------------------------------------------
        // TEST 3 — Patient with Future Scheduled Appointment (Excluded)
        // -------------------------------------------------------------
        console.log("\n▶ Running TEST 3 — Future Scheduled Appointment Exclusion...");
        const recUpcoming = await recovery_model_1.Recovery.findOne({ tenantId: tenantAId, patientId: patientWithUpcoming._id });
        if (recUpcoming !== null) {
            throw new Error("TEST 3 FAILED: Patient with future scheduled appointment was NOT excluded!");
        }
        console.log("✅ TEST 3 PASSED: Patient with future appointment correctly excluded.");
        // -------------------------------------------------------------
        // TEST 4 — Patient with Existing Active Recovery (Excluded)
        // -------------------------------------------------------------
        console.log("\n▶ Running TEST 4 — Existing Active Recovery Exclusion...");
        const redetect = await recovery_service_1.recoveryService.detectRecoveryOpportunities(tenantAId);
        if (redetect.createdCount !== 0) {
            throw new Error(`TEST 4 FAILED: Expected 0 new opportunities for patient with active recovery, got ${redetect.createdCount}`);
        }
        console.log("✅ TEST 4 PASSED: Patient with active recovery cycle correctly excluded.");
        // -------------------------------------------------------------
        // TEST 5 — Sequential Detection Idempotency
        // -------------------------------------------------------------
        console.log("\n▶ Running TEST 5 — Sequential Detection Idempotency...");
        const allRecs = await recovery_model_1.Recovery.find({ tenantId: tenantAId });
        const allTasks = await followup_model_1.FollowUpTask.find({ tenantId: tenantAId });
        if (allRecs.length !== 2 || allTasks.length !== 2) {
            throw new Error("TEST 5 FAILED: Sequential detection run created duplicate records!");
        }
        console.log("✅ TEST 5 PASSED: Sequential detection runs are 100% idempotent.");
        // -------------------------------------------------------------
        // TEST 6 — Concurrent Detection Executions
        // -------------------------------------------------------------
        console.log("\n▶ Running TEST 6 — Concurrent Detection Idempotency...");
        await Promise.all([
            recovery_service_1.recoveryService.detectRecoveryOpportunities(tenantAId),
            recovery_service_1.recoveryService.detectRecoveryOpportunities(tenantAId),
        ]);
        const allRecsAfterConcurrent = await recovery_model_1.Recovery.find({ tenantId: tenantAId });
        const allTasksAfterConcurrent = await followup_model_1.FollowUpTask.find({ tenantId: tenantAId });
        if (allRecsAfterConcurrent.length !== 2 || allTasksAfterConcurrent.length !== 2) {
            throw new Error("TEST 6 FAILED: Concurrent detection runs created duplicate records!");
        }
        console.log("✅ TEST 6 PASSED: Concurrent detection executions are 100% idempotent.");
        // -------------------------------------------------------------
        // TEST 7 — Tenant Isolation
        // -------------------------------------------------------------
        console.log("\n▶ Running TEST 7 — Tenant Isolation in Detection...");
        const resultB = await recovery_service_1.recoveryService.detectRecoveryOpportunities(tenantBId);
        if (resultB.createdCount !== 0) {
            throw new Error("TEST 7 FAILED: Tenant B detection accessed Tenant A patients!");
        }
        console.log("✅ TEST 7 PASSED: Detection strictly isolated per tenant.");
        // -------------------------------------------------------------
        // TEST 8 — Patient with No Completed Appointment History
        // -------------------------------------------------------------
        console.log("\n▶ Running TEST 8 — Patient with No Completed Appointment History...");
        const recNoVisits = await recovery_model_1.Recovery.findOne({ tenantId: tenantAId, patientId: patientNoVisits._id });
        if (recNoVisits !== null) {
            throw new Error("TEST 8 FAILED: Patient without completed visit history was incorrectly flagged!");
        }
        console.log("✅ TEST 8 PASSED: Patient with no completed appointment history skipped cleanly.");
        // -------------------------------------------------------------
        // TEST 9 — Boundary Threshold Behavior
        // -------------------------------------------------------------
        console.log("\n▶ Running TEST 9 — Boundary Threshold Behavior...");
        const exactlySixMonthsAgo = new Date(now);
        exactlySixMonthsAgo.setMonth(exactlySixMonthsAgo.getMonth() - 6);
        const exactlySixMonthsIso = exactlySixMonthsAgo.toISOString().split("T")[0];
        const patientBoundary = await patient_model_1.Patient.create({
            tenantId: tenantAId,
            firstName: "Hugo",
            lastName: "Boundary",
            phone: "+21699888999",
        });
        await appointment_model_1.Appointment.create({
            tenantId: tenantAId,
            patientId: patientBoundary._id,
            doctorId: "doc_123",
            treatment: "Consultation",
            date: exactlySixMonthsIso,
            startTime: "12:00",
            endTime: "12:30",
            status: "completed",
        });
        await recovery_service_1.recoveryService.detectRecoveryOpportunities(tenantAId);
        const recBoundary = await recovery_model_1.Recovery.findOne({ tenantId: tenantAId, patientId: patientBoundary._id });
        if (!recBoundary || recBoundary.type !== "inactive_patient") {
            throw new Error("TEST 9 FAILED: Patient at boundary threshold did not trigger inactive_patient!");
        }
        console.log("✅ TEST 9 PASSED: Boundary threshold behavior verified.");
        // -------------------------------------------------------------
        // TEST 10 — Patient Between 6 and 12 Months (Inactive Only)
        // -------------------------------------------------------------
        console.log("\n▶ Running TEST 10 — Patient Between 6 and 12 Months...");
        if (recInactive.type !== "inactive_patient") {
            throw new Error("TEST 10 FAILED: Patient between 6 and 12 months was not inactive_patient only!");
        }
        console.log("✅ TEST 10 PASSED: Patient between 6 and 12 months created inactive_patient only.");
        // -------------------------------------------------------------
        // TEST 11 — Patient Over 12 Months (Overdue Only)
        // -------------------------------------------------------------
        console.log("\n▶ Running TEST 11 — Patient Over 12 Months...");
        if (recOverdue.type !== "overdue_checkup") {
            throw new Error("TEST 11 FAILED: Patient over 12 months was not overdue_checkup only!");
        }
        console.log("✅ TEST 11 PASSED: Patient over 12 months created overdue_checkup only.");
        // -------------------------------------------------------------
        // TEST 12 — 30-Day Cooldown Blocks Immediate Re-Detection After Terminal
        // Dismiss recInactive → re-run detection → BLOCKED by 30-day cooldown
        // -------------------------------------------------------------
        console.log("\n▶ Running TEST 12 — 30-Day Cooldown Blocks Re-Detection After Dismiss...");
        await recovery_service_1.recoveryService.dismissOpportunity(recInactive._id.toString(), tenantAId);
        // Run detection again — should be blocked by cooldown (just dismissed)
        const detectAfterTerminal = await recovery_service_1.recoveryService.detectRecoveryOpportunities(tenantAId);
        // patientInactive was just dismissed (within 30 days) → cooldown blocks it
        // patientBoundary has an active recovery from TEST 9 → also excluded
        if (detectAfterTerminal.createdCount !== 0) {
            throw new Error(`TEST 12 FAILED: Expected 0 new opportunities (cooldown active), got ${detectAfterTerminal.createdCount}`);
        }
        // Verify the dismissed recovery stays dismissed and no new recovery was created
        const recsForInactive = await recovery_model_1.Recovery.find({
            tenantId: tenantAId,
            patientId: patientInactive._id,
            status: { $in: ["identified", "queued", "contacted", "responded", "booked"] },
        });
        if (recsForInactive.length !== 0) {
            throw new Error("TEST 12 FAILED: A new active recovery was created during cooldown window!");
        }
        console.log("✅ TEST 12 PASSED: 30-day cooldown correctly blocks re-detection after dismissal.");
        console.log("\n🎉 ALL 12 PHASE 3.3 AUTOMATED TESTS PASSED SUCCESSFULLY!");
    }
    catch (error) {
        console.error("\n❌ PHASE 3.3 TEST SUITE FAILED:", error.message);
        process.exit(1);
    }
    finally {
        await mongoose_1.default.disconnect();
    }
}
runDetectionTests();
//# sourceMappingURL=detection.test.js.map