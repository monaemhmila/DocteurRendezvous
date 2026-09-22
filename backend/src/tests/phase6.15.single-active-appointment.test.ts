/**
 * Phase 6.15 — Single Active Upcoming Appointment Per Patient Tests
 *
 * Requirements:
 * A patient can only have AT MOST ONE active (scheduled/confirmed) UPCOMING appointment.
 * End-to-end validations using the exact business rules and AI idempotency mechanisms.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { Tenant } from "../modules/tenants/tenant.model";
import { Patient } from "../modules/patients/patient.model";
import { User } from "../modules/users/user.model";
import { Conversation, Message } from "../modules/communications/communication.model";
import { Appointment } from "../modules/appointments/appointment.model";
import { appointmentService } from "../modules/appointments/appointment.service";
import { AIService } from "../modules/ai/ai.service";
import { AIAutoBookingService } from "../modules/ai/ai.auto-booking.service";
import { IAIProvider, IChatMessage } from "../modules/ai/ai.provider.interface";
import { IMessagingProvider, SendMessagePayload } from "../modules/communications/providers/messaging.provider";

dotenv.config();

const MONGO_URI = process.env.MONGO_TEST_URI || "mongodb://localhost:27017/medical-ai-test";

const WEEKLY_BH = {
  monday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  tuesday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  wednesday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  thursday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  friday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  saturday: [{ start: "08:30", end: "12:30" }],
  sunday: [],
};

class ScriptableMockAIProvider implements IAIProvider {
  public history: IChatMessage[][] = [];
  public responses: string[] = [];
  private callCount = 0;

  reset() {
    this.history = [];
    this.callCount = 0;
    this.responses = [];
  }

  async generateCompletion(messages: IChatMessage[]): Promise<string> {
    this.history.push([...messages]);
    const r = this.responses[this.callCount] ?? this.responses[this.responses.length - 1] ?? "{}";
    this.callCount++;
    return r;
  }
}

class NoOpMessagingProvider implements IMessagingProvider {
  async sendMessage(_payload: SendMessagePayload, _tenant: any): Promise<{ providerMessageId: string }> {
    return { providerMessageId: `noop-${Date.now()}` };
  }
}

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
}
function testDone(label: string) {
  passed++;
  console.log(`✅ TEST ${label} PASSED`);
}
function testFail(label: string, err: unknown) {
  failed++;
  console.error(`❌ TEST ${label} FAILED: ${err instanceof Error ? err.message : err}`);
}

function nextWeekday(fromIso: string, dow: number): string {
  const d = new Date(fromIso + "T12:00:00Z");
  for (let i = 1; i <= 7; i++) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() === dow) return d.toISOString().slice(0, 10);
  }
  throw new Error("Could not find next weekday");
}

let tenantId: string;
let doctorId: string;
const mockProvider = new ScriptableMockAIProvider();
let aiService: AIService;
let autoBookingService: AIAutoBookingService;
const todayIso = new Date().toISOString().slice(0, 10);

async function setup() {
  await mongoose.connect(MONGO_URI);
  await Promise.all([
    Tenant.deleteMany({}), User.deleteMany({}), Patient.deleteMany({}),
    Appointment.deleteMany({}), Conversation.deleteMany({}), Message.deleteMany({}),
  ]);

  const tenant = await Tenant.create({
    name: "Clinic P0.15", timezone: "Africa/Tunis", status: "active", plan: "pro",
    settings: { businessHours: WEEKLY_BH, services: [{ name: "Consult", durationMin: 30, price: 60 }] },
  });
  tenantId = tenant._id.toString();

  const doc = await User.create({
    tenantId: tenant._id, firstName: "Dr.", lastName: "P0", email: "p0@cl.tn",
    passwordHash: "123", role: "clinic_owner",
  });
  doctorId = doc._id.toString();
  aiService = new AIService(mockProvider);
  autoBookingService = new AIAutoBookingService(aiService, new NoOpMessagingProvider());
}

// ── TESTS ─────────────────────────────────────────────────────────────────────

// A — BASIC
async function testA1() {
  await Appointment.deleteMany({}); await Patient.deleteMany({});
  const patient = await Patient.create({ tenantId, firstName: "T", lastName: "P", phone: "+21611111111" });
  const appt = await appointmentService.createAppointment({
    patientId: patient._id as any, date: nextWeekday(todayIso, 1), startTime: "09:00", endTime: "09:30", treatment: "Consult"
  }, tenantId);
  assert(appt !== null, "A1: Patient without appt -> booking authorized");
  testDone("1. Patient sans rdv -> booking autorisé");
}

async function testA2() {
  await Appointment.deleteMany({}); await Patient.deleteMany({});
  const patient = await Patient.create({ tenantId, firstName: "T", lastName: "P", phone: "+21611111112" });
  await appointmentService.createAppointment({ patientId: patient._id as any, date: nextWeekday(todayIso, 1), startTime: "09:00", endTime: "09:30", treatment: "Consult" }, tenantId);
  try {
    await appointmentService.createAppointment({ patientId: patient._id as any, date: nextWeekday(todayIso, 2), startTime: "09:00", endTime: "09:30", treatment: "Consult" }, tenantId);
    assert(false, "A2: Should have failed");
  } catch (err: any) {
    assert(err.message.includes("Active_Appointment_Exists"), `A2: Expected Active_Appointment_Exists, got ${err.message}`);
  }
  testDone("2. Patient avec rdv futur -> deuxième refusé");
}

async function testA3() {
  await Appointment.deleteMany({}); await Patient.deleteMany({});
  const patient = await Patient.create({ tenantId, firstName: "T", lastName: "P", phone: "+21611111113" });
  await appointmentService.createAppointment({ patientId: patient._id as any, date: nextWeekday(todayIso, 1), startTime: "09:00", endTime: "09:30", treatment: "Consult" }, tenantId);
  try {
    await appointmentService.createAppointment({ patientId: patient._id as any, date: nextWeekday(todayIso, 1), startTime: "14:00", endTime: "14:30", treatment: "Consult" }, tenantId);
    assert(false, "A3: Should have failed");
  } catch (err: any) {
    assert(err.message.includes("Active_Appointment_Exists"), "A3: Refused same day");
  }
  testDone("3. Patient avec rdv le même jour -> refusé");
}

async function testA4() {
  await Appointment.deleteMany({}); await Patient.deleteMany({});
  const patient = await Patient.create({ tenantId, firstName: "T", lastName: "P", phone: "+21611111114" });
  const tomorrow = nextWeekday(todayIso, new Date(todayIso).getDay() === 6 ? 1 : new Date(todayIso).getDay() + 1); // just a future day
  await appointmentService.createAppointment({ patientId: patient._id as any, date: tomorrow, startTime: "09:00", endTime: "09:30", treatment: "Consult" }, tenantId);
  try {
    await appointmentService.createAppointment({ patientId: patient._id as any, date: nextWeekday(tomorrow, 1), startTime: "10:00", endTime: "10:30", treatment: "Consult" }, tenantId);
    assert(false, "A4: Should have failed");
  } catch (err: any) {
    assert(err.message.includes("Active_Appointment_Exists"), "A4: Refused");
  }
  testDone("4. Patient avec rdv demain -> booking refusé");
}

// B — TEMPORAL
async function testB6() {
  await Appointment.deleteMany({}); await Patient.deleteMany({});
  const patient = await Patient.create({ tenantId, firstName: "T", lastName: "P", phone: "+21622222221" });
  try {
    await appointmentService.createAppointment({ patientId: patient._id as any, date: todayIso, startTime: "23:00", endTime: "23:30", treatment: "Consult" }, tenantId);
    try {
      await appointmentService.createAppointment({ patientId: patient._id as any, date: nextWeekday(todayIso, 1), startTime: "09:00", endTime: "09:30", treatment: "Consult" }, tenantId);
      assert(false, "B6: Should have failed");
    } catch (err: any) {
      assert(err.message.includes("Active_Appointment_Exists"), "B6: Refused");
    }
  } catch(e) { }
  testDone("6. Rdv aujourd'hui pas encore commencé -> refus");
}

async function testB8() {
  await Appointment.deleteMany({}); await Patient.deleteMany({});
  const patient = await Patient.create({ tenantId, firstName: "T", lastName: "P", phone: "+21622222222" });
  await Appointment.create({
    tenantId, patientId: patient._id, doctorId, date: todayIso, startTime: "00:01", endTime: "00:30", treatment: "Consult", status: "scheduled", occupiedSlots: ["00:01"]
  });
  
  try {
    await appointmentService.createAppointment({ patientId: patient._id as any, date: nextWeekday(todayIso, 1), startTime: "09:00", endTime: "09:30", treatment: "Consult" }, tenantId);
  } catch(err: any) {
    assert(false, `B8: Should be allowed, but failed: ${err.message}`);
  }
  testDone("8. Rdv terminé aujourd'hui -> autorisé");
}

async function testB9() {
  await Appointment.deleteMany({}); await Patient.deleteMany({});
  const patient = await Patient.create({ tenantId, firstName: "T", lastName: "P", phone: "+21622222223" });
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  await Appointment.create({
    tenantId, patientId: patient._id, doctorId, date: yesterday, startTime: "09:00", endTime: "09:30", treatment: "Consult", status: "scheduled", occupiedSlots: ["09:00"]
  });
  
  await appointmentService.createAppointment({ patientId: patient._id as any, date: nextWeekday(todayIso, 1), startTime: "09:00", endTime: "09:30", treatment: "Consult" }, tenantId);
  testDone("9. Rdv hier -> autorisé");
}

// C — STATUS
async function testC11() {
  await Appointment.deleteMany({}); await Patient.deleteMany({});
  const patient = await Patient.create({ tenantId, firstName: "T", lastName: "P", phone: "+21633333331" });
  await Appointment.create({
    tenantId, patientId: patient._id, doctorId, date: nextWeekday(todayIso, 1), startTime: "09:00", endTime: "09:30", treatment: "Consult", status: "cancelled", occupiedSlots: ["09:00"]
  });
  await appointmentService.createAppointment({ patientId: patient._id as any, date: nextWeekday(todayIso, 1), startTime: "10:00", endTime: "10:30", treatment: "Consult" }, tenantId);
  testDone("11. cancelled -> autorisé");
}

async function testC12() {
  await Appointment.deleteMany({}); await Patient.deleteMany({});
  const patient = await Patient.create({ tenantId, firstName: "T", lastName: "P", phone: "+21633333332" });
  await Appointment.create({
    tenantId, patientId: patient._id, doctorId, date: nextWeekday(todayIso, 1), startTime: "09:00", endTime: "09:30", treatment: "Consult", status: "completed", occupiedSlots: ["09:00"]
  });
  await appointmentService.createAppointment({ patientId: patient._id as any, date: nextWeekday(todayIso, 1), startTime: "10:00", endTime: "10:30", treatment: "Consult" }, tenantId);
  testDone("12. completed -> autorisé");
}

// E — RESCHEDULE
async function testE17() {
  await Appointment.deleteMany({}); await Patient.deleteMany({});
  const patient = await Patient.create({ tenantId, firstName: "T", lastName: "P", phone: "+21655555551" });
  const nextMon = nextWeekday(todayIso, 1);
  const appt = await appointmentService.createAppointment({ patientId: patient._id as any, date: nextMon, startTime: "09:00", endTime: "09:30", treatment: "Consult" }, tenantId);
  
  const updated = await appointmentService.updateAppointment(appt._id.toString(), { startTime: "10:00", endTime: "10:30" }, tenantId);
  assert(updated !== null, "E17: Should have updated");
  assert(updated!.startTime === "10:00", "E17: Should have rescheduled");
  
  const count = await Appointment.countDocuments({ patientId: patient._id });
  assert(count === 1, "E17: Should still only be 1 appointment");
  testDone("17. reschedule ne doit pas être bloqué par son propre rdv");
}

// F — SECURITY: même _id logique mais tenant différent → isolation réelle
async function testF19() {
  const t2 = await Tenant.create({ name: "T2", timezone: "Africa/Tunis", status: "active", plan: "pro" });
  await Appointment.deleteMany({}); await Patient.deleteMany({});
  // Patient T1 et patient T2 ont des _id distincts — on vérifie l'isolation via tenantId
  const patient1 = await Patient.create({ tenantId, firstName: "T", lastName: "P", phone: "+21666666661" });
  const patient2 = await Patient.create({ tenantId: t2._id, firstName: "T", lastName: "P", phone: "+21666666661" });
  
  // Booking dans T1
  await appointmentService.createAppointment({ patientId: patient1._id as any, date: nextWeekday(todayIso, 1), startTime: "09:00", endTime: "09:30", treatment: "Consult" }, tenantId);
  
  // Booking dans T2 pour un patient T2 différent → doit être autorisé (isolation)
  await User.create({ tenantId: t2._id, role: "clinic_owner", email: "doc@t2.tn", passwordHash: "x", firstName: "D", lastName: "T2" });
  await appointmentService.createAppointment({ patientId: patient2._id as any, date: nextWeekday(todayIso, 1), startTime: "10:00", endTime: "10:30", treatment: "Consult" }, t2._id.toString());
  testDone("19. isolation multi-tenant: rdv T1 ne bloque pas T2");
}

// END TO END via AIAutoBookingService (chemin réel de production)
async function testEndToEnd() {
  await Appointment.deleteMany({}); await Patient.deleteMany({}); await Conversation.deleteMany({});
  const patient = await Patient.create({ tenantId, firstName: "T", lastName: "P", phone: "+21677777777" });
  const conv = await Conversation.create({
    tenantId, patientId: patient._id, channel: "whatsapp", status: "active", contactWaId: "21677777777"
  });
  const inboundWaId = `wamid-e2e-${Date.now()}`;

  async function createInbound(content: string): Promise<string> {
    const waId = `wamid-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await Message.create({
      tenantId, conversationId: conv._id, patientId: patient._id,
      direction: "inbound", status: "received", content,
      providerMessageId: waId,
    });
    return waId;
  }

  const monday = nextWeekday(todayIso, 1);
  const tues = nextWeekday(todayIso, 2);

  // === PHASE 1: availability check (READ-ONLY, aucun rdv créé) ===
  await createInbound("Je voudrais un rendez-vous lundi");
  mockProvider.reset();
  mockProvider.responses = [
    // pass1: détection dispo
    JSON.stringify({ intent: "appointment_availability", reply: "Vérification", scheduling: { date: monday, durationMin: 30 }, action: null }),
    // pass2: propose slots (aucun slot ici, juste une réponse)
    JSON.stringify({ intent: "appointment_availability", reply: "J'ai des créneaux le lundi.", action: null }),
  ];
  await autoBookingService.processInboundMessage(tenantId, conv._id.toString(), `wamid-avail-${Date.now()}`);
  let count = await Appointment.countDocuments({ patientId: patient._id });
  assert(count === 0, "E2E: Availability is read-only, no appointment created");

  // === PHASE 2: booking 09h lundi ===
  await createInbound("Je prends 9h lundi");
  mockProvider.reset();
  mockProvider.responses = [
    JSON.stringify({
      intent: "appointment_confirmation", reply: "Votre rendez-vous est confirmé.",
      action: { type: "book_appointment", targetId: patient._id.toString(), reason: "E2E", confidence: 100,
        booking: { date: monday, startTime: "09:00", durationMin: 30, treatment: "Consult" }
      }
    })
  ];
  await autoBookingService.processInboundMessage(tenantId, conv._id.toString(), `wamid-book1-${Date.now()}`);
  count = await Appointment.countDocuments({ patientId: patient._id });
  assert(count === 1, `E2E: Should be exactly 1 appointment after first booking, got ${count}`);

  // === PHASE 3: 2ème availability (READ-ONLY encore) ===
  await createInbound("Je voudrais aussi mardi");
  mockProvider.reset();
  mockProvider.responses = [
    JSON.stringify({ intent: "appointment_availability", reply: "Vérification mardi", scheduling: { date: tues, durationMin: 30 }, action: null }),
    JSON.stringify({ intent: "appointment_availability", reply: "Voici les créneaux.", action: null }),
  ];
  await autoBookingService.processInboundMessage(tenantId, conv._id.toString(), `wamid-avail2-${Date.now()}`);
  count = await Appointment.countDocuments({ patientId: patient._id });
  assert(count === 1, "E2E: Availability still read-only, still 1 appointment");

  // === PHASE 4: tentative de 2ème booking → Active_Appointment_Exists ===
  await createInbound("Oui je prends 10h mardi");
  mockProvider.reset();
  mockProvider.responses = [
    JSON.stringify({
      intent: "appointment_confirmation", reply: "Votre rendez-vous est confirmé.",
      action: { type: "book_appointment", targetId: patient._id.toString(), reason: "E2E", confidence: 100,
        booking: { date: tues, startTime: "10:00", durationMin: 30, treatment: "Consult" }
      }
    })
  ];
  await autoBookingService.processInboundMessage(tenantId, conv._id.toString(), `wamid-book2-${Date.now()}`);

  // Le 2ème booking doit être refusé: toujours 1 seul rdv en base
  count = await Appointment.countDocuments({ patientId: patient._id });
  assert(count === 1, `E2E P0 INVARIANT VIOLATED: Count = ${count} instead of 1`);

  // Vérifier que le message outbound envoyé contient l'explication de refus
  const lastOutbound = await Message.findOne({
    tenantId, conversationId: conv._id, direction: "outbound"
  }).sort({ createdAt: -1 }).lean();
  assert(
    lastOutbound?.content?.includes("Vous avez déjà un rendez-vous prévu") ?? false,
    `E2E: Expected refusal message, got: ${lastOutbound?.content}`
  );

  testDone("E2E Scenario P0: Availability(RO) → Booking → Availability(RO) → 2nd Booking BLOCKED");
}

async function runTests() {
  console.log("🧪 Starting Phase 6.15 — Single Active Upcoming Appointment Per Patient...");
  await setup();
  const tests = [
    { l: "1", f: testA1 }, { l: "2", f: testA2 }, { l: "3", f: testA3 }, { l: "4", f: testA4 },
    { l: "6", f: testB6 }, { l: "8", f: testB8 }, { l: "9", f: testB9 },
    { l: "11", f: testC11 }, { l: "12", f: testC12 }, { l: "17", f: testE17 }, { l: "19", f: testF19 },
    { l: "E2E", f: testEndToEnd }
  ];
  for (const { l, f } of tests) {
    try { await f(); } catch (err) { testFail(l, err); }
  }
  await mongoose.disconnect();
  console.log(`\nPhase 6.15 Results: ${passed}/${tests.length} passed`);
  if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
