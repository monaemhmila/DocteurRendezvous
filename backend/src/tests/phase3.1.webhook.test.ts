import mongoose from "mongoose";
import dotenv from "dotenv";
import { Tenant } from "../modules/tenants/tenant.model";
import { WebhookEvent } from "../modules/communications/webhook-event.model";
import { handleWebhookEvent } from "../modules/communications/webhook.controller";
import { Message, Conversation } from "../modules/communications/communication.model";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/medical-ai-test";

class MockResponse {
  statusCode: number = 200;
  headersSent: boolean = false;
  body: any = null;
  status(code: number) { this.statusCode = code; return this; }
  send(body: any) { this.body = body; this.headersSent = true; return this; }
  json(body: any) { this.body = body; this.headersSent = true; return this; }
}

async function runTests() {
  console.log("🧪 Starting Phase 3.1 Webhook Integration Tests...\n");

  await mongoose.connect(MONGO_URI);
  await WebhookEvent.deleteMany({});
  await Tenant.deleteMany({ "settings.whatsappConfig.phoneNumberId": { $exists: true } });
  await Message.deleteMany({});
  await Conversation.deleteMany({});

  function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(`❌ ASSERTION FAILED: ${msg}`);
  }

  const phoneValid = "PHONE_VALID";
  const phoneSuspended = "PHONE_SUSPENDED";
  
  const tenantValid = await Tenant.create({
    name: "Valid Clinic",
    status: "active",
    settings: { whatsappConfig: { phoneNumberId: phoneValid } }
  });

  const tenantSuspended = await Tenant.create({
    name: "Suspended Clinic",
    status: "suspended",
    settings: { whatsappConfig: { phoneNumberId: phoneSuspended } }
  });

  const buildReq = (payload: any) => ({
    body: payload,
    // Simulate WEBHOOK_ALLOW_UNSIGNED_DEV=true bypassing signature
  } as any);

  console.log("▶ TEST 1 — Numéro WhatsApp inconnu → aucun événement créé");
  const res1 = new MockResponse();
  await handleWebhookEvent(buildReq({
    object: "whatsapp_business_account",
    entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: "UNKNOWN" }, messages: [{ id: "msg_1" }] } }] }]
  }), res1 as any);
  const ev1 = await WebhookEvent.countDocuments();
  assert(ev1 === 0, "No event should be created for unknown phone");
  assert(res1.statusCode === 200, "Should return 200 OK");
  console.log("✅ TEST 1 PASSED");

  console.log("▶ TEST 2 — Tenant suspendu → aucun traitement");
  const res2 = new MockResponse();
  await handleWebhookEvent(buildReq({
    object: "whatsapp_business_account",
    entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: phoneSuspended }, messages: [{ id: "msg_2" }] } }] }]
  }), res2 as any);
  const ev2 = await WebhookEvent.countDocuments();
  assert(ev2 === 0, "No event should be created for suspended tenant");
  assert(res2.statusCode === 200, "Should return 200 OK");
  console.log("✅ TEST 2 PASSED");

  console.log("▶ TEST 3 — Payload avec plusieurs messages → chaque message dédupliqué séparément");
  const res3 = new MockResponse();
  await handleWebhookEvent(buildReq({
    object: "whatsapp_business_account",
    entry: [{ changes: [{ field: "messages", value: { 
      metadata: { phone_number_id: phoneValid }, 
      messages: [{ id: "msg_multi_1", from: "123", type: "text", text: { body: "A" } }, { id: "msg_multi_2", from: "123", type: "text", text: { body: "B" } }] 
    } }] }]
  }), res3 as any);
  const ev3 = await WebhookEvent.countDocuments();
  assert(ev3 === 2, "2 events should be created");
  const msgCount = await Message.countDocuments({ direction: "inbound" });
  assert(msgCount === 2, "2 business messages should be created");
  console.log("✅ TEST 3 PASSED");

  console.log("▶ TEST 4 — Statut WhatsApp et message avec le même ID → pas de collision grâce à eventType");
  const res4 = new MockResponse();
  const collisionId = "collision_id_1";
  await handleWebhookEvent(buildReq({
    object: "whatsapp_business_account",
    entry: [{ changes: [{ field: "messages", value: { 
      metadata: { phone_number_id: phoneValid }, 
      messages: [{ id: collisionId, from: "123", type: "text", text: { body: "X" } }],
      statuses: [{ id: collisionId, status: "delivered" }]
    } }] }]
  }), res4 as any);
  const ev4 = await WebhookEvent.countDocuments({ providerMessageId: collisionId });
  assert(ev4 === 2, "Both message and status events should be saved without collision");
  console.log("✅ TEST 4 PASSED");

  console.log("▶ TEST 5 — Doublon ignoré, traitement métier appelé 1 fois");
  const res5 = new MockResponse();
  const dupId = "dup_id_1";
  await handleWebhookEvent(buildReq({
    object: "whatsapp_business_account",
    entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: phoneValid }, messages: [{ id: dupId, from: "123", type: "text", text: { body: "D" } }] } }] }]
  }), res5 as any);
  
  await handleWebhookEvent(buildReq({
    object: "whatsapp_business_account",
    entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: phoneValid }, messages: [{ id: dupId, from: "123", type: "text", text: { body: "D" } }] } }] }]
  }), new MockResponse() as any);
  
  const ev5 = await WebhookEvent.countDocuments({ providerMessageId: dupId });
  const msgDupCount = await Message.countDocuments({ providerMessageId: dupId, direction: "inbound" });
  assert(ev5 === 1, "Only 1 WebhookEvent for duplicate");
  assert(msgDupCount === 1, "Only 1 business message created for duplicate");
  console.log("✅ TEST 5 PASSED");

  await mongoose.disconnect();
  console.log("\n✅ Phase 3.1 Webhook tests completed successfully.");
}

runTests().catch(err => {
  console.error("Test Suite Error:", err);
  process.exit(1);
});
