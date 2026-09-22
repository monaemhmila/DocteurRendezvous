/**
 * Phase 6.11 Ã¢â‚¬â€ Appointment State Integrity & Past-Date Rejection Tests
 *
 * Tests for:
 *   A. Confirmed appointment protection (no implicit mutation)
 *   B. Closed cabinet vs fully booked Ã¢â‚¬â€ backend Past_Date_Error is distinct
 *   C. Wrong appointment date claim Ã¢â‚¬â€ DB wins
 *   D. Explicit reschedule Ã¢â‚¬â€ no premature mutation
 *   E. Explicit change confirmation Ã¢â‚¬â€ update DB
 *   F. Availability question Ã¢â‚¬â€ NO appointment mutation
 *   G. Existing appointment + ambiguous request Ã¢â‚¬â€ no auto-booking
 *   H. Pending proposal not auto-confirmed
 *
 * PAST DATE BACKEND VALIDATION (P0):
 *   P1. createAppointment on past date ? Past_Date_Error
 *   P2. createAppointment today at past time ? Past_Date_Error
 *   P3. createAppointment today at future time ? no Past_Date_Error
 *   P4. updateAppointment to past date ? Past_Date_Error
 *   P5. Expired proposal slot ? NOT booked on confirmation
 *   P6. Confirmed appointment unchanged when patient mentions wrong date
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { Tenant } from "../modules/tenants/tenant.model";
import { Patient } from "../modules/patients/patient.model";
import { User } from "../modules/users/user.model";
import { Conversation, Message } from "../modules/communications/communication.model";
import { Appointment } from "../modules/appointments/appointment.model";
import { appointmentService } from "../modules/appointments/appointment.service";
import { AIAutoBookingService } from "../modules/ai/ai.auto-booking.service";
import { IAIProvider, IChatMessage } from "../modules/ai/ai.provider.interface";
import { IMessagingProvider } from "../modules/communications/providers/messaging.provider";

dotenv.config();

const MONGO_URI = process.env.MONGO_TEST_URI || "mongodb://localhost:27017/medical-ai-test";

// --- Future dates -------------------------------------------------------------
const FUTURE_DATE_1 = "2026-11-10";
const FUTURE_DATE_2 = "2026-11-11";

function getPastDate(): string {
  const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10);
}
function getTodayIso(): string { return new Date().toISOString().slice(0, 10); }
function getPastTimeToday(): string {
  const d = new Date(); d.setHours(d.getHours() - 1);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}
function getFutureTimeToday(): string {
  const d = new Date(); d.setHours(d.getHours() + 2);
  return `${d.getHours().toString().padStart(2, "0")}:00`;
}

// --- Helpers -----------------------------------------------------------------
let passed = 0;
function assert(cond: boolean, msg: string) { if (!cond) throw new Error(`ASSERT: ${msg}`); }
function testDone(label: string) { passed++; console.log(`\u2705 TEST ${label} PASSED`); }

const recordingProvider: IMessagingProvider & { calls: any[] } = {
  calls: [],
  sendMessage: async (params: any) => {
    recordingProvider.calls.push({ content: params.content });
    return { providerMessageId: `wa-611-${Date.now()}` };
  },
};

function makeScripted(scripts: any[]) {
  let i = 0;
  return { getSuggestion: async () => scripts[Math.min(i++, scripts.length - 1)] };
}
function baseReply(overrides: any = {}): any {
  return { suggestion: "RÃƒÂ©ponse.", intent: "general_question", needsHumanEscalation: false, structured: true,
    scheduling: { date: null, timePreference: null, durationMin: null }, action: null, ...overrides };
}

// --- Main ---------------------------------------------------------------------
async function runPhase611Tests() {
  console.log("\ud83e\uddea Starting Phase 6.11 \u2014 Appointment State Integrity & Past-Date Rejection Tests...\n");

  await mongoose.connect(MONGO_URI);

  const tenantId = new mongoose.Types.ObjectId();
  const tId = tenantId.toString();

  await User.deleteMany({});
  await Patient.deleteMany({});
  await Conversation.deleteMany({});
  await Message.deleteMany({});
  await Appointment.deleteMany({});
  await Tenant.deleteMany({ _id: tenantId });

  await Tenant.create({
    _id: tenantId, name: "Phase6.11 Clinic",
    settings: { whatsappConfig: { phoneNumberId: `pnid-611`, accessToken: "T611" },
      businessHours: { start: "09:00", end: "18:00" } },
  });

  const doc = await User.create({ tenantId: tId, email: `doc611_${Date.now()}@test.com`, passwordHash: "h",
    role: "clinic_owner", firstName: "Doc", lastName: "Test" });
  const patient = await Patient.create({ tenantId: tId, firstName: "Ali", lastName: "Ben Ali",
    phone: "21699000000", status: "active" });
  const pId = patient._id.toString();

  // -- A: Confirmed appointment protection --
  try {
    const appt = await Appointment.create({ tenantId: tId, patientId: patient._id, doctorId: doc._id,
      date: FUTURE_DATE_1, startTime: "09:00", endTime: "09:30", durationMin: 30,
      treatment: "Consultation", status: "confirmed", source: "manual" });
    const conv = await Conversation.create({ tenantId: tId, patientId: patient._id,
      contactWaId: "21699000001", channel: "whatsapp", status: "active", lastMessageAt: new Date() });
    await Message.create({ tenantId: tId, conversationId: conv._id, patientId: patient._id,
      direction: "inbound", content: "je veux aujourd'hui", status: "received",
      providerMessageId: `wamid-611-${Date.now()}-a-1` });
    const svc = new AIAutoBookingService(makeScripted([baseReply({ intent: "general_question", action: null })]) as any, recordingProvider);
    await svc.processInboundMessage(tId, conv._id.toString());
    const after = await Appointment.findById(appt._id);
    assert(after?.status === "confirmed", "A: status unchanged");
    assert(after?.date === FUTURE_DATE_1, "A: date unchanged");
    const all = await Appointment.find({ tenantId: tId });
    assert(all.length === 1, "A: no new appointment");
    await Appointment.deleteMany({ tenantId: tId });
    testDone("A");
  } catch (e) { console.error("? TEST A FAILED:", (e as any).message); throw e; }

  // -- B: Past_Date_Error ? Double_Booking_Error --
  try {
    let err = "";
    try {
      await appointmentService.createAppointment({ patientId: patient._id as any, doctorId: doc._id as any,
        date: getPastDate(), startTime: "09:00", endTime: "09:30", durationMin: 30,
        treatment: "Test", status: "scheduled", source: "ai" }, tId);
    } catch (e: any) { err = e.message; }
    assert(err.startsWith("Past_Date_Error"), `B: expected Past_Date_Error, got: ${err}`);
    assert(!err.includes("Double_Booking"), "B: not Double_Booking for past date");
    const all = await Appointment.find({ tenantId: tId });
    assert(all.length === 0, "B: no DB write");
    testDone("B");
  } catch (e) { console.error("? TEST B FAILED:", (e as any).message); throw e; }

  // -- C: DB wins over wrong patient claim --
  try {
    const appt = await Appointment.create({ tenantId: tId, patientId: patient._id, doctorId: doc._id,
      date: FUTURE_DATE_2, startTime: "10:00", endTime: "10:30", durationMin: 30,
      treatment: "DÃƒÂ©tartrage", status: "scheduled", source: "manual" });
    const conv = await Conversation.create({ tenantId: tId, patientId: patient._id,
      contactWaId: "21699000002", channel: "whatsapp", status: "active", lastMessageAt: new Date() });
    await Message.create({ tenantId: tId, conversationId: conv._id, patientId: patient._id,
      direction: "inbound", content: "Mon rendez-vous c'est aujourd'hui", status: "received",
      providerMessageId: `wamid-611-wamid-611-c-1` });
    const svc = new AIAutoBookingService(makeScripted([baseReply({ intent: "general_question", action: null })]) as any, recordingProvider);
    await svc.processInboundMessage(tId, conv._id.toString());
    const after = await Appointment.findById(appt._id);
    assert(after?.date === FUTURE_DATE_2, "C: date unchanged");
    assert(after?.status === "scheduled", "C: status unchanged");
    const all = await Appointment.find({ tenantId: tId });
    assert(all.length === 1, "C: no new appointment");
    await Appointment.deleteMany({ tenantId: tId });
    testDone("C");
  } catch (e) { console.error("? TEST C FAILED:", (e as any).message); throw e; }

  // -- D: Explicit reschedule Ã¢â‚¬â€ no premature mutation --
  try {
    const appt = await Appointment.create({ tenantId: tId, patientId: patient._id, doctorId: doc._id,
      date: FUTURE_DATE_1, startTime: "09:00", endTime: "09:30", durationMin: 30,
      treatment: "Consultation", status: "scheduled", source: "manual" });
    const conv = await Conversation.create({ tenantId: tId, patientId: patient._id,
      contactWaId: "21699000003", channel: "whatsapp", status: "active", lastMessageAt: new Date() });
    await Message.create({ tenantId: tId, conversationId: conv._id, patientId: patient._id,
      direction: "inbound", content: "je veux dÃƒÂ©placer mon rendez-vous ÃƒÂ  10h", status: "received",
      providerMessageId: `wamid-611-wamid-611-d-1` });
    // No action yet in AI response
    const svc = new AIAutoBookingService(makeScripted([baseReply({
      intent: "appointment_change_request", action: null
    })]) as any, recordingProvider);
    await svc.processInboundMessage(tId, conv._id.toString());
    const after = await Appointment.findById(appt._id);
    assert(after?.startTime === "09:00", "D: startTime unchanged before confirmation");
    assert(after?.date === FUTURE_DATE_1, "D: date unchanged before confirmation");
    await Appointment.deleteMany({ tenantId: tId });
    testDone("D");
  } catch (e) { console.error("? TEST D FAILED:", (e as any).message); throw e; }

  // -- E: Explicit change confirmation ? DB updated --
  try {
    const appt = await Appointment.create({ tenantId: tId, patientId: patient._id, doctorId: doc._id,
      date: FUTURE_DATE_1, startTime: "09:00", endTime: "09:30", durationMin: 30,
      treatment: "Consultation", status: "scheduled", source: "manual" });
    const conv = await Conversation.create({ tenantId: tId, patientId: patient._id,
      contactWaId: "21699000004", channel: "whatsapp", status: "active", lastMessageAt: new Date(),
      pendingBookingContext: { date: FUTURE_DATE_1, durationMin: 30,
        proposedSlots: [{ startTime: "10:00", endTime: "10:30" }], proposedAt: new Date() } });
    await Message.create({ tenantId: tId, conversationId: conv._id, patientId: patient._id,
      direction: "inbound", content: "Oui, dÃƒÂ©placez-le ÃƒÂ  10h", status: "received",
      providerMessageId: `wamid-611-wamid-611-e-1` });
    const svc = new AIAutoBookingService(makeScripted([baseReply({
      intent: "appointment_change_request",
      action: { type: "reschedule_appointment", targetId: appt._id.toString(),
        reason: "Patient confirmed new slot", confidence: 1.0,
        booking: { date: FUTURE_DATE_1, startTime: "10:00", durationMin: 30, treatment: "Consultation" } }
    })]) as any, recordingProvider);
    await svc.processInboundMessage(tId, conv._id.toString());
    const after = await Appointment.findById(appt._id);
    assert(after?.startTime === "10:00", `E: appointment rescheduled to 10:00, got ${after?.startTime}`);
    await Appointment.deleteMany({ tenantId: tId });
    testDone("E");
  } catch (e) { console.error("? TEST E FAILED:", (e as any).message); throw e; }

  // -- F: Availability question ? no mutation --
  try {
    const appt = await Appointment.create({ tenantId: tId, patientId: patient._id, doctorId: doc._id,
      date: FUTURE_DATE_1, startTime: "09:00", endTime: "09:30", durationMin: 30,
      treatment: "Consultation", status: "confirmed", source: "manual" });
    const conv = await Conversation.create({ tenantId: tId, patientId: patient._id,
      contactWaId: "21699000005", channel: "whatsapp", status: "active", lastMessageAt: new Date() });
    await Message.create({ tenantId: tId, conversationId: conv._id, patientId: patient._id,
      direction: "inbound", content: "10h est disponible ?", status: "received",
      providerMessageId: `wamid-611-wamid-611-f-1` });
    const svc = new AIAutoBookingService(makeScripted([baseReply({
      intent: "general_question", action: null
    })]) as any, recordingProvider);
    await svc.processInboundMessage(tId, conv._id.toString());
    const after = await Appointment.findById(appt._id);
    assert(after?.startTime === "09:00", "F: appointment not mutated from availability question");
    const all = await Appointment.find({ tenantId: tId });
    assert(all.length === 1, "F: no new appointment from availability question");
    await Appointment.deleteMany({ tenantId: tId });
    testDone("F");
  } catch (e) { console.error("? TEST F FAILED:", (e as any).message); throw e; }

  // -- G: Ambiguous request with existing appointment ? clarification, no booking --
  try {
    await Appointment.create({ tenantId: tId, patientId: patient._id, doctorId: doc._id,
      date: FUTURE_DATE_1, startTime: "09:00", endTime: "09:30", durationMin: 30,
      treatment: "Consultation", status: "confirmed", source: "manual" });
    const conv = await Conversation.create({ tenantId: tId, patientId: patient._id,
      contactWaId: "21699000006", channel: "whatsapp", status: "active", lastMessageAt: new Date() });
    await Message.create({ tenantId: tId, conversationId: conv._id, patientId: patient._id,
      direction: "inbound", content: "je voudrais savoir si c'est possible de faire mon rendez-vous le 11 novembre", status: "received",
      providerMessageId: `wamid-611-wamid-611-g-1` });
    const svc = new AIAutoBookingService(makeScripted([baseReply({
      intent: "general_question", action: null
    })]) as any, recordingProvider);
    await svc.processInboundMessage(tId, conv._id.toString());
    const all = await Appointment.find({ tenantId: tId });
    assert(all.length === 1, "G: no new appointment without explicit clarification");
    await Appointment.deleteMany({ tenantId: tId });
    testDone("G");
  } catch (e) { console.error("? TEST G FAILED:", (e as any).message); throw e; }

  // -- H: Pending proposal NOT auto-confirmed by unrelated message --
  try {
    const conv = await Conversation.create({ tenantId: tId, patientId: patient._id,
      contactWaId: "21699000007", channel: "whatsapp", status: "active", lastMessageAt: new Date(),
      pendingBookingContext: { date: FUTURE_DATE_2, durationMin: 30,
        proposedSlots: [{ startTime: "09:00", endTime: "09:30" }], proposedAt: new Date() } });
    await Message.create({ tenantId: tId, conversationId: conv._id, patientId: patient._id,
      direction: "inbound", content: "Merci bonne journÃƒÂ©e", status: "received",
      providerMessageId: `wamid-611-wamid-611-h-1` });
    const svc = new AIAutoBookingService(makeScripted([baseReply({ intent: "general_question", action: null })]) as any, recordingProvider);
    await svc.processInboundMessage(tId, conv._id.toString());
    const appts = await Appointment.find({ tenantId: tId });
    assert(appts.length === 0, "H: pending proposal must NOT auto-book from unrelated message");
    testDone("H");
  } catch (e) { console.error("? TEST H FAILED:", (e as any).message); throw e; }

  // -- P1: Past date ? rejected --
  try {
    let err = "";
    try {
      await appointmentService.createAppointment({ patientId: patient._id as any, doctorId: doc._id as any,
        date: getPastDate(), startTime: "09:00", endTime: "09:30", durationMin: 30,
        treatment: "Test", status: "scheduled", source: "ai" }, tId);
    } catch (e: any) { err = e.message; }
    assert(err.startsWith("Past_Date_Error"), `P1: got: ${err}`);
    assert((await Appointment.find({ tenantId: tId })).length === 0, "P1: no DB write");
    testDone("P1");
  } catch (e) { console.error("? TEST P1 FAILED:", (e as any).message); throw e; }

  // -- P2: Today at past time ? rejected --
  try {
    const pastTime = getPastTimeToday();
    let err = "";
    try {
      await appointmentService.createAppointment({ patientId: patient._id as any, doctorId: doc._id as any,
        date: getTodayIso(), startTime: pastTime, endTime: "23:59", durationMin: 30,
        treatment: "Test", status: "scheduled", source: "ai" }, tId);
    } catch (e: any) { err = e.message; }
    assert(err.startsWith("Past_Date_Error"), `P2: got: ${err}`);
    assert((await Appointment.find({ tenantId: tId })).length === 0, "P2: no DB write");
    testDone("P2");
  } catch (e) { console.error("? TEST P2 FAILED:", (e as any).message); throw e; }

  // -- P3: Today at future time ? no Past_Date_Error --
  try {
    const futureTime = getFutureTimeToday();
    const [fh] = futureTime.split(":").map(Number);
    const endH = Math.min(fh + 1, 23).toString().padStart(2, "0");
    let thrownMsg = "";
    try {
      await appointmentService.createAppointment({ patientId: patient._id as any, doctorId: doc._id as any,
        date: getTodayIso(), startTime: futureTime, endTime: `${endH}:00`, durationMin: 60,
        treatment: "Test", status: "scheduled", source: "ai" }, tId);
    } catch (e: any) { thrownMsg = e.message; }
    assert(!thrownMsg.startsWith("Past_Date_Error"), `P3: future time today should NOT produce Past_Date_Error, got: ${thrownMsg}`);
    await Appointment.deleteMany({ tenantId: tId });
    testDone("P3");
  } catch (e) { console.error("? TEST P3 FAILED:", (e as any).message); throw e; }

  // -- P4: Reschedule to past date ? rejected --
  try {
    const appt = await Appointment.create({ tenantId: tId, patientId: patient._id, doctorId: doc._id,
      date: FUTURE_DATE_1, startTime: "09:00", endTime: "09:30", durationMin: 30,
      treatment: "Consultation", status: "scheduled", source: "manual" });
    let err = "";
    try {
      await appointmentService.updateAppointment(appt._id.toString(),
        { date: getPastDate(), startTime: "09:00", endTime: "09:30" }, tId);
    } catch (e: any) { err = e.message; }
    assert(err.startsWith("Past_Date_Error"), `P4: got: ${err}`);
    const after = await Appointment.findById(appt._id);
    assert(after?.date === FUTURE_DATE_1, "P4: date unchanged after rejected reschedule");
    await Appointment.deleteMany({ tenantId: tId });
    testDone("P4");
  } catch (e) { console.error("? TEST P4 FAILED:", (e as any).message); throw e; }

  // -- P5: Expired proposal ? NOT booked --
  try {
    const pastTime = getPastTimeToday();
    const conv = await Conversation.create({ tenantId: tId, patientId: patient._id,
      contactWaId: "21699000008", channel: "whatsapp", status: "active", lastMessageAt: new Date(),
      pendingBookingContext: { date: getTodayIso(), durationMin: 30,
        proposedSlots: [{ startTime: pastTime, endTime: "23:59" }],
        proposedAt: new Date(Date.now() - 3600_000) } });
    await Message.create({ tenantId: tId, conversationId: conv._id, patientId: patient._id,
      direction: "inbound", content: "Oui je confirme", status: "received",
      providerMessageId: `wamid-611-${Date.now()}-p5-1` });
    recordingProvider.calls = [];
    const svc = new AIAutoBookingService(makeScripted([baseReply({
      intent: "appointment_confirmation",
      action: { type: "book_appointment", targetId: pId, reason: "confirmed", confidence: 1.0,
        booking: { date: getTodayIso(), startTime: pastTime, durationMin: 30, treatment: "Consultation" } }
    })]) as any, recordingProvider);
    await svc.processInboundMessage(tId, conv._id.toString());
    const appts = await Appointment.find({ tenantId: tId });
    assert(appts.length === 0, "P5: past slot NOT booked after proposal expiration");
    const confirmMsgs = recordingProvider.calls.filter(c => (c.content || "").includes("confirmÃƒÂ©"));
    assert(confirmMsgs.length === 0, "P5: no false WhatsApp confirmation");
    testDone("P5");
  } catch (e) { console.error("? TEST P5 FAILED:", (e as any).message); throw e; }

  // -- P6: Confirmed appointment unchanged even when patient claims wrong date --
  try {
    const appt = await Appointment.create({ tenantId: tId, patientId: patient._id, doctorId: doc._id,
      date: FUTURE_DATE_2, startTime: "10:00", endTime: "10:30", durationMin: 30,
      treatment: "Consultation", status: "confirmed", source: "manual" });
    const conv = await Conversation.create({ tenantId: tId, patientId: patient._id,
      contactWaId: "21699000009", channel: "whatsapp", status: "active", lastMessageAt: new Date() });
    await Message.create({ tenantId: tId, conversationId: conv._id, patientId: patient._id,
      direction: "inbound", content: "Non mon rendez-vous c'est aujourd'hui", status: "received",
      providerMessageId: `wamid-611-${Date.now()}-p6-1` });
    const svc = new AIAutoBookingService(makeScripted([baseReply({ intent: "general_question", action: null })]) as any, recordingProvider);
    await svc.processInboundMessage(tId, conv._id.toString());
    const after = await Appointment.findById(appt._id);
    assert(after?.date === FUTURE_DATE_2, "P6: date unchanged");
    assert(after?.status === "confirmed", "P6: status unchanged");
    assert(after?.startTime === "10:00", "P6: time unchanged");
    await Appointment.deleteMany({ tenantId: tId });
    testDone("P6");
  } catch (e) { console.error("? TEST P6 FAILED:", (e as any).message); throw e; }

  console.log(`\n${"-".repeat(55)}`);
  console.log(`\ud83c\udf89 ALL PHASE 6.11 TESTS PASSED \u2014 ${passed} tests`);
  console.log(`${"-".repeat(55)}\n`);

  await mongoose.disconnect();
}

runPhase611Tests().catch(e => { console.error(e); process.exit(1); });


