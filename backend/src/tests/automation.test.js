"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const appointment_service_1 = require("../modules/appointments/appointment.service");
const patient_model_1 = require("../modules/patients/patient.model");
const appointment_model_1 = require("../modules/appointments/appointment.model");
const recovery_model_1 = require("../modules/recovery/recovery.model");
const followup_model_1 = require("../modules/followups/followup.model");
dotenv_1.default.config();
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/medical-ai-test";
async function runAutomationTests() {
    console.log("🧪 Starting Phase 3.2 No-Show & Cancellation Automation Automated Tests...");
    try {
        await mongoose_1.default.connect(MONGO_URI);
        console.log("Connected to MongoDB for Phase 3.2 testing.");
        const tenantAId = new mongoose_1.default.Types.ObjectId().toString();
        const tenantBId = new mongoose_1.default.Types.ObjectId().toString();
        // Clean test collections
        await patient_model_1.Patient.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
        await appointment_model_1.Appointment.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
        await recovery_model_1.Recovery.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
        await followup_model_1.FollowUpTask.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
        await followup_model_1.FollowUpAttempt.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
        // Setup Test Data under Tenant A
        const patientA = await patient_model_1.Patient.create({
            tenantId: tenantAId,
            firstName: "David",
            lastName: "Guetta",
            phone: "+21699111222",
        });
        const apptNoShow = await appointment_model_1.Appointment.create({
            tenantId: tenantAId,
            patientId: patientA._id,
            doctorId: "doc_123",
            treatment: "Couronne",
            date: "2026-09-10",
            startTime: "11:00",
            endTime: "11:30",
            status: "scheduled",
        });
        const apptCancel = await appointment_model_1.Appointment.create({
            tenantId: tenantAId,
            patientId: patientA._id,
            doctorId: "doc_123",
            treatment: "Détartrage",
            date: "2026-09-12",
            startTime: "15:00",
            endTime: "15:30",
            status: "scheduled",
        });
        // -------------------------------------------------------------
        // TEST 1 & TEST 2 — No-Show Appointment Triggers Recovery & Task
        // Transition apptNoShow to "no_show"
        // -------------------------------------------------------------
        console.log("\n▶ Running TEST 1 & TEST 2 — No-Show Appointment Automation...");
        await appointment_service_1.appointmentService.updateStatus(apptNoShow._id.toString(), "no_show", tenantAId);
        const noShowRecoveries = await recovery_model_1.Recovery.find({ tenantId: tenantAId, sourceAppointmentId: apptNoShow._id });
        if (noShowRecoveries.length !== 1) {
            throw new Error(`TEST 1 FAILED: Expected 1 no_show Recovery, found ${noShowRecoveries.length}`);
        }
        const recNoShow = noShowRecoveries[0];
        if (recNoShow.type !== "no_show" || recNoShow.priority !== "high") {
            throw new Error("TEST 1 FAILED: Recovery properties do not match expected no_show rules");
        }
        console.log("✅ TEST 1 PASSED: No-show appointment created exactly 1 high-priority Recovery.");
        const noShowTasks = await followup_model_1.FollowUpTask.find({ tenantId: tenantAId, recoveryId: recNoShow._id });
        if (noShowTasks.length !== 1) {
            throw new Error(`TEST 2 FAILED: Expected 1 FollowUpTask for no_show Recovery, found ${noShowTasks.length}`);
        }
        const taskNoShow = noShowTasks[0];
        if (taskNoShow.type !== "no_show_followup" || taskNoShow.priority !== "high" || taskNoShow.status !== "pending") {
            throw new Error("TEST 2 FAILED: FollowUpTask properties do not match expected no_show_followup rules");
        }
        console.log("✅ TEST 2 PASSED: Exactly 1 high-priority pending FollowUpTask created and linked.");
        // -------------------------------------------------------------
        // TEST 3 — Repeated No-Show Processing Idempotency
        // Process apptNoShow status update to "no_show" multiple times
        // -------------------------------------------------------------
        console.log("\n▶ Running TEST 3 — No-Show Idempotency...");
        await appointment_service_1.appointmentService.updateStatus(apptNoShow._id.toString(), "no_show", tenantAId);
        await appointment_service_1.appointmentService.updateStatus(apptNoShow._id.toString(), "no_show", tenantAId);
        const noShowRecoveriesCheck = await recovery_model_1.Recovery.find({ tenantId: tenantAId, sourceAppointmentId: apptNoShow._id });
        const noShowTasksCheck = await followup_model_1.FollowUpTask.find({ tenantId: tenantAId, recoveryId: recNoShow._id });
        if (noShowRecoveriesCheck.length !== 1 || noShowTasksCheck.length !== 1) {
            throw new Error("TEST 3 FAILED: Repeated no-show status update produced duplicate Recovery or Task!");
        }
        console.log("✅ TEST 3 PASSED: Repeated no-show status updates are completely idempotent.");
        // -------------------------------------------------------------
        // TEST 4 & TEST 5 — Cancellation Appointment Triggers Recovery & Task
        // Transition apptCancel to "cancelled"
        // -------------------------------------------------------------
        console.log("\n▶ Running TEST 4 & TEST 5 — Cancellation Appointment Automation...");
        await appointment_service_1.appointmentService.updateStatus(apptCancel._id.toString(), "cancelled", tenantAId);
        const cancelRecoveries = await recovery_model_1.Recovery.find({ tenantId: tenantAId, sourceAppointmentId: apptCancel._id });
        if (cancelRecoveries.length !== 1) {
            throw new Error(`TEST 4 FAILED: Expected 1 cancellation Recovery, found ${cancelRecoveries.length}`);
        }
        const recCancel = cancelRecoveries[0];
        if (recCancel.type !== "cancellation" || recCancel.priority !== "medium") {
            throw new Error("TEST 4 FAILED: Recovery properties do not match expected cancellation rules");
        }
        console.log("✅ TEST 4 PASSED: Cancelled appointment created exactly 1 cancellation Recovery.");
        const cancelTasks = await followup_model_1.FollowUpTask.find({ tenantId: tenantAId, recoveryId: recCancel._id });
        if (cancelTasks.length !== 1) {
            throw new Error(`TEST 5 FAILED: Expected 1 FollowUpTask for cancellation Recovery, found ${cancelTasks.length}`);
        }
        const taskCancel = cancelTasks[0];
        if (taskCancel.type !== "cancellation_followup" || taskCancel.priority !== "medium") {
            throw new Error("TEST 5 FAILED: FollowUpTask properties do not match expected cancellation_followup rules");
        }
        console.log("✅ TEST 5 PASSED: Exactly 1 cancellation FollowUpTask created and linked.");
        // -------------------------------------------------------------
        // TEST 6 — Repeated Cancellation Processing Idempotency
        // -------------------------------------------------------------
        console.log("\n▶ Running TEST 6 — Cancellation Idempotency...");
        await appointment_service_1.appointmentService.updateStatus(apptCancel._id.toString(), "cancelled", tenantAId);
        await appointment_service_1.appointmentService.updateStatus(apptCancel._id.toString(), "cancelled", tenantAId);
        const cancelRecoveriesCheck = await recovery_model_1.Recovery.find({ tenantId: tenantAId, sourceAppointmentId: apptCancel._id });
        const cancelTasksCheck = await followup_model_1.FollowUpTask.find({ tenantId: tenantAId, recoveryId: recCancel._id });
        if (cancelRecoveriesCheck.length !== 1 || cancelTasksCheck.length !== 1) {
            throw new Error("TEST 6 FAILED: Repeated cancellation status update produced duplicate Recovery or Task!");
        }
        console.log("✅ TEST 6 PASSED: Repeated cancellation status updates are completely idempotent.");
        // -------------------------------------------------------------
        // TEST 7 — Cross-Tenant Appointment Status Isolation
        // Tenant B attempts to update Tenant A's appointment
        // -------------------------------------------------------------
        console.log("\n▶ Running TEST 7 — Cross-Tenant Appointment Status Isolation...");
        const updatedCross = await appointment_service_1.appointmentService.updateStatus(apptCancel._id.toString(), "cancelled", tenantBId);
        if (updatedCross !== null) {
            throw new Error("TEST 7 FAILED: Tenant B was able to update Tenant A's appointment!");
        }
        console.log("✅ TEST 7 PASSED: Cross-tenant appointment update rejected.");
        // -------------------------------------------------------------
        // TEST 8 — Association Consistency
        // Verify sourceAppointmentId matches original appointment and recoveryAppointmentId is null
        // -------------------------------------------------------------
        console.log("\n▶ Running TEST 8 — Association Consistency...");
        if (recNoShow.sourceAppointmentId?.toString() !== apptNoShow._id.toString() || recNoShow.recoveryAppointmentId) {
            throw new Error("TEST 8 FAILED: sourceAppointmentId mismatch or recoveryAppointmentId prematurely assigned");
        }
        console.log("✅ TEST 8 PASSED: sourceAppointmentId matches and recoveryAppointmentId is unassigned.");
        console.log("\n🎉 ALL PHASE 3.2 AUTOMATED TESTS PASSED SUCCESSFULLY!");
    }
    catch (error) {
        console.error("\n❌ PHASE 3.2 TEST SUITE FAILED:", error.message);
        process.exit(1);
    }
    finally {
        await mongoose_1.default.disconnect();
    }
}
runAutomationTests();
//# sourceMappingURL=automation.test.js.map