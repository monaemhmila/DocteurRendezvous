import mongoose from "mongoose";
import dotenv from "dotenv";
import { followupService, FOLLOWUP_CONFIG } from "../modules/followups/followup.service";
import { recoveryService } from "../modules/recovery/recovery.service";
import { Patient } from "../modules/patients/patient.model";
import { Recovery } from "../modules/recovery/recovery.model";
import { FollowUpTask, FollowUpAttempt } from "../modules/followups/followup.model";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/medical-ai-test";

async function runFollowUpTests() {
  console.log("🧪 Starting Phase 3.1 Hardened Follow-Up Engine Automated Tests...");

  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB for Phase 3.1 testing.");

    const tenantAId = new mongoose.Types.ObjectId().toString();
    const tenantBId = new mongoose.Types.ObjectId().toString();

    // Clean test collections
    await Patient.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
    await Recovery.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
    await FollowUpTask.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
    await FollowUpAttempt.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });

    // Setup Patients
    const patientA = await Patient.create({
      tenantId: tenantAId,
      firstName: "Alice",
      lastName: "Martin",
      phone: "+21698111222",
    });

    const patientB = await Patient.create({
      tenantId: tenantBId,
      firstName: "Bob",
      lastName: "Dylan",
      phone: "+21698333444",
    });

    // Setup Recovery under Tenant A
    const recoveryA = await recoveryService.createOpportunity(
      {
        patientId: patientA._id as any,
        type: "inactive_patient",
        priority: "medium",
      },
      tenantAId
    );

    // Setup Recovery under Tenant B
    const recoveryB = await recoveryService.createOpportunity(
      {
        patientId: patientB._id as any,
        type: "inactive_patient",
        priority: "high",
      },
      tenantBId
    );

    // -------------------------------------------------------------
    // TEST 1 — Cross-Tenant Task Creation Rejection
    // Tenant A attempts to create a task using Recovery B (Tenant B)
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 1 — Cross-Tenant Task Creation Rejection...");
    let test1Passed = false;
    try {
      await followupService.createTask(
        {
          patientId: patientA._id as any,
          recoveryId: recoveryB._id as any,
          type: "inactive_reengagement",
        },
        tenantAId
      );
    } catch (err: any) {
      if (err.message.includes("Recovery opportunity not found or does not belong to authenticated tenant")) {
        test1Passed = true;
      }
    }

    if (!test1Passed) {
      throw new Error("TEST 1 FAILED: Cross-tenant recovery reference in task was NOT rejected!");
    }
    console.log("✅ TEST 1 PASSED: Cross-tenant task creation correctly rejected.");

    // -------------------------------------------------------------
    // TEST 2 — Cross-Tenant Patient/Recovery Reference Mismatch
    // Tenant A provides patientB with recoveryA (Patient mismatch)
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 2 — Patient / Recovery Reference Mismatch...");
    let test2Passed = false;
    try {
      await followupService.createTask(
        {
          patientId: patientB._id as any,
          recoveryId: recoveryA._id as any,
          type: "inactive_reengagement",
        },
        tenantAId
      );
    } catch (err: any) {
      if (err.message.includes("Patient not found or does not belong to authenticated tenant")) {
        test2Passed = true;
      }
    }

    if (!test2Passed) {
      throw new Error("TEST 2 FAILED: Mismatched patient/recovery reference was NOT rejected!");
    }
    console.log("✅ TEST 2 PASSED: Mismatched patient/recovery reference correctly rejected.");

    // -------------------------------------------------------------
    // TEST 3 — Attempt Progression 0 -> 1 -> 2 -> 3
    // Create task for Recovery A, log 3 attempts step by step
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 3 — Attempt Count Progression (0 -> 1 -> 2 -> 3)...");
    const taskA = await followupService.createTask(
      {
        patientId: patientA._id as any,
        recoveryId: recoveryA._id as any,
        type: "inactive_reengagement",
        priority: "medium",
      },
      tenantAId
    );

    if (taskA.attemptCount !== 0 || taskA.status !== "pending") {
      throw new Error("TEST 3 FAILED: Initial task attemptCount expected 0 and status 'pending'");
    }

    // Attempt #1
    await followupService.logAttempt(
      {
        recoveryId: recoveryA._id.toString(),
        taskId: taskA._id.toString(),
        channel: "phone",
        outcome: "no_answer",
      },
      tenantAId
    );

    let taskCheck = await followupService.getTaskById(taskA._id.toString(), tenantAId);
    if (taskCheck?.attemptCount !== 1 || taskCheck?.status !== "in_progress") {
      throw new Error("TEST 3 FAILED: Expected attemptCount 1 and status 'in_progress'");
    }

    // Attempt #2
    await followupService.logAttempt(
      {
        recoveryId: recoveryA._id.toString(),
        taskId: taskA._id.toString(),
        channel: "phone",
        outcome: "left_voicemail",
      },
      tenantAId
    );

    taskCheck = await followupService.getTaskById(taskA._id.toString(), tenantAId);
    if (taskCheck?.attemptCount !== 2) {
      throw new Error("TEST 3 FAILED: Expected attemptCount 2");
    }
    console.log("✅ TEST 3 PASSED: Attempt count progression 0 -> 1 -> 2 verified.");

    // -------------------------------------------------------------
    // TEST 4 — Maximum-Attempt Behavior (Centralized Rule: 3)
    // Log Attempt #3 (outcome: no_answer) -> Recovery -> no_response, Task -> expired
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 4 — Maximum-Attempt Behavior (3 unanswered attempts)...");
    await recoveryService.markContacted(recoveryA._id.toString(), tenantAId);

    await followupService.logAttempt(
      {
        recoveryId: recoveryA._id.toString(),
        taskId: taskA._id.toString(),
        channel: "phone",
        outcome: "no_answer",
      },
      tenantAId
    );

    const finalRecoveryA = await Recovery.findById(recoveryA._id);
    const finalTaskA = await FollowUpTask.findById(taskA._id);

    if (finalRecoveryA?.status !== "no_response") {
      throw new Error(`TEST 4 FAILED: Expected recovery status 'no_response', got '${finalRecoveryA?.status}'`);
    }
    if (finalTaskA?.status !== "expired") {
      throw new Error(`TEST 4 FAILED: Expected task status 'expired', got '${finalTaskA?.status}'`);
    }
    console.log("✅ TEST 4 PASSED: Max attempts rule (3) enforced: Recovery set to no_response, task set to expired.");

    // -------------------------------------------------------------
    // TEST 5 — Correct TaskId / RecoveryId Association
    // Attempt to log an attempt providing taskId belonging to a different recovery
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 5 — TaskId / RecoveryId Association Validation...");
    const recoveryC = await recoveryService.createOpportunity(
      {
        patientId: patientA._id as any,
        type: "overdue_checkup",
        priority: "low",
      },
      tenantAId
    );

    const taskC = await followupService.createTask(
      {
        patientId: patientA._id as any,
        recoveryId: recoveryC._id as any,
        type: "checkup_reminder",
      },
      tenantAId
    );

    let test5Passed = false;
    try {
      await followupService.logAttempt(
        {
          recoveryId: recoveryA._id.toString(), // Mismatched recovery
          taskId: taskC._id.toString(),
          channel: "phone",
          outcome: "no_answer",
        },
        tenantAId
      );
    } catch (err: any) {
      if (err.message.includes("Task does not match specified recovery opportunity")) {
        test5Passed = true;
      }
    }

    if (!test5Passed) {
      throw new Error("TEST 5 FAILED: Mismatched taskId / recoveryId attempt was NOT rejected!");
    }
    console.log("✅ TEST 5 PASSED: Mismatched taskId / recoveryId association correctly rejected.");

    // -------------------------------------------------------------
    // TEST 6 — Task Completion
    // Complete taskC successfully
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 6 — Successful Task Completion...");
    const completedTask = await followupService.completeTask(taskC._id.toString(), tenantAId, "Patient contacté et rendez-vous fixé.");
    if (completedTask.status !== "completed" || !completedTask.completedAt) {
      throw new Error("TEST 6 FAILED: Task not marked completed or missing completedAt timestamp");
    }
    console.log("✅ TEST 6 PASSED: Task completed successfully with completion timestamp.");

    // -------------------------------------------------------------
    // TEST 7 — Invalid Task State Transition Rejection
    // Attempt to complete an already completed task
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 7 — Invalid Task State Transition Rejection...");
    let test7Passed = false;
    try {
      await followupService.completeTask(taskC._id.toString(), tenantAId, "Re-completing");
    } catch (err: any) {
      if (err.message.includes("Invalid task status transition")) {
        test7Passed = true;
      }
    }

    if (!test7Passed) {
      throw new Error("TEST 7 FAILED: Re-completing terminal task was NOT rejected!");
    }
    console.log("✅ TEST 7 PASSED: Invalid task state transition (completed -> completed) correctly rejected.");

    // -------------------------------------------------------------
    // TEST 8 — Tenant Isolation on Task Retrieval and Completion
    // Tenant B attempts to retrieve or complete Tenant A's task
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 8 — Tenant Isolation on Tasks...");
    const taskBCheck = await followupService.getTaskById(taskC._id.toString(), tenantBId);
    if (taskBCheck !== null) {
      throw new Error("TEST 8 FAILED: Tenant B was able to retrieve Tenant A's task!");
    }

    let test8Passed = false;
    try {
      await followupService.completeTask(taskC._id.toString(), tenantBId);
    } catch (err: any) {
      if (err.message.includes("FollowUpTask not found or does not belong to authenticated tenant")) {
        test8Passed = true;
      }
    }

    if (!test8Passed) {
      throw new Error("TEST 8 FAILED: Tenant B was able to complete Tenant A's task!");
    }
    console.log("✅ TEST 8 PASSED: Tenant isolation on task retrieval and completion strictly enforced.");

    // -------------------------------------------------------------
    // TEST 9 — Tenant Isolation on Attempt History Retrieval
    // Tenant B attempts to retrieve attempt history of Tenant A's recovery
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 9 — Tenant Isolation on Attempt History...");
    let test9Passed = false;
    try {
      await followupService.getAttemptsForRecovery(recoveryA._id.toString(), tenantBId);
    } catch (err: any) {
      if (err.message.includes("Recovery opportunity not found or does not belong to authenticated tenant")) {
        test9Passed = true;
      }
    }

    if (!test9Passed) {
      throw new Error("TEST 9 FAILED: Tenant B was able to retrieve Tenant A's attempt history!");
    }
    console.log("✅ TEST 9 PASSED: Tenant isolation on attempt history retrieval strictly enforced.");

    console.log("\n🎉 ALL 9 HARDENED PHASE 3.1 AUTOMATED TESTS PASSED SUCCESSFULLY!");
  } catch (error: any) {
    console.error("\n❌ PHASE 3.1 TEST SUITE FAILED:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runFollowUpTests();
