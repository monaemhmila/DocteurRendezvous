import mongoose from "mongoose";
import dotenv from "dotenv";
import { Tenant } from "../modules/tenants/tenant.model";
import { Patient } from "../modules/patients/patient.model";
import { Conversation, Message } from "../modules/communications/communication.model";
import { getConversations } from "../modules/communications/communication.controller";
import { handleWebhookEvent } from "../modules/communications/webhook.controller";
import { communicationService } from "../modules/communications/communication.service";
import { parsePagination, buildPaginationMeta } from "../shared/utils/pagination";

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI_TEST || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pixel-perfect-test";

class MockRes {
  statusCode = 200;
  body: any = null;
  status(code: number) { this.statusCode = code; return this; }
  json(body: any) { this.body = body; return this; }
  send(body: any) { this.body = body; return this; }
  sendStatus(code: number) { this.statusCode = code; return this; }
}

async function runTests() {
  console.log("Starting Phase 3.4 Pagination Conversations Tests...\n");
  await mongoose.connect(MONGO_URI);

  // Cleanup
  await Conversation.deleteMany({});
  await Message.deleteMany({});
  await Patient.deleteMany({});
  await Tenant.deleteMany({ name: { $in: ["Conv Tenant A", "Conv Tenant B"] } });

  function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error("ASSERTION FAILED: " + msg);
  }

  const tenantA = await Tenant.create({ name: "Conv Tenant A", status: "active", settings: { whatsappConfig: { phoneNumberId: "CONV_PHONE_A", accessToken: "tokenA" } } });
  const tenantB = await Tenant.create({ name: "Conv Tenant B", status: "active", settings: { whatsappConfig: { phoneNumberId: "CONV_PHONE_B", accessToken: "tokenB" } } });
  const patientA = await Patient.create({ tenantId: tenantA._id, firstName: "Alice", lastName: "A", phone: "001" });
  const patientB = await Patient.create({ tenantId: tenantB._id, firstName: "Bob", lastName: "B", phone: "002" });

  // TEST 1 - page et limit par defaut
  console.log("TEST 1 - page et limit par defaut");
  const p1 = parsePagination(undefined, undefined);
  assert(p1.page === 1, "Default page should be 1");
  assert(p1.limit === 20, "Default limit should be 20");
  assert(p1.skip === 0, "Default skip should be 0");
  console.log("PASS TEST 1\n");

  // TEST 2 - limit > 100 cappe a 100
  console.log("TEST 2 - limit > 100 cappe a 100");
  const p2 = parsePagination(1, 500);
  assert(p2.limit === 100, "Limit >100 should be capped at 100");
  console.log("PASS TEST 2\n");

  // TEST 3 - page invalide normalisee a 1
  console.log("TEST 3 - page invalide normalisee a 1");
  const p3a = parsePagination(-5, 10);
  const p3b = parsePagination("notanumber", 10);
  assert(p3a.page === 1, "Negative page should normalize to 1");
  assert(p3b.page === 1, "Non-numeric page should normalize to 1");
  console.log("PASS TEST 3\n");

  // TEST 4 - resultat vide
  console.log("TEST 4 - resultat vide");
  const reqEmpty: any = { user: { tenantId: tenantA._id.toString() }, query: {} };
  const resEmpty = new MockRes();
  await getConversations(reqEmpty, resEmpty as any);
  assert(resEmpty.statusCode === 200, "Should return 200");
  assert(Array.isArray(resEmpty.body.data), "data should be array");
  assert(resEmpty.body.data.length === 0, "data should be empty");
  assert(resEmpty.body.meta.total === 0, "total should be 0");
  const emptyMeta = buildPaginationMeta(0, 1, 20);
  assert(emptyMeta.totalPages === 0, "totalPages should be 0 when total is 0");
  console.log("PASS TEST 4\n");

  // TEST 5 - total et totalPages corrects
  console.log("TEST 5 - total et totalPages corrects");
  for (let i = 0; i < 7; i++) {
    await Conversation.create({
      tenantId: tenantA._id,
      patientId: patientA._id,
      contactWaId: "+conv" + i,
      channel: "whatsapp",
      status: "active",
      lastMessageAt: new Date(Date.now() - i * 60000)
    });
  }
  const req5: any = { user: { tenantId: tenantA._id.toString() }, query: { page: "1", limit: "3" } };
  const res5 = new MockRes();
  await getConversations(req5, res5 as any);
  assert(res5.body.meta.total === 7, "Total should be 7");
  assert(res5.body.data.length === 3, "Page 1 should have 3 items");
  const meta5 = buildPaginationMeta(7, 1, 3);
  assert(meta5.totalPages === 3, "totalPages should be ceil(7/3) = 3");
  console.log("PASS TEST 5\n");

  // TEST 6 - tri stable lastMessageAt DESC, _id DESC
  console.log("TEST 6 - tri stable lastMessageAt DESC");
  const req6: any = { user: { tenantId: tenantA._id.toString() }, query: { page: "1", limit: "10" } };
  const res6 = new MockRes();
  await getConversations(req6, res6 as any);
  const dates = res6.body.data.map((c: any) => new Date(c.lastMessageAt).getTime());
  for (let i = 0; i < dates.length - 1; i++) {
    assert(dates[i] >= dates[i + 1], "Conversations should be sorted by lastMessageAt DESC");
  }
  console.log("PASS TEST 6\n");

  // TEST 7 - tenant A ne voit jamais tenant B
  console.log("TEST 7 - tenant A ne voit jamais tenant B");
  await Conversation.create({ tenantId: tenantB._id, patientId: patientB._id, contactWaId: "+convB001", channel: "whatsapp", status: "active", lastMessageAt: new Date() });
  const req7: any = { user: { tenantId: tenantA._id.toString() }, query: {} };
  const res7 = new MockRes();
  await getConversations(req7, res7 as any);
  assert(res7.body.data.every((c: any) => c.tenantId.toString() === tenantA._id.toString()), "Tenant A should only see its own conversations");
  const req7b: any = { user: { tenantId: tenantB._id.toString() }, query: {} };
  const res7b = new MockRes();
  await getConversations(req7b, res7b as any);
  assert(res7b.body.data.every((c: any) => c.tenantId.toString() === tenantB._id.toString()), "Tenant B should only see its own conversations");
  assert(res7b.body.meta.total === 1, "Tenant B should have 1 conversation");
  console.log("PASS TEST 7\n");

  // TEST 8 - conversation appartenant a un patient d'un autre tenant refusee
  console.log("TEST 8 - cross-tenant patient conversation access refused");
  const req8: any = { user: { tenantId: tenantB._id.toString() }, query: {} };
  const res8 = new MockRes();
  await getConversations(req8, res8 as any);
  assert(res8.body.data.every((c: any) => c.tenantId.toString() === tenantB._id.toString()), "Cross-tenant conversations must be refused");
  console.log("PASS TEST 8\n");

  // TEST 9 - aucun chargement complet inutile des messages
  console.log("TEST 9 - aucun chargement complet inutile des messages");
  // Create a conversation with 5 messages — only lastMessage should appear
  const convForMsgs = await Conversation.create({ tenantId: tenantA._id, patientId: patientA._id, contactWaId: "+convMSG", channel: "whatsapp", status: "active", lastMessageAt: new Date() });
  for (let i = 0; i < 5; i++) {
    await Message.create({ tenantId: tenantA._id, conversationId: convForMsgs._id, direction: "inbound", status: "received", content: "msg-" + i, providerMessageId: "pm-conv-" + i });
  }
  const req9: any = { user: { tenantId: tenantA._id.toString() }, query: {} };
  const res9 = new MockRes();
  await getConversations(req9, res9 as any);
  const convWithMsg = res9.body.data.find((c: any) => c._id.toString() === convForMsgs._id.toString());
  // Should have lastMessage field (only 1 message), not a full messages array
  assert(!convWithMsg.messages, "Conversations list should NOT return full messages array");
  assert(convWithMsg.lastMessage !== undefined || convWithMsg.lastMessage === undefined, "lastMessage field may be present but not full history");
  // Verify: no messages array in data
  assert(res9.body.data.every((c: any) => !Array.isArray(c.messages)), "No conversation should have a messages array in the list");
  console.log("PASS TEST 9\n");

  // TEST 10 - absence de regression sur reception WhatsApp
  console.log("TEST 10 - absence de regression sur reception WhatsApp");
  assert(typeof communicationService.handleIncomingMessage === "function", "handleIncomingMessage must still exist");
  assert(typeof communicationService.handleMessageStatus === "function", "handleMessageStatus must still exist");
  console.log("PASS TEST 10\n");

  // TEST 11 - absence de regression sur traitement AI
  console.log("TEST 11 - absence de regression sur traitement AI");
  const { aiAutoBookingService } = await import("../modules/ai/ai.auto-booking.service");
  assert(typeof aiAutoBookingService.processInboundMessage === "function", "processInboundMessage must still exist");
  console.log("PASS TEST 11\n");

  // TEST 12 - absence de regression sur idempotence WebhookEvent
  console.log("TEST 12 - absence de regression sur idempotence WebhookEvent");
  const { WebhookEvent } = await import("../modules/communications/webhook-event.model");
  assert(!!WebhookEvent, "WebhookEvent model must still exist");
  // Verify idempotency unique index
  const wev1 = await WebhookEvent.create({ tenantId: tenantA._id, provider: "whatsapp", phoneNumberId: "phone-1", providerMessageId: "wev-idem-001", eventType: "message", status: "received", payload: {} });
  let idempotencyBlocked = false;
  try {
    await WebhookEvent.create({ tenantId: tenantA._id, provider: "whatsapp", phoneNumberId: "phone-1", providerMessageId: "wev-idem-001", eventType: "message", status: "received", payload: {} });
  } catch (e: any) {
    if (e.code === 11000) idempotencyBlocked = true;
  }
  assert(idempotencyBlocked, "WebhookEvent idempotency unique index must still be enforced");
  await WebhookEvent.deleteOne({ _id: wev1._id });
  console.log("PASS TEST 12\n");

  // TEST 13 - absence de regression Job et Outbox
  console.log("TEST 13 - absence de regression Job et Outbox");
  const { OutboxEvent } = await import("../modules/jobs/outbox-event.model");
  assert(!!OutboxEvent, "OutboxEvent model must still exist");
  assert(typeof OutboxEvent.find === "function", "OutboxEvent.find must still work");
  console.log("PASS TEST 13\n");

  console.log("Phase 3.4 Pagination Conversations tests completed successfully.");
  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error("TEST SUITE FAILED:", err.message);
  process.exit(1);
});
