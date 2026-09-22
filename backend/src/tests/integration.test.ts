import mongoose from "mongoose";
import dotenv from "dotenv";
import { recoveryService } from "../modules/recovery/recovery.service";
import { followupService, FOLLOWUP_CONFIG } from "../modules/followups/followup.service";
import { appointmentService } from "../modules/appointments/appointment.service";
import { Patient } from "../modules/patients/patient.model";
import { Appointment } from "../modules/appointments/appointment.model";
import { Recovery } from "../modules/recovery/recovery.model";
import { FollowUpTask, FollowUpAttempt } from "../modules/followups/followup.model";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/medical-ai-test";

async function runIntegrationTests() {
  console.log("🧪 Starting Phase 3.4 — Recovery & Follow-Up Engine Integration Tests...");

  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB for Phase 3.4 testing.");

    const tenantAId = new mongoose.Types.ObjectId().toString();
    const tenantBId = new mongoose.Types.ObjectId().toString();

    // Clean test collections
    await Patient.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
    await Appointment.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
    await Recovery.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
    await FollowUpTask.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
    await FollowUpAttempt.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });

    // ----------------------------------------------------------------
    // Shared setup
    // ----------------------------------------------------------------
    const patientA = await Patient.create({
      tenantId: tenantAId,
      firstName: "Marie",
      lastName: "Curie",
      phone: "+21699001001",
    });

    const patientB = await Patient.create({
      tenantId: tenantBId,
      firstName: "Albert",
      lastName: "Einstein",
      phone: "+21699002002",
    });

    // Source appointment that triggered the no_show Recovery
    const sourceAppt = await Appointment.create({
      tenantId: tenantAId,
      patientId: patientA._id,
      doctorId: "doc_main",
      treatment: "Détartrage",
      date: "2026-08-01",
      startTime: "09:00",
      endTime: "09:30",
      status: "no_show",
    });

    // The new appointment that will be booked as part of the recovery
    const recoveryAppt = await Appointment.create({
      tenantId: tenantAId,
      patientId: patientA._id,
      doctorId: "doc_main",
      treatment: "Détartrage - Rattrapage",
      date: "2026-09-20",
      startTime: "10:00",
      endTime: "10:30",
      status: "scheduled",
    });

    // An unrelated appointment for the same patient (must NOT be affected)
    const unrelatedAppt = await Appointment.create({
      tenantId: tenantAId,
      patientId: patientA._id,
      doctorId: "doc_main",
      treatment: "Consultation",
      date: "2026-09-25",
      startTime: "11:00",
      endTime: "11:30",
      status: "scheduled",
    });

    // Appointment belonging to tenant B (cross-tenant)
    const apptTenantB = await Appointment.create({
      tenantId: tenantBId,
      patientId: patientB._id,
      doctorId: "doc_other",
      treatment: "Soin",
      date: "2026-09-20",
      startTime: "14:00",
      endTime: "14:30",
      status: "scheduled",
    });

    // ================================================================
    // TEST 1 — Recovery identified → FollowUpTask pending
    // ================================================================
    console.log("\n▶ TEST 1 — Recovery identified → FollowUpTask pending...");

    const recovery = await recoveryService.createOpportunity(
      {
        patientId: patientA._id as any,
        sourceAppointmentId: sourceAppt._id as any,
        type: "no_show",
        priority: "high",
        estimatedValue: 150,
      },
      tenantAId
    );

    if (!recovery || recovery.status !== "identified") {
      throw new Error("TEST 1 FAILED: Recovery not created with status 'identified'");
    }
    if (recovery.recoveryAppointmentId) {
      throw new Error("TEST 1 FAILED: recoveryAppointmentId should be unset at creation");
    }

    const task = await followupService.createTask(
      {
        patientId: patientA._id as any,
        recoveryId: recovery._id as any,
        type: "no_show_followup",
        priority: "high",
        status: "pending",
      },
      tenantAId
    );

    if (!task || task.status !== "pending" || task.attemptCount !== 0) {
      throw new Error("TEST 1 FAILED: FollowUpTask not created with correct initial state");
    }
    console.log("✅ TEST 1 PASSED: Recovery 'identified' + FollowUpTask 'pending' created.");

    // ================================================================
    // TEST 2 — Attempt logging updates correct Recovery/Task
    // ================================================================
    console.log("\n▶ TEST 2 — Attempt logging updates correct Recovery/Task...");

    await recoveryService.markContacted(recovery._id.toString(), tenantAId);

    const attempt1 = await followupService.logAttempt(
      {
        recoveryId: recovery._id.toString(),
        taskId: task._id.toString(),
        channel: "phone",
        outcome: "no_answer",
      },
      tenantAId
    );

    const updatedTask = await FollowUpTask.findById(task._id);
    const updatedRecovery = await Recovery.findById(recovery._id);

    if (!attempt1 || attempt1.attemptNumber !== 1) {
      throw new Error("TEST 2 FAILED: Attempt number should be 1");
    }
    if (updatedTask?.attemptCount !== 1 || updatedTask?.status !== "in_progress") {
      throw new Error("TEST 2 FAILED: Task should have attemptCount=1 and status='in_progress'");
    }
    if (!updatedRecovery?.lastContactedAt) {
      throw new Error("TEST 2 FAILED: Recovery should have lastContactedAt set");
    }
    console.log("✅ TEST 2 PASSED: Attempt logged, task and recovery updated correctly.");

    // ================================================================
    // TEST 3 — no_answer increments attempts
    // ================================================================
    console.log("\n▶ TEST 3 — no_answer increments attempts...");

    const attempt2 = await followupService.logAttempt(
      {
        recoveryId: recovery._id.toString(),
        taskId: task._id.toString(),
        channel: "phone",
        outcome: "no_answer",
      },
      tenantAId
    );

    const taskAfter2 = await FollowUpTask.findById(task._id);
    if (attempt2.attemptNumber !== 2 || taskAfter2?.attemptCount !== 2) {
      throw new Error("TEST 3 FAILED: Attempt count should be 2");
    }
    console.log("✅ TEST 3 PASSED: no_answer correctly incremented attemptCount to 2.");

    // ================================================================
    // TEST 4 — MAX_ATTEMPTS_DEFAULT causes correct terminal lifecycle
    // ================================================================
    console.log(`\n▶ TEST 4 — MAX_ATTEMPTS_DEFAULT (${FOLLOWUP_CONFIG.MAX_ATTEMPTS_DEFAULT}) terminal lifecycle...`);

    // 3rd attempt (should trigger terminal: no_response + expired)
    await followupService.logAttempt(
      {
        recoveryId: recovery._id.toString(),
        taskId: task._id.toString(),
        channel: "phone",
        outcome: "no_answer",
      },
      tenantAId
    );

    const terminalRecovery = await Recovery.findById(recovery._id);
    const terminalTask = await FollowUpTask.findById(task._id);

    if (terminalRecovery?.status !== "no_response") {
      throw new Error(`TEST 4 FAILED: Expected Recovery status 'no_response', got '${terminalRecovery?.status}'`);
    }
    if (terminalTask?.status !== "expired") {
      throw new Error(`TEST 4 FAILED: Expected Task status 'expired', got '${terminalTask?.status}'`);
    }
    console.log("✅ TEST 4 PASSED: MAX_ATTEMPTS reached → Recovery=no_response, Task=expired.");

    // ================================================================
    // TEST 5 — spoken_agreed → responded
    // ================================================================
    console.log("\n▶ TEST 5 — spoken_agreed → Recovery responded...");

    const recoveryB = await recoveryService.createOpportunity(
      {
        patientId: patientA._id as any,
        type: "cancellation",
        priority: "medium",
        estimatedValue: 200,
      },
      tenantAId
    );
    const taskB = await followupService.createTask(
      {
        patientId: patientA._id as any,
        recoveryId: recoveryB._id as any,
        type: "cancellation_followup",
        priority: "medium",
      },
      tenantAId
    );
    await recoveryService.markContacted(recoveryB._id.toString(), tenantAId);

    await followupService.logAttempt(
      {
        recoveryId: recoveryB._id.toString(),
        taskId: taskB._id.toString(),
        channel: "phone",
        outcome: "spoken_agreed",
      },
      tenantAId
    );

    const recoveryBAfter = await Recovery.findById(recoveryB._id);
    const taskBAfter = await FollowUpTask.findById(taskB._id);

    if (recoveryBAfter?.status !== "responded") {
      throw new Error(`TEST 5 FAILED: Expected Recovery status 'responded', got '${recoveryBAfter?.status}'`);
    }
    // Task should still be active (not completed) — awaiting booking
    if (!["pending", "in_progress"].includes(taskBAfter?.status ?? "")) {
      throw new Error(`TEST 5 FAILED: Task should still be active after spoken_agreed, got '${taskBAfter?.status}'`);
    }
    console.log("✅ TEST 5 PASSED: spoken_agreed → Recovery responded. Task remains active pending booking.");

    // ================================================================
    // TEST 6 — spoken_declined → correct terminal Recovery state
    // ================================================================
    console.log("\n▶ TEST 6 — spoken_declined → Recovery dismissed...");

    const recoveryC = await recoveryService.createOpportunity(
      {
        patientId: patientA._id as any,
        type: "overdue_checkup",
        priority: "medium",
        estimatedValue: 100,
      },
      tenantAId
    );
    const taskC = await followupService.createTask(
      {
        patientId: patientA._id as any,
        recoveryId: recoveryC._id as any,
        type: "checkup_reminder",
        priority: "medium",
      },
      tenantAId
    );
    await recoveryService.markContacted(recoveryC._id.toString(), tenantAId);

    await followupService.logAttempt(
      {
        recoveryId: recoveryC._id.toString(),
        taskId: taskC._id.toString(),
        channel: "phone",
        outcome: "spoken_declined",
      },
      tenantAId
    );

    const recoveryCAfter = await Recovery.findById(recoveryC._id);
    const taskCAfter = await FollowUpTask.findById(taskC._id);

    if (recoveryCAfter?.status !== "dismissed") {
      throw new Error(`TEST 6 FAILED: Expected Recovery 'dismissed', got '${recoveryCAfter?.status}'`);
    }
    if (taskCAfter?.status !== "cancelled") {
      throw new Error(`TEST 6 FAILED: Expected Task 'cancelled', got '${taskCAfter?.status}'`);
    }
    console.log("✅ TEST 6 PASSED: spoken_declined → Recovery=dismissed, Task=cancelled.");

    // ================================================================
    // TEST 7 — invalid_number deterministic behavior
    // ================================================================
    console.log("\n▶ TEST 7 — invalid_number records attempt but no terminal transition...");

    const recoveryD = await recoveryService.createOpportunity(
      {
        patientId: patientA._id as any,
        type: "inactive_patient",
        priority: "low",
        estimatedValue: 80,
      },
      tenantAId
    );
    const taskD = await followupService.createTask(
      {
        patientId: patientA._id as any,
        recoveryId: recoveryD._id as any,
        type: "inactive_reengagement",
        priority: "low",
      },
      tenantAId
    );
    await recoveryService.markContacted(recoveryD._id.toString(), tenantAId);

    // Simulate 3 invalid_number outcomes (should NOT trigger MAX_ATTEMPTS terminal)
    for (let i = 0; i < 3; i++) {
      await followupService.logAttempt(
        {
          recoveryId: recoveryD._id.toString(),
          taskId: taskD._id.toString(),
          channel: "phone",
          outcome: "invalid_number",
        },
        tenantAId
      );
    }

    const recoveryDAfter = await Recovery.findById(recoveryD._id);
    const taskDAfter = await FollowUpTask.findById(taskD._id);
    const attemptsD = await FollowUpAttempt.find({ recoveryId: recoveryD._id });

    if (recoveryDAfter?.status === "no_response") {
      throw new Error("TEST 7 FAILED: invalid_number should NOT trigger no_response terminal state");
    }
    if (taskDAfter?.status === "expired") {
      throw new Error("TEST 7 FAILED: invalid_number should NOT expire the task");
    }
    if (attemptsD.length !== 3) {
      throw new Error(`TEST 7 FAILED: Expected 3 attempts recorded, got ${attemptsD.length}`);
    }
    console.log("✅ TEST 7 PASSED: invalid_number records attempts but no terminal transition fired.");

    // ================================================================
    // TEST 8 — Booking creates/associates correct recoveryAppointmentId
    // ================================================================
    console.log("\n▶ TEST 8 — Booking associates correct recoveryAppointmentId...");

    // recoveryB is currently in 'responded' (from TEST 5)
    const bookedResult = await recoveryService.markBooked(
      recoveryB._id.toString(),
      recoveryAppt._id.toString(),
      200,
      tenantAId
    );

    if (bookedResult.status !== "booked") {
      throw new Error(`TEST 8 FAILED: Expected Recovery status 'booked', got '${bookedResult.status}'`);
    }
    if (bookedResult.recoveryAppointmentId?.toString() !== recoveryAppt._id.toString()) {
      throw new Error("TEST 8 FAILED: recoveryAppointmentId does not match the booked appointment");
    }
    // The associated FollowUpTask (taskB) should now be completed
    const taskBCompleted = await FollowUpTask.findById(taskB._id);
    if (taskBCompleted?.status !== "completed") {
      throw new Error(`TEST 8 FAILED: FollowUpTask should be 'completed' after booking, got '${taskBCompleted?.status}'`);
    }
    console.log("✅ TEST 8 PASSED: Booking sets recoveryAppointmentId and completes the existing FollowUpTask.");

    // ================================================================
    // TEST 9 — Booking is idempotent
    // ================================================================
    console.log("\n▶ TEST 9 — Booking idempotency...");

    // Call markBooked again with the same arguments
    const bookedIdempotent = await recoveryService.markBooked(
      recoveryB._id.toString(),
      recoveryAppt._id.toString(),
      200,
      tenantAId
    );

    if (bookedIdempotent.status !== "booked") {
      throw new Error("TEST 9 FAILED: Idempotent booking changed Recovery status");
    }
    // Ensure no duplicate tasks were created
    const allTasksForB = await FollowUpTask.find({ tenantId: tenantAId, recoveryId: recoveryB._id });
    if (allTasksForB.length !== 1) {
      throw new Error(`TEST 9 FAILED: Expected 1 task for recovery B, got ${allTasksForB.length}`);
    }
    console.log("✅ TEST 9 PASSED: Repeated booking call is fully idempotent.");

    // ================================================================
    // TEST 10 — Appointment completion marks ONLY the matching Recovery
    // ================================================================
    console.log("\n▶ TEST 10 — Appointment completion marks ONLY the Recovery with matching recoveryAppointmentId...");

    // Create another recovery for same patient with a different recovery appointment
    const anotherAppt = await Appointment.create({
      tenantId: tenantAId,
      patientId: patientA._id,
      doctorId: "doc_main",
      treatment: "Facettes",
      date: "2026-09-28",
      startTime: "09:00",
      endTime: "09:30",
      status: "scheduled",
    });

    // recoveryD is still active (responded/contacted), let it reach booked state with anotherAppt
    await recoveryService.markContacted(recoveryD._id.toString(), tenantAId).catch(() => {}); // might already be contacted
    // Get current state
    const recoveryDCurrent = await Recovery.findById(recoveryD._id);
    // Transition to responded if needed
    if (recoveryDCurrent?.status === "contacted") {
      await recoveryService.markResponded(recoveryD._id.toString(), tenantAId);
    }
    await recoveryService.markBooked(recoveryD._id.toString(), anotherAppt._id.toString(), 80, tenantAId);

    // Mark recoveryAppt (linked to recoveryB) as completed
    await appointmentService.updateStatus(recoveryAppt._id.toString(), "completed", tenantAId);

    const recoveryBFinal = await Recovery.findById(recoveryB._id);
    const recoveryDFinal = await Recovery.findById(recoveryD._id);

    if (recoveryBFinal?.status !== "visited") {
      throw new Error(`TEST 10 FAILED: Recovery B should be 'visited', got '${recoveryBFinal?.status}'`);
    }
    // Recovery D is linked to anotherAppt, not recoveryAppt — should remain booked
    if (recoveryDFinal?.status !== "booked") {
      throw new Error(`TEST 10 FAILED: Recovery D should remain 'booked', got '${recoveryDFinal?.status}'`);
    }
    console.log("✅ TEST 10 PASSED: Only Recovery B (matched by recoveryAppointmentId) moved to visited.");

    // ================================================================
    // TEST 11 — Unrelated recoveries for same patient remain unchanged
    // ================================================================
    console.log("\n▶ TEST 11 — Unrelated recoveries for same patient remain unchanged...");

    // recoveryC is dismissed, recoveryD is booked, recoveryB is visited
    // Complete unrelatedAppt — should NOT affect any existing recovery
    await appointmentService.updateStatus(unrelatedAppt._id.toString(), "completed", tenantAId);

    const recoveryCCheck = await Recovery.findById(recoveryC._id);
    const recoveryDCheck = await Recovery.findById(recoveryD._id);
    const recoveryBCheck = await Recovery.findById(recoveryB._id);

    if (recoveryCCheck?.status !== "dismissed") {
      throw new Error(`TEST 11 FAILED: Recovery C changed from 'dismissed' to '${recoveryCCheck?.status}'`);
    }
    // Recovery D is booked to anotherAppt, not unrelatedAppt — should remain booked
    if (recoveryDCheck?.status !== "booked") {
      throw new Error(`TEST 11 FAILED: Recovery D changed from 'booked' to '${recoveryDCheck?.status}'`);
    }
    if (recoveryBCheck?.status !== "visited") {
      throw new Error(`TEST 11 FAILED: Recovery B changed from 'visited' to '${recoveryBCheck?.status}'`);
    }
    console.log("✅ TEST 11 PASSED: Completing unrelated appointment does not affect other recoveries.");

    // ================================================================
    // TEST 12 — Cross-tenant booking is rejected
    // ================================================================
    console.log("\n▶ TEST 12 — Cross-tenant booking is rejected...");

    // Create a recovery under Tenant A and attempt to book with Tenant B's appointment
    const recoveryE = await recoveryService.createOpportunity(
      {
        patientId: patientA._id as any,
        type: "follow_up_required",
        priority: "low",
      },
      tenantAId
    );
    await recoveryService.markContacted(recoveryE._id.toString(), tenantAId);
    await recoveryService.markResponded(recoveryE._id.toString(), tenantAId);

    let test12Passed = false;
    try {
      // apptTenantB belongs to tenantB — should be rejected
      await recoveryService.markBooked(
        recoveryE._id.toString(),
        apptTenantB._id.toString(),
        100,
        tenantAId
      );
    } catch (err: any) {
      if (err.message.includes("not found or does not match")) {
        test12Passed = true;
      } else {
        console.error("TEST 12 unexpected error:", err.message);
      }
    }
    if (!test12Passed) {
      throw new Error("TEST 12 FAILED: Cross-tenant appointment booking was NOT rejected!");
    }
    console.log("✅ TEST 12 PASSED: Cross-tenant appointment booking correctly rejected.");

    // ================================================================
    // TEST 13 — Cross-tenant appointment association rejected
    // ================================================================
    console.log("\n▶ TEST 13 — Cross-tenant appointment association rejected (processAppointmentCompletion)...");

    // Attempt to mark Tenant B's appointment as completed via Tenant A's context
    const crossTenantUpdate = await appointmentService.updateStatus(
      apptTenantB._id.toString(),
      "completed",
      tenantAId // wrong tenant
    );
    // The update itself should be rejected (null return means not found in that tenant)
    if (crossTenantUpdate !== null) {
      throw new Error("TEST 13 FAILED: Tenant A was able to update Tenant B's appointment!");
    }
    console.log("✅ TEST 13 PASSED: Cross-tenant appointment status update rejected.");

    // ================================================================
    // TEST 14 — FollowUpTask terminal-state protection remains intact
    // ================================================================
    console.log("\n▶ TEST 14 — FollowUpTask terminal-state protection...");

    // taskB is already completed (from TEST 8) — attempting to complete again should throw
    let test14Passed = false;
    try {
      await followupService.completeTask(taskB._id.toString(), tenantAId, "Re-completing");
    } catch (err: any) {
      if (err.message.includes("Invalid task status transition from terminal state")) {
        test14Passed = true;
      }
    }
    if (!test14Passed) {
      throw new Error("TEST 14 FAILED: Re-completing a terminal task was NOT rejected!");
    }
    // Also verify completeTaskForRecovery is idempotent for an already-completed task
    const noOpResult = await followupService.completeTaskForRecovery(recoveryB._id.toString(), tenantAId);
    if (noOpResult !== null) {
      throw new Error("TEST 14 FAILED: completeTaskForRecovery should return null when no active task exists");
    }
    console.log("✅ TEST 14 PASSED: Terminal task protection intact; completeTaskForRecovery is idempotent.");

    // ================================================================
    // TEST 15 — 30-day cooldown blocks repeated inactive/overdue detection
    // ================================================================
    console.log("\n▶ TEST 15 — 30-day cooldown blocks repeated inactive/overdue detection...");

    // Create a fresh patient with an overdue visit
    const thirteenMonthsAgo = new Date();
    thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);
    const thirteenMonthsAgoIso = thirteenMonthsAgo.toISOString().split("T")[0];

    const patientOverdue = await Patient.create({
      tenantId: tenantAId,
      firstName: "Cool",
      lastName: "Down",
      phone: "+21699090909",
    });
    await Appointment.create({
      tenantId: tenantAId,
      patientId: patientOverdue._id,
      doctorId: "doc_main",
      treatment: "Consultation",
      date: thirteenMonthsAgoIso,
      startTime: "09:00",
      endTime: "09:30",
      status: "completed",
    });

    // First detection run — creates overdue_checkup Recovery
    await recoveryService.detectRecoveryOpportunities(tenantAId);
    const firstRecovery = await Recovery.findOne({ tenantId: tenantAId, patientId: patientOverdue._id });
    if (!firstRecovery || firstRecovery.type !== "overdue_checkup") {
      throw new Error("TEST 15 SETUP FAILED: overdue_checkup Recovery not created");
    }

    // Dismiss it to make it terminal
    await recoveryService.dismissOpportunity(firstRecovery._id.toString(), tenantAId);

    // Second detection run — should be blocked by 30-day cooldown
    await recoveryService.detectRecoveryOpportunities(tenantAId);
    const secondRecovery = await Recovery.findOne({
      tenantId: tenantAId,
      patientId: patientOverdue._id,
      status: { $in: ["identified", "queued", "contacted", "responded", "booked"] },
    });
    if (secondRecovery) {
      throw new Error("TEST 15 FAILED: 30-day cooldown did NOT block re-detection after dismissal!");
    }
    console.log("✅ TEST 15 PASSED: 30-day cooldown blocks repeated inactive/overdue detection.");

    // ================================================================
    // TEST 16 — Detection IS allowed after cooldown (simulated via back-dating)
    // ================================================================
    console.log("\n▶ TEST 16 — Detection allowed after cooldown (back-dated terminal recovery)...");

    // Force the dismissed recovery to have updatedAt beyond the cooldown window
    const cooldownDays = FOLLOWUP_CONFIG.RECOVERY_REDETECTION_COOLDOWN_DAYS;
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - (cooldownDays + 1)); // 31 days ago

    await Recovery.collection.updateOne(
      { _id: firstRecovery._id },
      { $set: { updatedAt: pastDate } }
    );

    // Re-run detection — should now be allowed
    await recoveryService.detectRecoveryOpportunities(tenantAId);
    const postCooldownRecovery = await Recovery.findOne({
      tenantId: tenantAId,
      patientId: patientOverdue._id,
      status: { $in: ["identified", "queued", "contacted", "responded", "booked"] },
    });
    if (!postCooldownRecovery) {
      throw new Error("TEST 16 FAILED: Detection should be allowed after cooldown period expired!");
    }
    console.log("✅ TEST 16 PASSED: Detection is allowed after the 30-day cooldown window expires.");

    // ================================================================
    // TEST 17 — no_show recovery allowed during detection type cooldown
    // ================================================================
    console.log("\n▶ TEST 17 — no_show Recovery allowed during inactive/overdue cooldown...");

    // patientOverdue has a terminal inactive recovery within the cooldown.
    // A no_show event for the same patient should still create a Recovery.
    const noShowAppt = await Appointment.create({
      tenantId: tenantAId,
      patientId: patientOverdue._id,
      doctorId: "doc_main",
      treatment: "Détartrage",
      date: "2026-09-15",
      startTime: "09:00",
      endTime: "09:30",
      status: "scheduled",
    });

    // Reset: dismiss postCooldownRecovery to make patientOverdue inactive again and back-date it
    if (postCooldownRecovery) {
      await recoveryService.dismissOpportunity(postCooldownRecovery._id.toString(), tenantAId);
      await Recovery.updateOne({ _id: postCooldownRecovery._id }, { $set: { updatedAt: new Date() } });
    }

    // Trigger no_show via appointment service
    await appointmentService.updateStatus(noShowAppt._id.toString(), "no_show", tenantAId);

    const noShowRecovery = await Recovery.findOne({
      tenantId: tenantAId,
      patientId: patientOverdue._id,
      type: "no_show",
    });
    if (!noShowRecovery) {
      throw new Error("TEST 17 FAILED: no_show Recovery was NOT created during cooldown window!");
    }
    console.log("✅ TEST 17 PASSED: no_show Recovery created correctly even during detection type cooldown.");

    // ================================================================
    // TEST 18 — cancellation Recovery allowed during detection type cooldown
    // ================================================================
    console.log("\n▶ TEST 18 — cancellation Recovery allowed during inactive/overdue cooldown...");

    const cancelAppt = await Appointment.create({
      tenantId: tenantAId,
      patientId: patientOverdue._id,
      doctorId: "doc_main",
      treatment: "Consultation",
      date: "2026-09-22",
      startTime: "14:00",
      endTime: "14:30",
      status: "scheduled",
    });

    await appointmentService.updateStatus(cancelAppt._id.toString(), "cancelled", tenantAId);

    const cancelRecovery = await Recovery.findOne({
      tenantId: tenantAId,
      patientId: patientOverdue._id,
      type: "cancellation",
      sourceAppointmentId: cancelAppt._id,
    });
    if (!cancelRecovery) {
      throw new Error("TEST 18 FAILED: cancellation Recovery was NOT created during cooldown window!");
    }
    console.log("✅ TEST 18 PASSED: cancellation Recovery created correctly even during detection type cooldown.");

    // ================================================================
    // TESTS 19–22 — Regression gatekeeping (delegate to confirm passing)
    // ================================================================
    console.log("\n▶ TEST 19 — Phase 2.1 regression gate...");
    // Core state machine: invalid transition should throw
    const regRec = await recoveryService.createOpportunity(
      { patientId: patientA._id as any, type: "follow_up_required", priority: "low" },
      tenantAId
    );
    let reg19Passed = false;
    try {
      await recoveryService.markVisited(regRec._id.toString(), 0, tenantAId);
    } catch (err: any) {
      if (err.message.includes("Invalid recovery lifecycle transition")) reg19Passed = true;
    }
    if (!reg19Passed) throw new Error("TEST 19 FAILED: Phase 2.1 state machine regression detected!");
    console.log("✅ TEST 19 PASSED: Phase 2.1 state machine regression check OK.");

    console.log("\n▶ TEST 20 — Phase 3.1 regression gate...");
    // Cross-tenant task creation must still be rejected
    const reg20Recovery = await recoveryService.createOpportunity(
      { patientId: patientB._id as any, type: "inactive_patient", priority: "medium" },
      tenantBId
    );
    let reg20Passed = false;
    try {
      await followupService.createTask(
        { patientId: patientA._id as any, recoveryId: reg20Recovery._id as any, type: "inactive_reengagement" },
        tenantAId
      );
    } catch (err: any) {
      if (err.message.includes("Recovery opportunity not found or does not belong to authenticated tenant")) {
        reg20Passed = true;
      }
    }
    if (!reg20Passed) throw new Error("TEST 20 FAILED: Phase 3.1 cross-tenant task rejection regression detected!");
    console.log("✅ TEST 20 PASSED: Phase 3.1 cross-tenant task rejection regression check OK.");

    console.log("\n▶ TEST 21 — Phase 3.2 regression gate...");
    // A no_show event creates exactly 1 Recovery + 1 Task (idempotent)
    const reg21Appt = await Appointment.create({
      tenantId: tenantAId,
      patientId: patientA._id,
      doctorId: "doc_main",
      treatment: "Soin",
      date: "2026-09-05",
      startTime: "15:00",
      endTime: "15:30",
      status: "scheduled",
    });
    await appointmentService.updateStatus(reg21Appt._id.toString(), "no_show", tenantAId);
    await appointmentService.updateStatus(reg21Appt._id.toString(), "no_show", tenantAId); // idempotent
    const reg21Recoveries = await Recovery.find({ tenantId: tenantAId, sourceAppointmentId: reg21Appt._id });
    if (reg21Recoveries.length !== 1) {
      throw new Error(`TEST 21 FAILED: Expected 1 Recovery from no_show, got ${reg21Recoveries.length}`);
    }
    console.log("✅ TEST 21 PASSED: Phase 3.2 no_show idempotency regression check OK.");

    console.log("\n▶ TEST 22 — Phase 3.3 regression gate...");
    // Detection of an inactive patient: creates Recovery + Task
    const reg22Patient = await Patient.create({
      tenantId: tenantAId,
      firstName: "Reg",
      lastName: "Check",
      phone: "+21699000001",
    });
    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);
    await Appointment.create({
      tenantId: tenantAId,
      patientId: reg22Patient._id,
      doctorId: "doc_main",
      treatment: "Soin",
      date: sevenMonthsAgo.toISOString().split("T")[0] || "",
      startTime: "10:00",
      endTime: "10:30",
      status: "completed",
    });
    await recoveryService.detectRecoveryOpportunities(tenantAId);
    const reg22Recovery = await Recovery.findOne({ tenantId: tenantAId, patientId: reg22Patient._id });
    if (!reg22Recovery || reg22Recovery.type !== "inactive_patient") {
      throw new Error("TEST 22 FAILED: Phase 3.3 inactive_patient detection regression detected!");
    }
    console.log("✅ TEST 22 PASSED: Phase 3.3 inactive patient detection regression check OK.");

    console.log("\n🎉 ALL 22 PHASE 3.4 INTEGRATION TESTS PASSED SUCCESSFULLY!");
  } catch (error: any) {
    console.error("\n❌ PHASE 3.4 TEST SUITE FAILED:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runIntegrationTests();
