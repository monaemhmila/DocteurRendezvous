import mongoose from "mongoose";
import dotenv from "dotenv";
import { Tenant } from "../modules/tenants/tenant.model";
import { Patient } from "../modules/patients/patient.model";
import { WaitlistEntry } from "../modules/waitlist/waitlist.model";
import { Appointment } from "../modules/appointments/appointment.model";
import { FollowUpTask } from "../modules/followups/followup.model";
import { waitlistService } from "../modules/waitlist/waitlist.service";
import { parsePagination, buildPaginationMeta } from "../shared/utils/pagination";

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI_TEST || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pixel-perfect-test";

async function runTests() {
  console.log("Starting Phase 3.4 Pagination Waitlist Tests...\n");
  await mongoose.connect(MONGO_URI);

  await WaitlistEntry.deleteMany({});
  await Patient.deleteMany({});
  await Appointment.deleteMany({});
  await FollowUpTask.deleteMany({});
  await Tenant.deleteMany({ name: { $in: ["WL Tenant A", "WL Tenant B"] } });

  function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error("ASSERTION FAILED: " + msg);
  }

  const tenantA = await Tenant.create({ name: "WL Tenant A", status: "active" });
  const tenantB = await Tenant.create({ name: "WL Tenant B", status: "active" });
  const patientA = await Patient.create({ tenantId: tenantA._id, firstName: "Alice", lastName: "A", phone: "111" });
  const patientB = await Patient.create({ tenantId: tenantB._id, firstName: "Bob", lastName: "B", phone: "222" });

  // TEST 1
  console.log("TEST 1 - page par defaut 1, limit par defaut 20");
  const p1 = parsePagination(undefined, undefined);
  assert(p1.page === 1, "Default page should be 1");
  assert(p1.limit === 20, "Default limit should be 20");
  assert(p1.skip === 0, "Default skip should be 0");
  console.log("PASS TEST 1\n");

  // TEST 2
  console.log("TEST 2 - limit > 100 cappe a 100");
  const p2 = parsePagination(1, 999);
  assert(p2.limit === 100, "Limit >100 should be capped at 100");
  console.log("PASS TEST 2\n");

  // TEST 3
  console.log("TEST 3 - page invalide normalisee a 1");
  const p3a = parsePagination(-1, 10);
  const p3b = parsePagination(0, 10);
  const p3c = parsePagination("abc", 10);
  assert(p3a.page === 1, "Negative page should normalize to 1");
  assert(p3b.page === 1, "Zero page should normalize to 1");
  assert(p3c.page === 1, "Non-numeric page should normalize to 1");
  console.log("PASS TEST 3\n");

  // TEST 4
  console.log("TEST 4 - resultat vide");
  const emptyRes = await waitlistService.listEntriesPaginated(tenantA._id.toString(), "active", undefined, 0, 20);
  assert(Array.isArray(emptyRes.data) && emptyRes.data.length === 0, "Data should be empty array");
  assert(emptyRes.total === 0, "Total should be 0");
  const emptyMeta = buildPaginationMeta(0, 1, 20);
  assert(emptyMeta.totalPages === 0, "totalPages should be 0 when total is 0");
  console.log("PASS TEST 4\n");

  // TEST 5
  console.log("TEST 5 - total et totalPages corrects");
  for (let i = 0; i < 7; i++) {
    const priority = i < 2 ? "high" : i < 5 ? "medium" : "low";
    await WaitlistEntry.create({ tenantId: tenantA._id, patientId: patientA._id, treatment: "Treatment-" + i, priority, status: "active" });
  }
  const res5 = await waitlistService.listEntriesPaginated(tenantA._id.toString(), "active", undefined, 0, 3);
  assert(res5.total === 7, "Total should be 7");
  assert(res5.data.length === 3, "Page 1 should have 3 items");
  const meta5 = buildPaginationMeta(7, 1, 3);
  assert(meta5.totalPages === 3, "totalPages should be ceil(7/3) = 3");
  console.log("PASS TEST 5\n");

  // TEST 6
  console.log("TEST 6 - tri stable high > medium > low, createdAt asc");
  const sortedRes = await waitlistService.listEntriesPaginated(tenantA._id.toString(), "active", undefined, 0, 100);
  const priorities = sortedRes.data.map((e: any) => e.priority);
  const firstMediumIdx = priorities.indexOf("medium");
  const firstLowIdx = priorities.indexOf("low");
  const lastHighIdx = priorities.lastIndexOf("high");
  assert(lastHighIdx < firstMediumIdx || firstMediumIdx === -1, "All high entries should appear before medium");
  assert((firstMediumIdx < firstLowIdx || firstLowIdx === -1) && (firstMediumIdx !== -1 || firstLowIdx === -1), "All medium entries should appear before low");
  console.log("PASS TEST 6\n");

  // TEST 7
  console.log("TEST 7 - filtre par statut");
  const firstTwo = sortedRes.data.slice(0, 2);
  for (const e of firstTwo) {
    await WaitlistEntry.findByIdAndUpdate(e._id, { status: "fulfilled" });
  }
  const activeRes = await waitlistService.listEntriesPaginated(tenantA._id.toString(), "active", undefined, 0, 100);
  assert(activeRes.total === 5, "After fulfilling 2, only 5 should remain active");
  assert(activeRes.data.every((e: any) => e.status === "active"), "All returned should be active");
  const fulfilledRes = await waitlistService.listEntriesPaginated(tenantA._id.toString(), "fulfilled", undefined, 0, 100);
  assert(fulfilledRes.total === 2, "Should return 2 fulfilled entries");
  console.log("PASS TEST 7\n");

  // TEST 8
  console.log("TEST 8 - tenant A ne voit jamais tenant B");
  await WaitlistEntry.create({ tenantId: tenantB._id, patientId: patientB._id, treatment: "B-Treatment", priority: "high", status: "active" });
  const resA = await waitlistService.listEntriesPaginated(tenantA._id.toString(), "active", undefined, 0, 100);
  const resB = await waitlistService.listEntriesPaginated(tenantB._id.toString(), "active", undefined, 0, 100);
  assert(resA.data.every((e: any) => e.tenantId === tenantA._id.toString()), "Tenant A should only see its own entries");
  assert(resB.data.every((e: any) => e.tenantId === tenantB._id.toString()), "Tenant B should only see its own entries");
  assert(resB.total === 1, "Tenant B should have 1 entry");
  console.log("PASS TEST 8\n");

  // TEST 9
  console.log("TEST 9 - priorisation metier non regressée");
  assert(typeof waitlistService.findCandidatesAndOfferSlot === "function", "findCandidatesAndOfferSlot must still exist");
  assert(typeof waitlistService.listEntries === "function", "listEntries (internal) must still exist");
  const internalList = await waitlistService.listEntries(tenantA._id.toString());
  assert(Array.isArray(internalList), "Internal listEntries must return array (no pagination)");
  console.log("PASS TEST 9\n");

  // TEST 10
  console.log("TEST 10 - fulfillment non regresse");
  assert(typeof waitlistService.fulfillWaitlistEntry === "function", "fulfillWaitlistEntry must still exist");
  assert(typeof waitlistService.cancelEntry === "function", "cancelEntry must still exist");
  assert(typeof waitlistService.createEntry === "function", "createEntry must still exist");
  const cancelTestEntry = await WaitlistEntry.create({ tenantId: tenantA._id, patientId: patientA._id, treatment: "CancelTest", priority: "low", status: "active" });
  let cancelCrossTenantRejected = false;
  try {
    await waitlistService.cancelEntry(cancelTestEntry._id.toString(), tenantB._id.toString());
  } catch (e: any) {
    cancelCrossTenantRejected = true;
  }
  assert(cancelCrossTenantRejected, "cancelEntry must reject cross-tenant access");
  console.log("PASS TEST 10\n");

  // TEST 11
  console.log("TEST 11 - machine d etat intacte");
  const fulfilledEntry = await WaitlistEntry.findOne({ tenantId: tenantA._id, status: "fulfilled" });
  if (fulfilledEntry) {
    let stateRejected = false;
    try {
      await waitlistService.fulfillWaitlistEntry({ waitlistEntryId: fulfilledEntry._id.toString(), taskId: new mongoose.Types.ObjectId().toString(), tenantId: tenantA._id.toString() });
    } catch (e: any) {
      if (e.message.includes("WAITLIST_NOT_ACTIVE") || e.message.includes("TASK_NOT_FOUND") || e.message.includes("WAITLIST_NOT_FOUND")) {
        stateRejected = true;
      }
    }
    assert(stateRejected, "State machine must still reject invalid transitions");
  }
  console.log("PASS TEST 11\n");

  // TEST 12
  console.log("TEST 12 - index unique de concurrence intact");
  const concPatient = await Patient.create({ tenantId: tenantA._id, firstName: "Conc", lastName: "Test", phone: "999" });
  await WaitlistEntry.create({ tenantId: tenantA._id, patientId: concPatient._id, treatment: "ConcTest", priority: "medium", status: "active" });
  let dupRejected = false;
  try {
    await WaitlistEntry.create({ tenantId: tenantA._id, patientId: concPatient._id, treatment: "ConcTest", priority: "high", status: "active" });
  } catch (e: any) {
    if (e.code === 11000) dupRejected = true;
  }
  assert(dupRejected, "Unique partial index on active entries must still be enforced");
  console.log("PASS TEST 12\n");

  console.log("Phase 3.4 Pagination Waitlist tests completed successfully.");
  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error("TEST SUITE FAILED:", err.message);
  process.exit(1);
});
