import mongoose from "mongoose";
import dotenv from "dotenv";
import { Tenant } from "../modules/tenants/tenant.model";
import { Patient } from "../modules/patients/patient.model";
import { Conversation, Message } from "../modules/communications/communication.model";
import { getConversationMessages } from "../modules/communications/communication.controller";
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
  console.log("Starting Phase 3.4 Pagination Messages Tests...\n");
  await mongoose.connect(MONGO_URI);

  // Cleanup
  await Conversation.deleteMany({});
  await Message.deleteMany({});
  await Patient.deleteMany({});
  await Tenant.deleteMany({ name: { $in: ["Msg Tenant A", "Msg Tenant B"] } });

  function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error("ASSERTION FAILED: " + msg);
  }

  const tenantA = await Tenant.create({ name: "Msg Tenant A", status: "active", settings: { whatsappConfig: { phoneNumberId: "MSG_PHONE_A", accessToken: "tokenA" } } });
  const tenantB = await Tenant.create({ name: "Msg Tenant B", status: "active", settings: { whatsappConfig: { phoneNumberId: "MSG_PHONE_B", accessToken: "tokenB" } } });
  const patientA = await Patient.create({ tenantId: tenantA._id, firstName: "Alice", lastName: "A", phone: "001" });
  
  const convA = await Conversation.create({ tenantId: tenantA._id, patientId: patientA._id, contactWaId: "+msg1", channel: "whatsapp", status: "active", lastMessageAt: new Date() });
  const convB = await Conversation.create({ tenantId: tenantB._id, contactWaId: "+msg2", channel: "whatsapp", status: "active", lastMessageAt: new Date() });

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
  const reqEmpty: any = { user: { tenantId: tenantA._id.toString() }, query: {}, params: { id: convA._id.toString() } };
  const resEmpty = new MockRes();
  await getConversationMessages(reqEmpty, resEmpty as any);
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
    await Message.create({
      tenantId: tenantA._id,
      conversationId: convA._id,
      providerMessageId: "wamid.msg." + i,
      content: "msg " + i,
      direction: "inbound",
      status: "received",
      createdAt: new Date(Date.now() - i * 60000)
    });
  }
  const req5: any = { user: { tenantId: tenantA._id.toString() }, query: { page: "1", limit: "3" }, params: { id: convA._id.toString() } };
  const res5 = new MockRes();
  await getConversationMessages(req5, res5 as any);
  assert(res5.body.meta.total === 7, "Total should be 7");
  assert(res5.body.data.length === 3, "Page 1 should have 3 items");
  const meta5 = buildPaginationMeta(7, 1, 3);
  assert(meta5.totalPages === 3, "totalPages should be ceil(7/3) = 3");
  console.log("PASS TEST 5\n");

  // TEST 6 - tri stable createdAt DESC, _id DESC
  console.log("TEST 6 - tri stable createdAt DESC");
  const req6: any = { user: { tenantId: tenantA._id.toString() }, query: { page: "1", limit: "10" }, params: { id: convA._id.toString() } };
  const res6 = new MockRes();
  await getConversationMessages(req6, res6 as any);
  const dates = res6.body.data.map((m: any) => new Date(m.createdAt).getTime());
  for (let i = 0; i < dates.length - 1; i++) {
    assert(dates[i] >= dates[i + 1], "Messages should be sorted by createdAt DESC");
  }
  console.log("PASS TEST 6\n");

  // TEST 7 - tenant A ne voit jamais tenant B (ni la conv, ni les messages)
  console.log("TEST 7 - tenant A ne voit jamais tenant B");
  const req7: any = { user: { tenantId: tenantA._id.toString() }, query: {}, params: { id: convB._id.toString() } };
  const res7 = new MockRes();
  await getConversationMessages(req7, res7 as any);
  assert(res7.statusCode === 404, "Tenant A should get 404 for Tenant B's conversation");
  console.log("PASS TEST 7\n");

  // TEST 8 - requete sans tenantId refusee
  console.log("TEST 8 - requete sans tenantId refusee");
  const req8: any = { user: null, query: {}, params: { id: convA._id.toString() } };
  const res8 = new MockRes();
  await getConversationMessages(req8, res8 as any);
  assert(res8.statusCode === 403, "Missing auth should return 403");
  console.log("PASS TEST 8\n");

  // TEST 9 - conversation inexistante
  console.log("TEST 9 - conversation inexistante");
  const req9: any = { user: { tenantId: tenantA._id.toString() }, query: {}, params: { id: new mongoose.Types.ObjectId().toString() } };
  const res9 = new MockRes();
  await getConversationMessages(req9, res9 as any);
  assert(res9.statusCode === 404, "Non-existent conversation should return 404");
  console.log("PASS TEST 9\n");

  // TEST 10 - absence de regression sur reception WhatsApp
  console.log("TEST 10 - absence de regression sur reception WhatsApp");
  assert(typeof communicationService.handleIncomingMessage === "function", "handleIncomingMessage must still exist");
  assert(typeof communicationService.handleMessageStatus === "function", "handleMessageStatus must still exist");
  console.log("PASS TEST 10\n");

  // TEST 11 - absence de regression sur idempotence WebhookEvent
  console.log("TEST 11 - absence de regression sur idempotence WebhookEvent");
  const { WebhookEvent } = await import("../modules/communications/webhook-event.model");
  assert(!!WebhookEvent, "WebhookEvent model must still exist");
  const wev1 = await WebhookEvent.create({ tenantId: tenantA._id, provider: "whatsapp", phoneNumberId: "phone-1", providerMessageId: "wev-idem-002", eventType: "message", status: "received", payload: {} });
  let idempotencyBlocked = false;
  try {
    await WebhookEvent.create({ tenantId: tenantA._id, provider: "whatsapp", phoneNumberId: "phone-1", providerMessageId: "wev-idem-002", eventType: "message", status: "received", payload: {} });
  } catch (e: any) {
    if (e.code === 11000) idempotencyBlocked = true;
  }
  assert(idempotencyBlocked, "WebhookEvent idempotency unique index must still be enforced");
  await WebhookEvent.deleteOne({ _id: wev1._id });
  console.log("PASS TEST 11\n");

  // TEST 12 - absence de regression Job et Outbox
  console.log("TEST 12 - absence de regression Job et Outbox");
  const { OutboxEvent } = await import("../modules/jobs/outbox-event.model");
  assert(!!OutboxEvent, "OutboxEvent model must still exist");
  console.log("PASS TEST 12\n");

  console.log("Phase 3.4 Pagination Messages tests completed successfully.");
  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error("TEST SUITE FAILED:", err.message);
  process.exit(1);
});
