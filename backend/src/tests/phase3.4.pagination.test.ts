import mongoose from "mongoose";
import dotenv from "dotenv";
import { Tenant } from "../modules/tenants/tenant.model";
import { Patient } from "../modules/patients/patient.model";
import { patientService } from "../modules/patients/patient.service";
import { parsePagination } from "../shared/utils/pagination";

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/medical-ai-test";

async function runTests() {
  console.log("🧪 Starting Phase 3.4 Pagination Tests...\n");

  await mongoose.connect(MONGO_URI);
  await Patient.deleteMany({});
  await Tenant.deleteMany({ name: { $in: ["Tenant A", "Tenant B"] } });

  function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(`❌ ASSERTION FAILED: ${msg}`);
  }

  const tenantA = await Tenant.create({ name: "Tenant A", status: "active" });
  const tenantB = await Tenant.create({ name: "Tenant B", status: "active" });

  console.log("▶ TEST 1 — Parsing: page absente → page 1, limit absent → 20");
  const p1 = parsePagination(undefined, undefined);
  assert(p1.page === 1 && p1.limit === 20 && p1.skip === 0, "Default pagination should be page=1, limit=20");
  console.log("✅ TEST 1 PASSED");

  console.log("▶ TEST 2 — Parsing: limit > 100 → 100");
  const p2 = parsePagination(1, 500);
  assert(p2.limit === 100, "Limit should be capped at 100");
  console.log("✅ TEST 2 PASSED");

  console.log("▶ TEST 3 — Parsing: page négative → 1");
  const p3 = parsePagination(-5, 50);
  assert(p3.page === 1 && p3.limit === 50, "Negative page should be normalized to 1");
  console.log("✅ TEST 3 PASSED");

  console.log("▶ TEST 4 — Service: Résultat vide → data []");
  const emptyRes = await patientService.getPatients(tenantA._id.toString(), parsePagination(1, 20));
  assert(Array.isArray(emptyRes.data) && emptyRes.data.length === 0, "Data should be empty array");
  assert(emptyRes.meta.total === 0 && emptyRes.meta.totalPages === 0, "Meta total should be 0");
  console.log("✅ TEST 4 PASSED");

  console.log("▶ TEST 5 — Service: Tenant A ne voit jamais Tenant B (Isolation SaaS)");
  for (let i = 0; i < 5; i++) {
    await Patient.create({ tenantId: tenantA._id, firstName: `A${i}`, lastName: "Test", phone: `1111${i}` });
  }
  for (let i = 0; i < 3; i++) {
    await Patient.create({ tenantId: tenantB._id, firstName: `B${i}`, lastName: "Test", phone: `2222${i}` });
  }
  
  const resA = await patientService.getPatients(tenantA._id.toString(), parsePagination(1, 10));
  assert(resA.data.length === 5, "Tenant A should see exactly 5 patients");
  assert(resA.data.every((p: any) => p.tenantId.toString() === tenantA._id.toString()), "Tenant A should not see Tenant B's data");
  assert(resA.meta.total === 5, "Total should be 5 for A");

  const resB = await patientService.getPatients(tenantB._id.toString(), parsePagination(1, 10));
  assert(resB.data.length === 3, "Tenant B should see exactly 3 patients");
  console.log("✅ TEST 5 PASSED");

  console.log("▶ TEST 6 — Service: total et totalPages corrects avec pagination");
  const resPage1 = await patientService.getPatients(tenantA._id.toString(), parsePagination(1, 2));
  assert(resPage1.data.length === 2, "Page 1 should have 2 items");
  assert(resPage1.meta.total === 5, "Total items should be 5");
  assert(resPage1.meta.totalPages === 3, "Total pages should be 3 (5/2 rounded up)");
  
  const resPage3 = await patientService.getPatients(tenantA._id.toString(), parsePagination(3, 2));
  assert(resPage3.data.length === 1, "Page 3 should have 1 item");
  console.log("✅ TEST 6 PASSED");

  await mongoose.disconnect();
  console.log("\n✅ Phase 3.4 Pagination tests completed successfully.");
}

runTests().catch(err => {
  console.error("Test Suite Error:", err);
  process.exit(1);
});
