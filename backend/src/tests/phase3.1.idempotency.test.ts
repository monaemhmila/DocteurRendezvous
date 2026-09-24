import mongoose from "mongoose";
import dotenv from "dotenv";
import { WebhookEvent } from "../modules/communications/webhook-event.model";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/medical-ai-test";

async function runIdempotencyTests() {
  console.log("🧪 Starting Phase 3.1 SaaS Idempotency Tests...\n");

  await mongoose.connect(MONGO_URI);
  await WebhookEvent.syncIndexes();
  await WebhookEvent.deleteMany({ provider: "whatsapp_test" });

  function assert(condition: boolean, msg: string) {
    if (!condition) {
      throw new Error(`❌ ASSERTION FAILED: ${msg}`);
    }
  }

  const tenantA = new mongoose.Types.ObjectId().toString();
  const tenantB = new mongoose.Types.ObjectId().toString();
  const phoneA = "PHONE_A";
  const phoneB = "PHONE_B";
  const provider = "whatsapp_test";

  console.log("▶ TEST 1 — Concurrent Idempotency (5 simultaneous requests)");
  const providerMessageId = `test_msg_${Date.now()}`;
  
  const promises = Array.from({ length: 5 }).map(async (_, index) => {
    try {
      const event = new WebhookEvent({
        provider,
        phoneNumberId: phoneA,
        eventType: "message",
        providerMessageId,
        tenantId: tenantA,
        payload: { text: "Hello", index },
      });
      await event.save();
      return { success: true, index };
    } catch (error: any) {
      if (error.code === 11000) {
        return { success: false, index, error: "duplicate" };
      }
      throw error;
    }
  });

  const results = await Promise.all(promises);
  const successful = results.filter(r => r.success);
  assert(successful.length === 1, `Expected exactly 1 successful insertion, got ${successful.length}`);
  console.log("✅ TEST 1 PASSED: 5 concurrent insertions resulted in exactly 1 document.");

  console.log("▶ TEST 2 — Isolation SaaS (tenant A vs tenant B)");
  const messageId2 = "isolated_msg_123";
  await new WebhookEvent({
    provider,
    phoneNumberId: phoneA,
    eventType: "message",
    providerMessageId: messageId2,
    tenantId: tenantA,
    payload: { text: "A" }
  }).save();

  await new WebhookEvent({
    provider,
    phoneNumberId: phoneB,
    eventType: "message",
    providerMessageId: messageId2,
    tenantId: tenantB,
    payload: { text: "B" }
  }).save();

  const evA = await WebhookEvent.countDocuments({ provider, phoneNumberId: phoneA, providerMessageId: messageId2 });
  const evB = await WebhookEvent.countDocuments({ provider, phoneNumberId: phoneB, providerMessageId: messageId2 });
  assert(evA === 1 && evB === 1, "Expected 1 event for each tenant/phone");
  console.log("✅ TEST 2 PASSED: même providerEventId sur deux numéros -> deux événements isolés.");

  await mongoose.disconnect();
  console.log("\n✅ Phase 3.1 Idempotency tests completed successfully.");
}

runIdempotencyTests().catch((err) => {
  console.error("Phase 3.1 Test Suite Error:", err);
  process.exit(1);
});
