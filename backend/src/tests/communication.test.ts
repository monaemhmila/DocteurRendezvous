import mongoose from "mongoose";
import dotenv from "dotenv";
import { Tenant } from "../modules/tenants/tenant.model";
import { Patient } from "../modules/patients/patient.model";
import { Conversation, Message } from "../modules/communications/communication.model";
import { verifyWebhook, handleWebhookEvent } from "../modules/communications/webhook.controller";
import { getConversations, getConversationMessages } from "../modules/communications/communication.controller";
import { communicationService } from "../modules/communications/communication.service";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/medical-ai-test";

// Simple mock for Express Response
class MockResponse {
  statusCode: number = 200;
  body: any = null;
  status(code: number) { this.statusCode = code; return this; }
  send(body: any) { this.body = body; return this; }
  json(body: any) { this.body = body; return this; }
  sendStatus(code: number) { this.statusCode = code; return this; }
}

async function runTests() {
  console.log("🧪 Starting Phase 6.1 Communication Foundation Tests...");
  
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB for testing.");

    const tenantAId = new mongoose.Types.ObjectId();
    const tenantBId = new mongoose.Types.ObjectId();


    // Clean test database collections
    // Clean ALL tenants that could match the test phoneNumberIds to prevent stale data cross-run
    await Tenant.deleteMany({ 
      $or: [
        { _id: { $in: [tenantAId, tenantBId] } },
        { "settings.whatsappConfig.phoneNumberId": { $in: ["12345", "67890"] } }
      ]
    });
    await Patient.deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
    // Clean conversations and messages with test phoneNumberIds (via all matching tenants)
    const testTenants = await Tenant.find({ "settings.whatsappConfig.phoneNumberId": { $in: ["12345", "67890"] } });
    const allTestTenantIds = [...testTenants.map(t => t._id), tenantAId, tenantBId];
    await Conversation.deleteMany({ tenantId: { $in: allTestTenantIds } });
    await Message.deleteMany({ tenantId: { $in: allTestTenantIds } });
    // Also clean by providerMessageId in case a previous run left orphaned records
    const testWamids = ["wamid.inbound.1", "wamid.outbound.1", "wamid.concurrent.1", "wamid.unknown.1"];
    await Message.deleteMany({ providerMessageId: { $in: testWamids } });
    await Conversation.deleteMany({ contactWaId: "+21699000111" });


    // Setup Test Data
    await Tenant.create([
      {
        _id: tenantAId,
        name: "Tenant A",
        settings: { whatsappConfig: { phoneNumberId: "12345", accessToken: "tokenA" } },
      },
      {
        _id: tenantBId,
        name: "Tenant B",
        settings: { whatsappConfig: { phoneNumberId: "67890", accessToken: "tokenB" } },
      }
    ]);

    const patientA = await Patient.create({
      tenantId: tenantAId,
      firstName: "John",
      lastName: "Doe",
      phone: "+21699000111",
      email: "john@example.com",
    });

    // -------------------------------------------------------------
    // TEST 1 — Webhook GET Meta verification
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 1 — Webhook GET Meta verification...");
    const req1 = { query: { "hub.mode": "subscribe", "hub.verify_token": process.env.META_WEBHOOK_VERIFY_TOKEN || "super_secret_verify_token", "hub.challenge": "1234" } };
    const res1 = new MockResponse();
    verifyWebhook(req1 as any, res1 as any);
    if (res1.statusCode !== 200 || res1.body !== "1234") throw new Error("TEST 1 FAILED");
    console.log("✅ TEST 1 PASSED: Webhook verification successful.");

    // -------------------------------------------------------------
    // TEST 2 & 4 — Webhook POST inbound message & tenant resolution
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 2 & 4 — Inbound message & tenant resolution...");
    const payloadInbound = {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          field: "messages",
          value: {
            metadata: { phone_number_id: "12345" }, // Maps to Tenant A
            messages: [{
              id: "wamid.inbound.1",
              from: "+21699000111", // Maps to Patient A
              type: "text",
              text: { body: "Hello doctor" }
            }]
          }
        }]
      }]
    };
    
    let webhookError: any = null;
    try {
      await communicationService.handleWebhook(payloadInbound);
    } catch (err) {
      webhookError = err;
      console.error('Webhook error:', err);
    }
    if (webhookError) throw new Error('Webhook threw an error: ' + webhookError.message);
    
    const conv1 = await Conversation.findOne({ tenantId: tenantAId, contactWaId: "+21699000111" });
    const msg1 = await Message.findOne({ providerMessageId: "wamid.inbound.1" });

    
    if (!conv1) throw new Error("Conversation not created");
    if (!msg1 || msg1.content !== "Hello doctor" || msg1.direction !== "inbound") throw new Error("Message not created correctly");
    if (conv1.patientId?.toString() !== patientA._id.toString()) throw new Error("Patient matching failed");
    console.log("✅ TEST 2 & 4 PASSED: Inbound message created, tenant resolved via phone_number_id, patient matched.");

    // -------------------------------------------------------------
    // TEST 3 — Webhook POST status event
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 3 — Webhook POST status event...");
    // First we inject an outbound message
    await Message.create({
      tenantId: tenantAId,
      conversationId: conv1._id,
      direction: "outbound",
      status: "sent",
      content: "Reminder",
      providerMessageId: "wamid.outbound.1"
    });

    const payloadStatus = {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          field: "messages",
          value: {
            metadata: { phone_number_id: "12345" },
            statuses: [{ id: "wamid.outbound.1", status: "read" }]
          }
        }]
      }]
    };
    await handleWebhookEvent({ body: payloadStatus } as any, new MockResponse() as any);
    
    const msgUpdate = await Message.findOne({ providerMessageId: "wamid.outbound.1" });
    if (msgUpdate?.status !== "read") throw new Error("Status update failed");
    console.log("✅ TEST 3 PASSED: Message status updated to 'read'.");

    // -------------------------------------------------------------
    // TEST 5 — Idempotence duplicate wamid
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 5 — Duplicate wamid (idempotence)...");
    await handleWebhookEvent({ body: payloadInbound } as any, new MockResponse() as any);
    const msgsCount = await Message.countDocuments({ providerMessageId: "wamid.inbound.1" });
    if (msgsCount !== 1) throw new Error("TEST 5 FAILED: Duplicate message created");
    console.log("✅ TEST 5 PASSED: Duplicate wamid was ignored cleanly.");

    // -------------------------------------------------------------
    // TEST 6 — Concurrent duplicate event MongoDB unique constraint
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 6 — Concurrent duplicate event MongoDB unique constraint...");
    try {
      await Promise.all([
        Message.create({ tenantId: tenantAId, conversationId: conv1._id, direction: "inbound", status: "received", content: "test", providerMessageId: "wamid.concurrent.1" }),
        Message.create({ tenantId: tenantAId, conversationId: conv1._id, direction: "inbound", status: "received", content: "test", providerMessageId: "wamid.concurrent.1" })
      ]);
      throw new Error("Should have thrown duplicate key error");
    } catch (err: any) {
      if (err.code !== 11000) throw new Error("Expected MongoDB duplicate key error (11000), got " + err.code);
    }
    console.log("✅ TEST 6 PASSED: MongoDB unique index prevents concurrent duplicates.");

    // -------------------------------------------------------------
    // TEST 7 & 8 — Cross-tenant conversation & message access
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 7 & 8 — Cross-tenant access check...");
    const reqAuthB = { user: { tenantId: tenantBId }, params: { id: conv1._id.toString() } };
    const resAuthB = new MockResponse();
    
    await getConversations(reqAuthB as any, resAuthB as any);
    if (resAuthB.body.length !== 0) throw new Error("Tenant B should not see Tenant A conversations");

    const resAuthB2 = new MockResponse();
    await getConversationMessages(reqAuthB as any, resAuthB2 as any);
    if (resAuthB2.statusCode !== 404) throw new Error("Tenant B should get 404 when requesting Tenant A's conversation");
    console.log("✅ TEST 7 & 8 PASSED: Cross-tenant access strictly blocked.");

    // -------------------------------------------------------------
    // TEST 9 — Absence of tenantId frontend
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 9 — Absence of tenantId frontend check...");
    const reqNoAuth = { user: null, params: { id: conv1._id.toString() } };
    const resNoAuth = new MockResponse();
    await getConversations(reqNoAuth as any, resNoAuth as any);
    if (resNoAuth.statusCode !== 403) throw new Error("Missing auth should return 403");
    console.log("✅ TEST 9 PASSED: Endpoints require req.user.tenantId from auth middleware.");

    // -------------------------------------------------------------
    // TEST 10 — accessToken jamais retourné
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 10 — accessToken never returned...");
    const reqAuthA = { user: { tenantId: tenantAId } };
    const resAuthA = new MockResponse();
    await getConversations(reqAuthA as any, resAuthA as any);
    const jsonStr = JSON.stringify(resAuthA.body);
    if (jsonStr.includes("tokenA")) throw new Error("Access token leaked!");
    console.log("✅ TEST 10 PASSED: accessToken is not exposed in the API.");

    // -------------------------------------------------------------
    // TEST 11 — Webhook without matching tenant
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 11 — Webhook without matching tenant...");
    const payloadNoTenant = {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          field: "messages",
          value: { metadata: { phone_number_id: "9999999999" }, messages: [{ id: "wamid.unknown.1" }] }
        }]
      }]
    };
    const resNoTenant = new MockResponse();
    await handleWebhookEvent({ body: payloadNoTenant } as any, resNoTenant as any);
    if (resNoTenant.statusCode !== 200) throw new Error("Should return 200 even if no tenant");
    const msgUnknown = await Message.findOne({ providerMessageId: "wamid.unknown.1" });
    if (msgUnknown) throw new Error("Message created for unknown tenant");
    console.log("✅ TEST 11 PASSED: Webhook safely ignores events for unknown tenants.");

    // -------------------------------------------------------------
    // TEST 12 — Invalid Meta payload
    // -------------------------------------------------------------
    console.log("\n▶ Running TEST 12 — Invalid Meta payload...");
    const payloadInvalid = { object: "page", entry: [] };
    await handleWebhookEvent({ body: payloadInvalid } as any, new MockResponse() as any);
    console.log("✅ TEST 12 PASSED: Ignored non-whatsapp payload safely.");

    // =============================================================
    // PHASE 6.4 — SEND MESSAGE TESTS
    // =============================================================

    console.log("\n▶ Running TEST 13 — Send without auth (Test A)");
    const { sendMessage } = require("../modules/communications/communication.controller");
    const reqSendNoAuth = { user: null, params: { id: conv1._id.toString() }, body: { content: "Test" } };
    const resSendNoAuth = new MockResponse();
    await sendMessage(reqSendNoAuth as any, resSendNoAuth as any);
    if (resSendNoAuth.statusCode !== 403) throw new Error("Missing auth should return 403");
    console.log("✅ TEST 13 PASSED: Send without auth correctly rejected.");

    console.log("\n▶ Running TEST 14 — Send with empty content (Test E)");
    const reqSendEmpty = { user: { tenantId: tenantAId }, params: { id: conv1._id.toString() }, body: { content: "   " } };
    const resSendEmpty = new MockResponse();
    await sendMessage(reqSendEmpty as any, resSendEmpty as any);
    if (resSendEmpty.statusCode !== 400) throw new Error("Empty content should return 400");
    console.log("✅ TEST 14 PASSED: Empty content correctly rejected.");

    console.log("\n▶ Running TEST 15 — Send cross-tenant (Test D)");
    const reqSendCross = { user: { tenantId: tenantBId }, params: { id: conv1._id.toString() }, body: { content: "Test" } };
    const resSendCross = new MockResponse();
    await sendMessage(reqSendCross as any, resSendCross as any);
    if (resSendCross.statusCode !== 404) throw new Error("Cross tenant send should return 404");
    console.log("✅ TEST 15 PASSED: Cross-tenant send securely blocked.");

    // Mock WhatsApp Provider
    const { MetaWhatsAppProvider } = require("../modules/communications/providers/messaging.provider");
    let providerFail = false;
    let providerCalledCount = 0;
    let lastProviderArgs: any = null;
    let mockWamid = "wamid.outbound.mocked." + Date.now();
    MetaWhatsAppProvider.prototype.sendMessage = async function(params: any, tenant: any) {
      providerCalledCount++;
      lastProviderArgs = { params, tenant };
      if (providerFail) {
        throw new Error("Simulated Provider Error");
      }
      return { providerMessageId: mockWamid };
    };

    console.log("\n▶ Running TEST 16 — Provider failure (Test C)");
    providerFail = true;
    const reqSendFail = { user: { tenantId: tenantAId }, params: { id: conv1._id.toString() }, body: { content: "Failed message" } };
    const resSendFail = new MockResponse();
    const countBeforeFail = await Message.countDocuments();
    await sendMessage(reqSendFail as any, resSendFail as any);
    if (resSendFail.statusCode !== 502) throw new Error("Should return 502 on provider failure");
    const countAfterFail = await Message.countDocuments();
    if (countBeforeFail !== countAfterFail) throw new Error("Message should NOT be saved in DB if provider fails");
    console.log("✅ TEST 16 PASSED: Provider failure correctly handled, DB not written.");

    console.log("\n▶ Running TEST 17 — Successful send (Test B & G)");
    providerFail = false;
    providerCalledCount = 0;
    const reqSendSuccess = { user: { tenantId: tenantAId }, params: { id: conv1._id.toString() }, body: { content: "Modified AI suggestion text" } };
    const resSendSuccess = new MockResponse();
    await sendMessage(reqSendSuccess as any, resSendSuccess as any);
    if (resSendSuccess.statusCode !== 200) throw new Error("Successful send should return 200");
    if (providerCalledCount !== 1) throw new Error("Provider should be called once");
    if (lastProviderArgs.params.content !== "Modified AI suggestion text") throw new Error("Provider received wrong content");
    
    const savedOutbound = await Message.findOne({ providerMessageId: mockWamid });
    if (!savedOutbound || savedOutbound.direction !== "outbound" || savedOutbound.content !== "Modified AI suggestion text") {
      throw new Error("Outbound message was not saved correctly");
    }
    console.log("✅ TEST 17 PASSED: Successful send calls provider and persists message.");

    console.log("\n🎉 ALL 17 COMMUNICATION TESTS PASSED SUCCESSFULLY!");
  } catch (error: any) {
    console.error("\n❌ TEST SUITE FAILED:", error.stack || error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
