import mongoose from "mongoose";
import dotenv from "dotenv";
import { Tenant } from "../modules/tenants/tenant.model";
import { WebhookEvent } from "../modules/communications/webhook-event.model";
import { Job } from "../modules/jobs/job.model";
import { handleWebhookEvent } from "../modules/communications/webhook.controller";
import { workerService, WorkerService } from "../modules/jobs/worker.service";
import { Message, Conversation } from "../modules/communications/communication.model";
import { communicationService } from "../modules/communications/communication.service";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/medical-ai-test";
process.env.ASYNC_WEBHOOK_PROCESSING = "true"; // Enable async processing for this test

class MockResponse {
  statusCode: number = 200;
  headersSent: boolean = false;
  body: any = null;
  status(code: number) { this.statusCode = code; return this; }
  send(body: any) { this.body = body; this.headersSent = true; return this; }
  json(body: any) { this.body = body; this.headersSent = true; return this; }
}

async function runTests() {
  console.log("🧪 Starting Phase 3.2 Async Worker Tests...\n");

  await mongoose.connect(MONGO_URI);
  await WebhookEvent.deleteMany({});
  await Tenant.deleteMany({ "settings.whatsappConfig.phoneNumberId": { $exists: true } });
  await Message.deleteMany({});
  await Conversation.deleteMany({});
  await Job.deleteMany({});
  
  workerService.setLeaseTime(2000); // 2s lease time for tests

  function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(`❌ ASSERTION FAILED: ${msg}`);
  }

  const phoneValid = "PHONE_VALID";
  
  const tenantValid = await Tenant.create({
    name: "Valid Clinic Async",
    status: "active",
    settings: { whatsappConfig: { phoneNumberId: phoneValid } }
  });

  const buildReq = (msgId: string) => ({
    body: {
      object: "whatsapp_business_account",
      entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: phoneValid }, messages: [{ id: msgId, from: "123", type: "text", text: { body: "A" } }] } }] }]
    }
  } as any);

  console.log("▶ TEST 1 — 1 événement → 1 Job & Doublon → 0 Job supplémentaire");
  await handleWebhookEvent(buildReq("msg_async_1"), new MockResponse() as any);
  let jobs = await Job.countDocuments();
  assert(jobs === 1, "1 job should be created");

  await handleWebhookEvent(buildReq("msg_async_1"), new MockResponse() as any);
  jobs = await Job.countDocuments();
  assert(jobs === 1, "Duplicate should not create another job");
  console.log("✅ TEST 1 PASSED");

  console.log("▶ TEST 2 — 5 insertions concurrentes → 1 Job");
  const promises = Array.from({ length: 5 }).map(() => handleWebhookEvent(buildReq("msg_async_2"), new MockResponse() as any));
  await Promise.all(promises);
  jobs = await Job.countDocuments({ type: "webhook_event" });
  assert(jobs === 2, "Concurrent insertions should only add 1 new job (total 2)");
  console.log("✅ TEST 2 PASSED");

  console.log("▶ TEST 3 — 2 workers concurrents → 1 seul traitement");
  await Job.deleteMany({});
  await handleWebhookEvent(buildReq("msg_async_single"), new MockResponse() as any);

  const worker2 = new WorkerService();
  worker2.setLeaseTime(2000);
  
  // They both poll once concurrently
  const p1 = workerService.pollOnce();
  const p2 = worker2.pollOnce();
  const [res1, res2] = await Promise.all([p1, p2]);
  
  // Only one should have picked up the job
  assert((res1 && !res2) || (!res1 && res2), "Only one worker should pick up the job");
  const completedJobs = await Job.countDocuments({ status: "completed" });
  assert(completedJobs === 1, "1 job should be completed");
  console.log("✅ TEST 3 PASSED");

  console.log("▶ TEST 4 — Worker arrêté pendant traitement → reprise après expiration");
  await handleWebhookEvent(buildReq("msg_async_3"), new MockResponse() as any);
  
  // Force a job to processing and locked in the past
  const stuckJob = await Job.findOne({ status: "pending" });
  if (stuckJob) {
    stuckJob.status = "processing";
    stuckJob.lockedAt = new Date(Date.now() - 5000); // Expired lease
    await stuckJob.save();
  }

  // Poll again
  const pickedUp = await workerService.pollOnce();
  assert(pickedUp === true, "Worker should pick up the expired job");
  const completedStuckJob = await Job.findOne({ _id: stuckJob?._id });
  assert(completedStuckJob?.status === "completed", "Expired job should be recovered and completed");
  console.log("✅ TEST 4 PASSED");

  console.log("▶ TEST 5 — Erreur métier → retry et dead_letter");
  // Stub communicationService to throw error
  const originalHandleIncoming = communicationService.handleIncomingMessage;
  communicationService.handleIncomingMessage = async () => { throw new Error("Simulated Error"); };

  await handleWebhookEvent(buildReq("msg_async_fail"), new MockResponse() as any);
  let failJob = await Job.findOne({ status: "pending" });
  
  assert(failJob !== null, "Job should exist");
  
  // Exhaust retries
  for (let i = 0; i < 5; i++) {
    // Reset availableAt so it picks it up immediately
    await Job.updateOne({ _id: failJob?._id }, { $set: { availableAt: new Date(Date.now() - 1000) } });
    await workerService.pollOnce();
  }

  failJob = await Job.findOne({ _id: failJob?._id });
  assert(failJob?.status === "dead_letter", "Job should be in dead_letter after max attempts");
  
  communicationService.handleIncomingMessage = originalHandleIncoming;
  console.log("✅ TEST 5 PASSED");

  await mongoose.disconnect();
  console.log("\n✅ Phase 3.2 Async Worker tests completed successfully.");
}

runTests().catch(err => {
  console.error("Test Suite Error:", err);
  process.exit(1);
});
