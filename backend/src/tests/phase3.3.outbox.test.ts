import mongoose from "mongoose";
import dotenv from "dotenv";
import { Tenant } from "../modules/tenants/tenant.model";
import { OutboxEvent } from "../modules/jobs/outbox-event.model";
import { Appointment } from "../modules/appointments/appointment.model";
import { Patient } from "../modules/patients/patient.model";
import { appointmentService } from "../modules/appointments/appointment.service";
import { outboxWorkerService, OutboxWorkerService } from "../modules/jobs/outbox-worker.service";
import { MetaWhatsAppProvider } from "../modules/communications/providers/messaging.provider";

const messagingProvider = new MetaWhatsAppProvider();

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/medical-ai-test";

async function runTests() {
  console.log("🧪 Starting Phase 3.3 Outbox Pattern Tests...\n");

  await mongoose.connect(MONGO_URI);
  await OutboxEvent.deleteMany({});
  await Appointment.deleteMany({});
  await Patient.deleteMany({});
  await Tenant.deleteMany({ name: { $in: ["Tenant A", "Tenant B"] } });

  function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(`❌ ASSERTION FAILED: ${msg}`);
  }

  outboxWorkerService.setLeaseTime(2000);

  const tenantA = await Tenant.create({
    name: "Tenant A",
    status: "active",
    settings: { whatsappConfig: { phoneNumberId: "PHONE_A" } }
  });

  const tenantB = await Tenant.create({
    name: "Tenant B",
    status: "active",
    settings: { whatsappConfig: { phoneNumberId: "PHONE_B" } }
  });

  const patientA = await Patient.create({
    tenantId: tenantA._id,
    firstName: "Test",
    lastName: "Patient",
    phone: "12345678"
  });

  console.log("▶ TEST 1 — Mode synchrone conservé si ASYNC_WEBHOOK_PROCESSING=false");
  process.env.ASYNC_WEBHOOK_PROCESSING = "false";
  let appt1 = await Appointment.create({
    tenantId: tenantA._id,
    patientId: patientA._id,
    doctorId: new mongoose.Types.ObjectId().toString().toString(),
    treatment: "Consultation",
    date: "2030-01-01",
    startTime: "10:00",
    endTime: "10:30",
    status: "scheduled"
  });
  await appointmentService.updateStatus(appt1._id.toString(), "confirmed", tenantA._id.toString());
  const outboxCountSync = await OutboxEvent.countDocuments();
  assert(outboxCountSync === 0, "No OutboxEvent should be created in sync mode");
  console.log("✅ TEST 1 PASSED");

  console.log("▶ TEST 2 — appointment confirmé → 1 OutboxEvent transactionnel (ASYNC=true)");
  process.env.ASYNC_WEBHOOK_PROCESSING = "true";
  let appt2 = await Appointment.create({
    tenantId: tenantA._id,
    patientId: patientA._id,
    doctorId: new mongoose.Types.ObjectId().toString().toString(),
    treatment: "Consultation",
    date: "2030-01-02",
    startTime: "10:00",
    endTime: "10:30",
    status: "scheduled"
  });
  await appointmentService.updateStatus(appt2._id.toString(), "confirmed", tenantA._id.toString());
  const outboxCountAsync = await OutboxEvent.countDocuments({ aggregateId: appt2._id.toString() });
  assert(outboxCountAsync === 1, "1 OutboxEvent should be created");
  console.log("✅ TEST 2 PASSED");

  console.log("▶ TEST 3 — même événement répété → 1 seul OutboxEvent");
  try {
    await OutboxEvent.create({
      eventType: "appointment.confirmed",
      aggregateType: "appointment",
      aggregateId: appt2._id.toString(),
      tenantId: tenantA._id,
      phoneNumberId: "PHONE_A",
      idempotencyKey: `appointment:${appt2._id}:confirmed`,
      payload: {}
    });
    assert(false, "Should have thrown duplicate key error");
  } catch (err: any) {
    assert(err.code === 11000, "Should throw MongoDB 11000 duplicate key error");
  }
  console.log("✅ TEST 3 PASSED");

  console.log("▶ TEST 4 — deux workers → 1 seul envoi");
  const originalSend = MetaWhatsAppProvider.prototype.sendMessage;
  let sendCount = 0;
  MetaWhatsAppProvider.prototype.sendMessage = async () => {
    sendCount++;
    return { providerMessageId: "wamid_1" };
  };

  const worker2 = new OutboxWorkerService();
  worker2.setLeaseTime(2000);
  
  await Promise.all([outboxWorkerService.pollOnce(), worker2.pollOnce()]);
  assert(sendCount === 1, "Message should be sent exactly once by one worker");
  
  const sentEvent = await OutboxEvent.findOne({ aggregateId: appt2._id.toString() });
  assert(sentEvent?.status === "sent", "Event should be marked as sent");
  console.log("✅ TEST 4 PASSED");

  console.log("▶ TEST 5 — tenant A → aucun message envoyé avec le numéro du tenant B");
  let appt3 = await Appointment.create({
    tenantId: tenantA._id,
    patientId: patientA._id,
    doctorId: new mongoose.Types.ObjectId().toString().toString(),
    treatment: "Consultation",
    date: "2030-01-03",
    startTime: "10:00",
    endTime: "10:30",
    status: "scheduled"
  });
  
  // Create an event manually with the WRONG phoneNumberId for Tenant A
  const wrongEvent = await OutboxEvent.create({
    eventType: "appointment.confirmed",
    aggregateType: "appointment",
    aggregateId: appt3._id.toString(),
    tenantId: tenantA._id,
    phoneNumberId: "PHONE_B", // Tenant A has PHONE_A!
    idempotencyKey: `appointment:${appt3._id}:confirmed`,
    payload: {}
  });

  await outboxWorkerService.pollOnce();
  const failedWrongEvent = await OutboxEvent.findById(wrongEvent._id);
  assert(failedWrongEvent?.status === "retry", "Should fail and schedule retry");
  assert(!!failedWrongEvent?.lastError?.includes("mismatch"), "Should fail due to mismatch");
  console.log("✅ TEST 5 PASSED");

  console.log("▶ TEST 6 — erreur WhatsApp → retry & 5 erreurs → dead_letter");
  MetaWhatsAppProvider.prototype.sendMessage = async () => { throw new Error("WhatsApp Timeout"); };
  
  let appt4 = await Appointment.create({
    tenantId: tenantA._id,
    patientId: patientA._id,
    doctorId: new mongoose.Types.ObjectId().toString().toString(),
    treatment: "Consultation",
    date: "2030-01-04",
    startTime: "10:00",
    endTime: "10:30",
    status: "scheduled"
  });
  await appointmentService.updateStatus(appt4._id.toString(), "confirmed", tenantA._id.toString());
  
  let failEvent = await OutboxEvent.findOne({ aggregateId: appt4._id.toString() });
  for (let i = 0; i < 5; i++) {
    await OutboxEvent.updateOne({ _id: failEvent?._id }, { $set: { availableAt: new Date(Date.now() - 1000) } });
    await outboxWorkerService.pollOnce();
  }

  failEvent = await OutboxEvent.findById(failEvent?._id);
  assert(failEvent?.status === "dead_letter", "Event should be in dead_letter");
  console.log("✅ TEST 6 PASSED");

  console.log("▶ TEST 7 — crash après réservation → reprise après expiration de lease");
  let appt5 = await Appointment.create({
    tenantId: tenantA._id,
    patientId: patientA._id,
    doctorId: new mongoose.Types.ObjectId().toString().toString(),
    treatment: "Consultation",
    date: "2030-01-05",
    startTime: "10:00",
    endTime: "10:30",
    status: "scheduled"
  });
  await appointmentService.updateStatus(appt5._id.toString(), "confirmed", tenantA._id.toString());
  
  let crashEvent = await OutboxEvent.findOne({ aggregateId: appt5._id.toString() });
  await OutboxEvent.updateOne(
    { _id: crashEvent?._id },
    { $set: { status: "processing", lockedAt: new Date(Date.now() - 5000) } } // Expired 5s ago
  );

  MetaWhatsAppProvider.prototype.sendMessage = async () => { return { providerMessageId: "wamid_recovered" }; };
  await outboxWorkerService.pollOnce();
  
  crashEvent = await OutboxEvent.findById(crashEvent?._id);
  assert(crashEvent?.status === "sent", "Crashed event should be recovered and sent");
  console.log("✅ TEST 7 PASSED");

  MetaWhatsAppProvider.prototype.sendMessage = originalSend;
  await mongoose.disconnect();
  console.log("\n✅ Phase 3.3 Outbox tests completed successfully.");
}

runTests().catch(err => {
  console.error("Test Suite Error:", err);
  process.exit(1);
});
