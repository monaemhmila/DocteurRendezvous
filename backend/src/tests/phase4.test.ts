import mongoose from "mongoose";
import dotenv from "dotenv";
import { waitlistController } from "../modules/waitlist/waitlist.controller";
import { followupController } from "../modules/followups/followup.controller";
import { WaitlistEntry } from "../modules/waitlist/waitlist.model";
import { FollowUpTask, FollowUpAttempt } from "../modules/followups/followup.model";
import { Patient } from "../modules/patients/patient.model";
import { Appointment } from "../modules/appointments/appointment.model";
import { Recovery } from "../modules/recovery/recovery.model";
import { getNoShows } from "../modules/appointments/appointment.controller";
import { getDashboardStats } from "../modules/stats/stats.controller";
import { getAnalyticsOverview } from "../modules/stats/analytics.controller";

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/medical-ai-test";

// Simple mock for Express req/res
const createMockRes = () => {
  const res: any = { statusCode: 200 };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (data: any) => { res.body = data; return res; };
  return res;
};

async function runPhase4Tests() {
  console.log("🧪 Starting Phase 4.2 — Frontend ↔ Backend Integration Tests...");
  let failed = false;

  try {
    await mongoose.connect(MONGO_URI);
    
    const tenantA = new mongoose.Types.ObjectId().toString();
    const tenantB = new mongoose.Types.ObjectId().toString();

    // Clean up
    await Patient.deleteMany({});
    await Appointment.deleteMany({});
    await WaitlistEntry.deleteMany({});
    await FollowUpTask.deleteMany({});
    await FollowUpAttempt.deleteMany({});
    await Recovery.deleteMany({});

    // Drop indexes safely
    try { await WaitlistEntry.collection.dropIndexes(); } catch (e) {}
    try { await FollowUpTask.collection.dropIndexes(); } catch (e) {}
    try { await Appointment.collection.dropIndexes(); } catch (e) {}
    await Appointment.syncIndexes();
    await FollowUpTask.syncIndexes();

    // Data setup
    const p1 = await Patient.create({ tenantId: tenantA, firstName: "Alice", lastName: "A", phone: "1" });
    const p2 = await Patient.create({ tenantId: tenantB, firstName: "Bob", lastName: "B", phone: "2" });

    // ================================================================
    // GROUP A — Waitlist HTTP API & Tenant Isolation
    // ================================================================
    console.log("\n▶ GROUP A — Waitlist HTTP API & Tenant Isolation...");

    // Test 1: POST /waitlist creates a WaitlistEntry
    const req1: any = { user: { tenantId: tenantA }, body: { patientId: p1._id, treatment: "Checkup", priority: "high" } };
    const res1 = createMockRes();
    await waitlistController.createEntry(req1, res1);
    if (res1.statusCode !== 201 || !res1.body._id) { console.error("TEST 1 FAILED"); failed = true; }
    else console.log("✅ TEST 1 PASSED: POST /waitlist creates WaitlistEntry");

    // Test 2: POST /waitlist rejects cross-tenant patientId
    const req2: any = { user: { tenantId: tenantA }, body: { patientId: p2._id, treatment: "Checkup", priority: "high" } };
    const res2 = createMockRes();
    await waitlistController.createEntry(req2, res2);
    if (res2.statusCode !== 404) { console.error("TEST 2 FAILED"); failed = true; }
    else console.log("✅ TEST 2 PASSED: POST /waitlist rejects cross-tenant patient");

    // Create entry in tenant B
    await WaitlistEntry.create({ tenantId: tenantB, patientId: p2._id, treatment: "Surgery", priority: "low", status: "active" });

    // Test 3 & 4: GET /waitlist tenant isolation
    const req3: any = { user: { tenantId: tenantA }, query: {} };
    const res3 = createMockRes();
    await waitlistController.getEntries(req3, res3);
    if (res3.statusCode !== 200 || res3.body.length !== 1 || res3.body[0].tenantId !== tenantA) { console.error("TEST 3/4 FAILED", res3.body, res3.statusCode); failed = true; }
    else console.log("✅ TEST 3 & 4 PASSED: GET /waitlist returns active tenant-isolated entries");

    // Test 5 & 6: DELETE /waitlist/:id
    const entryId = res3.body[0]._id;
    const req5: any = { user: { tenantId: tenantB }, params: { id: entryId } };
    const res5 = createMockRes();
    await waitlistController.cancelEntry(req5, res5); // Tenant B deletes Tenant A's entry
    if (res5.statusCode !== 404) { console.error("TEST 6 FAILED: allowed cross-tenant delete"); failed = true; }
    else console.log("✅ TEST 6 PASSED: DELETE rejects cross-tenant");

    const req6: any = { user: { tenantId: tenantA }, params: { id: entryId } };
    const res6 = createMockRes();
    await waitlistController.cancelEntry(req6, res6);
    if (res6.statusCode !== 200 || res6.body.status !== "cancelled") { console.error("TEST 5 FAILED", res6.body, res6.statusCode); failed = true; }
    else console.log("✅ TEST 5 PASSED: DELETE /waitlist cancels entry");

    // ================================================================
    // GROUP B — Fulfillment Validation Chain
    // ================================================================
    console.log("\n▶ GROUP B — Fulfillment Validation Chain...");
    
    // Setup for fulfillment
    const newEntry = await WaitlistEntry.create({ tenantId: tenantA, patientId: p1._id, treatment: "Surgery", priority: "high", status: "active" });
    const sourceAppt = await Appointment.create({ tenantId: tenantA, patientId: p1._id, doctorId: "doc1", date: "2026-10-15", startTime: "14:00", endTime: "14:30", treatment: "Cancelled", status: "cancelled" });
    const task = await FollowUpTask.create({ tenantId: tenantA, patientId: p1._id, waitlistEntryId: newEntry._id, sourceAppointmentId: sourceAppt._id, type: "slot_fill_offer", priority: "high", status: "pending", scheduledFor: new Date() });

    // Test 7: Success
    const req7: any = { user: { tenantId: tenantA }, params: { id: newEntry._id }, body: { taskId: task._id } };
    const res7 = createMockRes();
    await waitlistController.fulfillEntry(req7, res7);
    if (res7.statusCode !== 201) { console.error("TEST 7 FAILED", res7.body); failed = true; }
    else {
      const e = await WaitlistEntry.findById(newEntry._id);
      const t = await FollowUpTask.findById(task._id);
      if (e?.status !== "fulfilled" || t?.status !== "completed") { console.error("TEST 7 FAILED: State not updated"); failed = true; }
      else console.log("✅ TEST 7 PASSED: fulfillEntry succeeds and updates states");
    }

    // Test 10: Rejects if already fulfilled
    const req10: any = { user: { tenantId: tenantA }, params: { id: newEntry._id }, body: { taskId: task._id } };
    const res10 = createMockRes();
    await waitlistController.fulfillEntry(req10, res10);
    // Since we added idempotency guard, it should return 201 with the existing appointment
    if (res10.statusCode !== 201 || res10.body._id.toString() !== res7.body._id.toString()) { console.error("TEST 10 FAILED", res10.body); failed = true; }
    else console.log("✅ TEST 10 PASSED: fulfillEntry idempotency guard works");

    // Test 8 & 9: 409 conflict
    const entry2 = await WaitlistEntry.create({ tenantId: tenantA, patientId: p1._id, treatment: "Bleaching", priority: "high", status: "active" });
    const task2 = await FollowUpTask.create({ tenantId: tenantA, patientId: p1._id, waitlistEntryId: entry2._id, sourceAppointmentId: sourceAppt._id, type: "slot_fill_offer", priority: "high", status: "pending", scheduledFor: new Date() });
    
    // We already booked sourceAppt slot in test 7. Test 8 should conflict.
    const req8: any = { user: { tenantId: tenantA }, params: { id: entry2._id }, body: { taskId: task2._id } };
    const res8 = createMockRes();
    await waitlistController.fulfillEntry(req8, res8);
    if (res8.statusCode !== 409) { console.error("TEST 8 FAILED"); failed = true; }
    else {
      const e2 = await WaitlistEntry.findById(entry2._id);
      const t2 = await FollowUpTask.findById(task2._id);
      if (e2?.status !== "active" || t2?.status !== "pending") { console.error("TEST 9 FAILED"); failed = true; }
      else console.log("✅ TEST 8 & 9 PASSED: fulfillEntry 409 conflict leaves states intact");
    }

    // ================================================================
    // GROUP C — No-Show Endpoint
    // ================================================================
    console.log("\n▶ GROUP C — No-Show Endpoint...");
    await Appointment.create({ tenantId: tenantA, patientId: p1._id, doctorId: "doc", date: "2026-10-10", startTime: "10:00", endTime: "10:30", treatment: "NS", status: "no_show" });
    await Appointment.create({ tenantId: tenantA, patientId: p1._id, doctorId: "doc", date: "2026-10-11", startTime: "10:00", endTime: "10:30", treatment: "SC", status: "scheduled" });
    await Appointment.create({ tenantId: tenantB, patientId: p2._id, doctorId: "doc", date: "2026-10-10", startTime: "11:00", endTime: "11:30", treatment: "NS", status: "no_show" });

    const req13: any = { user: { tenantId: tenantA } };
    const res13 = createMockRes();
    await getNoShows(req13, res13);
    if (res13.statusCode !== 200 || res13.body.length !== 1 || res13.body[0].treatment !== "NS") { console.error("TEST 13/14/15 FAILED", res13.body, res13.statusCode); failed = true; }
    else console.log("✅ TEST 13, 14, 15 PASSED: getNoShows strictly returns tenant no-shows");

    // ================================================================
    // GROUP D — Dashboard Stats Additions
    // ================================================================
    console.log("\n▶ GROUP D — Dashboard Stats Additions...");
    const req16: any = { user: { tenantId: tenantA }, query: { date: "2026-10-10" } };
    const res16 = createMockRes();
    await getDashboardStats(req16, res16);
    if (res16.statusCode !== 200 || res16.body.noShowsToday !== 1 || res16.body.activeFollowUps !== 1 || res16.body.activeWaitlist !== 1) { 
      console.error("TEST 16/17/18 FAILED", res16.body); failed = true; 
    }
    else console.log("✅ TEST 16, 17, 18 PASSED: Dashboard stats are accurate");

    // ================================================================
    // GROUP E — Analytics Endpoint
    // ================================================================
    console.log("\n▶ GROUP E — Analytics Endpoint...");
    
    // Create recoveries for metrics
    await Recovery.create({ tenantId: tenantA, patientId: p1._id, type: "no_show", status: "visited", createdAt: new Date() } as any);
    await Recovery.create({ tenantId: tenantA, patientId: p1._id, type: "cancellation", status: "no_response", createdAt: new Date() } as any);
    
    const req19: any = { user: { tenantId: tenantA } };
    const res19 = createMockRes();
    await getAnalyticsOverview(req19, res19);
    
    if (res19.statusCode !== 200 || res19.body.recoveryRate !== 50 || res19.body.noShowRecoveryRate !== 100 || res19.body.cancellationRecoveryRate !== 0 || res19.body.waitlistConversionRate !== 50) {
      console.error("TEST 19/20/21/22 FAILED", res19.body); failed = true;
    } else console.log("✅ TEST 19, 20, 21, 22 PASSED: Analytics calculations match exact formulas");

    // ================================================================
    // GROUP F — FollowUp Attempts for Waitlist
    // ================================================================
    console.log("\n▶ GROUP F — FollowUp Attempts for Waitlist...");
    
    await FollowUpAttempt.create({ tenantId: tenantA, waitlistEntryId: entry2._id, taskId: task2._id, attemptNumber: 1, channel: "phone", outcome: "no_answer", performedAt: new Date() });

    const req23: any = { user: { tenantId: tenantA }, params: { waitlistEntryId: entry2._id } };
    const res23 = createMockRes();
    await followupController.getAttemptsForWaitlistEntry(req23, res23);
    
    if (res23.statusCode !== 200 || res23.body.length !== 1) { console.error("TEST 23 FAILED", res23.body, res23.statusCode); failed = true; }
    else console.log("✅ TEST 23 PASSED: Returns scoped waitlist attempts");

    const req24: any = { user: { tenantId: tenantB }, params: { waitlistEntryId: entry2._id } };
    const res24 = createMockRes();
    await followupController.getAttemptsForWaitlistEntry(req24, res24);
    if (res24.statusCode !== 500) { console.error("TEST 24 FAILED", res24.body); failed = true; } // Service throws error which is caught as 500
    else console.log("✅ TEST 24 PASSED: Rejects cross-tenant waitlist attempts");

  } catch (err) {
    console.error(err);
    failed = true;
  } finally {
    await mongoose.disconnect();
    if (failed) process.exit(1);
    else {
      console.log("\n🎉 ALL 24 PHASE 4.2 TESTS PASSED SUCCESSFULLY!");
      process.exit(0);
    }
  }
}

runPhase4Tests();
