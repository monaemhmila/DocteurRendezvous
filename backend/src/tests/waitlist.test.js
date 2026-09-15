"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const waitlist_service_1 = require("../modules/waitlist/waitlist.service");
const waitlist_model_1 = require("../modules/waitlist/waitlist.model");
const followup_model_1 = require("../modules/followups/followup.model");
const patient_model_1 = require("../modules/patients/patient.model");
const appointment_model_1 = require("../modules/appointments/appointment.model");
const appointment_service_1 = require("../modules/appointments/appointment.service");
const followup_service_1 = require("../modules/followups/followup.service");
dotenv_1.default.config();
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/medical-ai-test";
async function runWaitlistTests() {
    console.log("🧪 Starting Phase 3.5 — Waitlist & Deterministic Slot-Filling Tests...");
    try {
        await mongoose_1.default.connect(MONGO_URI);
        console.log("Connected to MongoDB for Phase 3.5 testing.");
        const tenantAId = new mongoose_1.default.Types.ObjectId().toString();
        const tenantBId = new mongoose_1.default.Types.ObjectId().toString();
        // Clean up
        await patient_model_1.Patient.deleteMany({});
        await appointment_model_1.Appointment.deleteMany({});
        await waitlist_model_1.WaitlistEntry.deleteMany({});
        await followup_model_1.FollowUpTask.deleteMany({});
        await followup_model_1.FollowUpAttempt.deleteMany({});
        // Drop old indexes to ensure new partial filters take effect
        try {
            await followup_model_1.FollowUpTask.collection.dropIndexes();
        }
        catch (e) { }
        await followup_model_1.FollowUpTask.syncIndexes();
        try {
            await appointment_model_1.Appointment.collection.dropIndexes();
        }
        catch (e) { }
        await appointment_model_1.Appointment.syncIndexes();
        // Patients
        const patientA = await patient_model_1.Patient.create({ tenantId: tenantAId, firstName: "Alice", lastName: "Wonderland", phone: "111" });
        const patientB = await patient_model_1.Patient.create({ tenantId: tenantAId, firstName: "Bob", lastName: "Builder", phone: "222" });
        const patientC = await patient_model_1.Patient.create({ tenantId: tenantBId, firstName: "Charlie", lastName: "Chaplin", phone: "333" });
        // ================================================================
        // TEST 1 — Waitlist Uniqueness & Tenant Isolation
        // ================================================================
        console.log("\n▶ TEST 1 — Waitlist Uniqueness & Tenant Isolation...");
        await waitlist_service_1.waitlistService.createEntry({
            patientId: patientA._id,
            treatment: "Checkup",
            priority: "high"
        }, tenantAId);
        // Same patient, same treatment -> should fail
        let test1Passed = false;
        try {
            await waitlist_service_1.waitlistService.createEntry({
                patientId: patientA._id,
                treatment: "Checkup",
                priority: "low"
            }, tenantAId);
        }
        catch (e) {
            if (e.code === 11000)
                test1Passed = true;
        }
        if (!test1Passed)
            throw new Error("TEST 1 FAILED: Duplicate waitlist entry allowed for same patient/treatment");
        // Same patient, different treatment -> should succeed
        await waitlist_service_1.waitlistService.createEntry({
            patientId: patientA._id,
            treatment: "Whitening",
            priority: "medium"
        }, tenantAId);
        console.log("✅ TEST 1 PASSED: Uniqueness properly enforced (same treatment rejected, different allowed).");
        // ================================================================
        // TEST 2 — Slot Matching (Prioritization & Eligibility)
        // ================================================================
        console.log("\n▶ TEST 2 — Slot Matching & Prioritization...");
        // Create candidate B with low priority, waiting for Friday
        await waitlist_service_1.waitlistService.createEntry({
            patientId: patientB._id,
            treatment: "Surgery",
            priority: "low",
            preferredDays: ["Friday"]
        }, tenantAId);
        // Create a source appointment on a Friday to be cancelled
        const sourceAppt = await appointment_model_1.Appointment.create({
            tenantId: tenantAId,
            patientId: patientA._id,
            doctorId: "doc1",
            date: "2026-10-16", // A Friday
            startTime: "10:00",
            endTime: "10:30",
            treatment: "Checkup",
            status: "scheduled"
        });
        // Cancel it -> triggers waitlistService inside appointmentService.updateStatus
        await appointment_service_1.appointmentService.updateStatus(sourceAppt._id.toString(), "cancelled", tenantAId);
        // Check if FollowUpTask was created
        const slotOfferTask = await followup_model_1.FollowUpTask.findOne({
            tenantId: tenantAId,
            sourceAppointmentId: sourceAppt._id,
            type: "slot_fill_offer"
        });
        if (!slotOfferTask)
            throw new Error("TEST 2 FAILED: No slot offer task created");
        // Who got it? 
        // Patient A (Checkup, High priority) vs Patient A (Whitening, Medium) vs Patient B (Surgery, Low, preferred Friday)
        // Both are eligible because Patient A didn't specify preferredDays (open to all), Patient B specified Friday (matches).
        // Patient A (Checkup) has High priority (150).
        const winningEntry = await waitlist_model_1.WaitlistEntry.findById(slotOfferTask.waitlistEntryId);
        if (!winningEntry || winningEntry.patientId.toString() !== patientA._id.toString() || winningEntry.treatment !== "Checkup") {
            throw new Error("TEST 2 FAILED: Wrong candidate selected. Expected Alice Checkup (high priority).");
        }
        console.log("✅ TEST 2 PASSED: Slot correctly matched and prioritized to highest score candidate.");
        // ================================================================
        // TEST 3 — Slot Offer DB Concurrency
        // ================================================================
        console.log("\n▶ TEST 3 — Slot Offer DB Concurrency...");
        // Try to manually create another slot offer for the exact same sourceAppointmentId
        let test3Passed = false;
        try {
            await followup_model_1.FollowUpTask.create({
                tenantId: tenantAId,
                patientId: patientB._id,
                waitlistEntryId: winningEntry._id,
                sourceAppointmentId: sourceAppt._id,
                type: "slot_fill_offer",
                priority: "medium",
                status: "pending"
            });
        }
        catch (e) {
            if (e.code === 11000)
                test3Passed = true;
        }
        if (!test3Passed)
            throw new Error("TEST 3 FAILED: DB concurrency unique index failed to block duplicate slot offer");
        console.log("✅ TEST 3 PASSED: Database correctly blocks concurrent slot offers for the same slot.");
        // ================================================================
        // TEST 4 — Candidate Declines -> Waitlist Active, Task Closed
        // ================================================================
        console.log("\n▶ TEST 4 — Candidate Declines...");
        await followup_service_1.followupService.logAttempt({
            waitlistEntryId: winningEntry._id.toString(),
            taskId: slotOfferTask._id.toString(),
            outcome: "spoken_declined"
        }, tenantAId);
        const declinedEntry = await waitlist_model_1.WaitlistEntry.findById(winningEntry._id);
        const declinedTask = await followup_model_1.FollowUpTask.findById(slotOfferTask._id);
        if (declinedEntry?.status !== "active")
            throw new Error("TEST 4 FAILED: WaitlistEntry should remain active when declined");
        if (declinedTask?.status !== "cancelled")
            throw new Error("TEST 4 FAILED: FollowUpTask should be cancelled when declined");
        console.log("✅ TEST 4 PASSED: Candidate declines, waitlist remains active, task cancelled.");
        // Now, trigger finding another candidate for the same slot (simulate next candidate)
        const nextTask = await waitlist_service_1.waitlistService.findCandidatesAndOfferSlot(tenantAId, sourceAppt);
        if (!nextTask)
            throw new Error("TEST 4 FAILED: Should have found the next candidate (Patient A Whitening or Patient B)");
        // ================================================================
        // TEST 5 — Candidate Accepts & Safe Booking
        // ================================================================
        console.log("\n▶ TEST 5 — Candidate Accepts & Fulfills...");
        // Accept it
        await followup_service_1.followupService.logAttempt({
            waitlistEntryId: nextTask.waitlistEntryId?.toString(),
            taskId: nextTask._id.toString(),
            outcome: "spoken_agreed"
        }, tenantAId);
        const acceptedTask = await followup_model_1.FollowUpTask.findById(nextTask._id);
        if (acceptedTask?.status !== "pending" && acceptedTask?.status !== "in_progress") {
            throw new Error("TEST 5 FAILED: Task should remain actionable after spoken_agreed");
        }
        // Fulfill it
        const newAppt = await waitlist_service_1.waitlistService.fulfillWaitlistEntry(nextTask.waitlistEntryId.toString(), tenantAId, sourceAppt.doctorId, sourceAppt.date, sourceAppt.startTime, sourceAppt.endTime, nextTask._id.toString());
        const fulfilledEntry = await waitlist_model_1.WaitlistEntry.findById(nextTask.waitlistEntryId);
        const completedTask = await followup_model_1.FollowUpTask.findById(nextTask._id);
        if (fulfilledEntry?.status !== "fulfilled")
            throw new Error("TEST 5 FAILED: WaitlistEntry not fulfilled");
        if (completedTask?.status !== "completed")
            throw new Error("TEST 5 FAILED: FollowUpTask not completed");
        console.log("✅ TEST 5 PASSED: Candidate accepts, manual booking fulfills waitlist and completes task.");
        // ================================================================
        // TEST 6 — Appointment Double-Booking DB Concurrency
        // ================================================================
        console.log("\n▶ TEST 6 — Appointment Double-Booking DB Concurrency...");
        // Try to book the exact same slot again (same doctor, date, startTime, status scheduled)
        let test6Passed = false;
        try {
            await appointment_model_1.Appointment.create({
                tenantId: tenantAId,
                patientId: patientA._id,
                doctorId: sourceAppt.doctorId,
                date: sourceAppt.date,
                startTime: sourceAppt.startTime,
                endTime: sourceAppt.endTime,
                treatment: "Double booking test",
                status: "scheduled"
            });
        }
        catch (e) {
            if (e.code === 11000)
                test6Passed = true;
        }
        if (!test6Passed)
            throw new Error("TEST 6 FAILED: DB concurrency unique index failed to block double booking");
        console.log("✅ TEST 6 PASSED: Database correctly blocks concurrent appointment double bookings.");
        console.log("\n🎉 ALL PHASE 3.5 WAITLIST TESTS PASSED SUCCESSFULLY!");
    }
    catch (err) {
        console.error("\n❌ PHASE 3.5 TEST SUITE FAILED:", err.message);
        process.exit(1);
    }
    finally {
        await mongoose_1.default.disconnect();
    }
}
runWaitlistTests();
//# sourceMappingURL=waitlist.test.js.map