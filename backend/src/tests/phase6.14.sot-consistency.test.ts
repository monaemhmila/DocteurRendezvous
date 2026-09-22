/**
 * Phase 6.14 — Single Source of Truth (SOT) Consistency Tests
 *
 * Tests A through L + P0.13 covering:
 *
 *   A  findNextBookableDay(samedi) → lundi; getAvailableSlots(lundi) = OPEN_WITH_AVAILABILITY
 *   B  findNextBookableDay(dimanche) → lundi; getAvailableSlots(lundi) = OPEN_WITH_AVAILABILITY
 *   C  getAvailableSlots(dimanche) = CLOSED
 *   D  getAvailableSlots(lundi ouvert) = OPEN_WITH_AVAILABILITY, NEVER CLOSED
 *   E  Invariant strict: ∀ D retourné par findNextBookableDay() → getAvailableSlots(D) ≠ CLOSED
 *   F  Two-Pass OPEN lundi → [SYSTEM] ne contient jamais "FERMÉ"
 *   G  Two-Pass dimanche → [SYSTEM] contient "FERMÉ" + prochain jour
 *   H  CHECK_AVAILABILITY → PAS de demande de nom dans la réponse
 *   I  CHECK_AVAILABILITY → action: null
 *   J  BOOK_APPOINTMENT ("Je prends 10h") → action: book_appointment
 *   K  Décision CLOSED vient UNIQUEMENT de slotsResult.status
 *   L  Anti-cache-stale: deux appels successifs → même statut
 *   P0.13  Scénario exact du bug: findNextBookableDay() → D → getAvailableSlots(D) × 2 = OPEN_WITH_AVAILABILITY
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { Tenant } from "../modules/tenants/tenant.model";
import { Patient } from "../modules/patients/patient.model";
import { User } from "../modules/users/user.model";
import { Conversation, Message } from "../modules/communications/communication.model";
import { Appointment } from "../modules/appointments/appointment.model";
import { availabilityService } from "../modules/appointments/availability.service";
import { AIService } from "../modules/ai/ai.service";
import { IAIProvider, IChatMessage } from "../modules/ai/ai.provider.interface";

dotenv.config();

const MONGO_URI = process.env.MONGO_TEST_URI || "mongodb://localhost:27017/medical-ai-test";

// ── Fixture ──────────────────────────────────────────────────────────────────
const WEEKLY_BH = {
  monday:    [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  tuesday:   [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  wednesday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  thursday:  [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  friday:    [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  saturday:  [{ start: "08:30", end: "12:30" }],
  sunday:    [],
};

// ── Mock AI Provider ──────────────────────────────────────────────────────────
class ScriptableMockAIProvider implements IAIProvider {
  public history: IChatMessage[][] = [];
  public pass1Response: string = "";
  public pass2Response: string = "";
  private callCount = 0;

  reset() {
    this.history = [];
    this.callCount = 0;
  }

  async generateCompletion(messages: IChatMessage[]): Promise<string> {
    this.history.push([...messages]);
    this.callCount++;
    if (this.callCount === 1) return this.pass1Response;
    return this.pass2Response;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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

/** Return the next ISO date that falls on a given weekday (0=Sun…6=Sat), strictly AFTER fromIso. */
function nextWeekday(fromIso: string, dow: number): string {
  const d = new Date(fromIso + "T12:00:00Z");
  for (let i = 1; i <= 7; i++) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() === dow) return d.toISOString().slice(0, 10);
  }
  throw new Error("Could not find next weekday");
}

// ── Shared state ──────────────────────────────────────────────────────────────
let tenantId: string;
const mockProvider = new ScriptableMockAIProvider();
let aiService: AIService;

async function setup() {
  await mongoose.connect(MONGO_URI);
  await Promise.all([
    Tenant.deleteMany({}),
    User.deleteMany({}),
    Patient.deleteMany({}),
    Appointment.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
  ]);

  const tenant = await Tenant.create({
    name: "Cabinet SOT Phase 6.14",
    timezone: "Africa/Tunis",
    status: "active",
    plan: "pro",
    settings: {
      businessHours: WEEKLY_BH,
      services: [{ name: "Consultation dentaire", durationMin: 30, price: 60 }],
    },
  });
  tenantId = tenant._id.toString();

  await User.create({
    tenantId: tenant._id,
    firstName: "Dr. Sot",
    lastName: "TestUser",
    email: "sot@clinic6-14.tn",
    passwordHash: "hash614",
    role: "clinic_owner",
  });

  aiService = new AIService(mockProvider);
}

// ── TESTS ─────────────────────────────────────────────────────────────────────

async function testA() {
  const today = new Date().toISOString().slice(0, 10);
  const saturday = nextWeekday(today, 6);
  const expectedMonday = nextWeekday(saturday, 1);

  const nextDay = await availabilityService.findNextBookableDay({ tenantId, startDateIso: saturday, durationMin: 30 });
  assert(nextDay !== null, "A: findNextBookableDay(saturday) should return a day");
  assert(nextDay!.date === expectedMonday, `A: Expected ${expectedMonday}, got ${nextDay!.date}`);

  const slots = await availabilityService.getAvailableSlots({ tenantId, date: nextDay!.date, durationMin: 30 });
  assert(
    slots.status === "OPEN_WITH_AVAILABILITY",
    `A: getAvailableSlots(${nextDay!.date}) = ${slots.status}, expected OPEN_WITH_AVAILABILITY`
  );
  testDone("A — findNextBookableDay(samedi) → lundi → OPEN_WITH_AVAILABILITY");
}

async function testB() {
  const today = new Date().toISOString().slice(0, 10);
  const sunday = nextWeekday(today, 0);
  const expectedMonday = nextWeekday(sunday, 1);

  const nextDay = await availabilityService.findNextBookableDay({ tenantId, startDateIso: sunday, durationMin: 30 });
  assert(nextDay !== null, "B: findNextBookableDay(sunday) should return a day");
  assert(nextDay!.date === expectedMonday, `B: Expected ${expectedMonday}, got ${nextDay!.date}`);

  const slots = await availabilityService.getAvailableSlots({ tenantId, date: nextDay!.date, durationMin: 30 });
  assert(
    slots.status === "OPEN_WITH_AVAILABILITY",
    `B: getAvailableSlots(${nextDay!.date}) = ${slots.status}, expected OPEN_WITH_AVAILABILITY`
  );
  testDone("B — findNextBookableDay(dimanche) → lundi → OPEN_WITH_AVAILABILITY");
}

async function testC() {
  const today = new Date().toISOString().slice(0, 10);
  const sunday = nextWeekday(today, 0);
  const result = await availabilityService.getAvailableSlots({ tenantId, date: sunday, durationMin: 30 });
  assert(result.status === "CLOSED", `C: Sunday expected CLOSED, got ${result.status}`);
  testDone("C — getAvailableSlots(dimanche) = CLOSED");
}

async function testD() {
  const today = new Date().toISOString().slice(0, 10);
  const monday = nextWeekday(today, 1);
  const result = await availabilityService.getAvailableSlots({ tenantId, date: monday, durationMin: 30 });
  assert(result.status !== "CLOSED", `D: Monday must NOT be CLOSED, got ${result.status}`);
  assert(result.status === "OPEN_WITH_AVAILABILITY", `D: Monday expected OPEN_WITH_AVAILABILITY, got ${result.status}`);
  testDone("D — getAvailableSlots(lundi) = OPEN_WITH_AVAILABILITY, jamais CLOSED");
}

async function testE() {
  const today = new Date().toISOString().slice(0, 10);
  const starts = [
    nextWeekday(today, 0),  // Sunday
    nextWeekday(today, 6),  // Saturday
    nextWeekday(today, 3),  // Wednesday
  ];
  for (const start of starts) {
    const nextDay = await availabilityService.findNextBookableDay({ tenantId, startDateIso: start, durationMin: 30 });
    if (nextDay) {
      const check = await availabilityService.getAvailableSlots({ tenantId, date: nextDay.date, durationMin: 30 });
      assert(
        check.status !== "CLOSED",
        `E: Invariant violated — findNextBookableDay(${start}) → ${nextDay.date} but getAvailableSlots = ${check.status}`
      );
      assert(
        check.status === "OPEN_WITH_AVAILABILITY",
        `E: Expected OPEN_WITH_AVAILABILITY for ${nextDay.date}, got ${check.status}`
      );
    }
  }
  testDone("E — Invariant: ∀ D ∈ findNextBookableDay() ⟹ getAvailableSlots(D) = OPEN_WITH_AVAILABILITY");
}

async function testF() {
  const today = new Date().toISOString().slice(0, 10);
  const monday = nextWeekday(today, 1);
  const patient = await Patient.create({ tenantId, firstName: "Patient", lastName: "F", phone: "+21690000001", status: "lead" });
  const conv = await Conversation.create({ tenantId, patientId: patient._id, channel: "whatsapp", status: "active", contactWaId: "21690000001" });
  await Message.create({ tenantId, conversationId: conv._id, patientId: patient._id, direction: "inbound", status: "received", providerMessageId: "wamid_f_h", content: "Quels créneaux lundi ?" });

  mockProvider.reset();
  mockProvider.pass1Response = JSON.stringify({
    intent: "appointment_availability", scheduling: { date: monday, durationMin: 30 },
    reply: "Je vérifie.", needsHumanEscalation: false, action: null, patientInfo: { firstName: null, lastName: null },
  });
  mockProvider.pass2Response = JSON.stringify({
    intent: "appointment_availability", reply: "Créneaux dispo lundi.", needsHumanEscalation: false,
    action: null, patientInfo: { firstName: null, lastName: null },
  });

  await aiService.getSuggestion(tenantId, conv._id.toString());

  const pass2 = mockProvider.history[mockProvider.history.length - 1];
  const sysMsgs = pass2.filter((m) => m.role === "system");
  const sysMsg = sysMsgs[sysMsgs.length - 1].content;
  assert(!sysMsg.includes("FERMÉ"), `F: [SYSTEM] must NOT contain "FERMÉ" for open monday. Got: ${sysMsg.slice(0, 300)}`);

  await Conversation.deleteMany({ tenantId }); await Message.deleteMany({ tenantId }); await Patient.deleteMany({ tenantId });
  testDone("F — Two-Pass OPEN lundi → [SYSTEM] sans 'FERMÉ'");
}

async function testG() {
  const today = new Date().toISOString().slice(0, 10);
  const sunday = nextWeekday(today, 0);
  const patient = await Patient.create({ tenantId, firstName: "Patient", lastName: "G", phone: "+21690000002", status: "lead" });
  const conv = await Conversation.create({ tenantId, patientId: patient._id, channel: "whatsapp", status: "active", contactWaId: "21690000002" });
  await Message.create({ tenantId, conversationId: conv._id, patientId: patient._id, direction: "inbound", status: "received", providerMessageId: "wamid_g", content: "Rdv dimanche ?" });

  mockProvider.reset();
  mockProvider.pass1Response = JSON.stringify({
    intent: "appointment_availability", scheduling: { date: sunday, durationMin: 30 },
    reply: "Je vérifie.", needsHumanEscalation: false, action: null, patientInfo: { firstName: null, lastName: null },
  });
  mockProvider.pass2Response = JSON.stringify({
    intent: "appointment_availability", reply: "Le cabinet est fermé dimanche.", needsHumanEscalation: false,
    action: null, patientInfo: { firstName: null, lastName: null },
  });

  await aiService.getSuggestion(tenantId, conv._id.toString());

  const pass2 = mockProvider.history[mockProvider.history.length - 1];
  const sysMsg = pass2.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  assert(sysMsg.includes("FERMÉ"), `G: [SYSTEM] should contain "FERMÉ" for sunday. Got: ${sysMsg.slice(0, 300)}`);
  assert(
    sysMsg.includes("prochain jour") || sysMsg.includes("lundi") || sysMsg.includes("Monday"),
    `G: [SYSTEM] should mention next open day. Got: ${sysMsg.slice(0, 300)}`
  );

  await Conversation.deleteMany({ tenantId }); await Message.deleteMany({ tenantId }); await Patient.deleteMany({ tenantId });
  testDone("G — Two-Pass dimanche → [SYSTEM] contient 'FERMÉ' + prochain jour");
}

async function testH() {
  const today = new Date().toISOString().slice(0, 10);
  const monday = nextWeekday(today, 1);
  const patient = await Patient.create({ tenantId, firstName: "Patient", lastName: "Whatsapp", phone: "+21690000003", status: "lead" });
  const conv = await Conversation.create({ tenantId, patientId: patient._id, channel: "whatsapp", status: "active", contactWaId: "21690000003" });
  await Message.create({ tenantId, conversationId: conv._id, patientId: patient._id, direction: "inbound", status: "received", providerMessageId: "wamid_f_h", content: "Quels créneaux lundi ?" });

  mockProvider.reset();
  mockProvider.pass1Response = JSON.stringify({
    intent: "appointment_availability", scheduling: { date: monday, durationMin: 30 },
    reply: "Je vérifie.", needsHumanEscalation: false, action: null, patientInfo: { firstName: null, lastName: null },
  });
  // Pass 2 must NOT ask for name — this simulates a correctly prompted LLM
  mockProvider.pass2Response = JSON.stringify({
    intent: "appointment_availability",
    reply: "Voici les créneaux disponibles pour lundi : 08h30, 09h00, 09h30. Quel horaire vous conviendrait ?",
    needsHumanEscalation: false, action: null, patientInfo: { firstName: null, lastName: null },
  });

  const result = await aiService.getSuggestion(tenantId, conv._id.toString());
  const reply = result.suggestion.toLowerCase();
  const asksForName = reply.includes("nom et prénom") || reply.includes("nom et prenom") ||
    reply.includes("votre nom") || reply.includes("prénom") || reply.includes("prenom");

  assert(!asksForName, `H: CHECK_AVAILABILITY reply must NOT ask for name. Got: "${result.suggestion.slice(0, 200)}"`);

  await Conversation.deleteMany({ tenantId }); await Message.deleteMany({ tenantId }); await Patient.deleteMany({ tenantId });
  testDone("H — CHECK_AVAILABILITY → PAS de demande de nom");
}

async function testI() {
  const today = new Date().toISOString().slice(0, 10);
  const monday = nextWeekday(today, 1);
  const patient = await Patient.create({ tenantId, firstName: "Patient", lastName: "Whatsapp", phone: "+21690000004", status: "lead" });
  const conv = await Conversation.create({ tenantId, patientId: patient._id, channel: "whatsapp", status: "active", contactWaId: "21690000004" });
  await Message.create({ tenantId, conversationId: conv._id, patientId: patient._id, direction: "inbound", status: "received", providerMessageId: "wamid_i", content: "10h est dispo lundi ?" });

  mockProvider.reset();
  mockProvider.pass1Response = JSON.stringify({
    intent: "appointment_availability", scheduling: { date: monday, durationMin: 30, timePreference: "10:00" },
    reply: "Je vérifie 10h.", needsHumanEscalation: false, action: null, patientInfo: { firstName: null, lastName: null },
  });
  mockProvider.pass2Response = JSON.stringify({
    intent: "appointment_availability",
    reply: "Oui, 10h est disponible lundi.",
    needsHumanEscalation: false, action: null, patientInfo: { firstName: null, lastName: null },
  });

  const result = await aiService.getSuggestion(tenantId, conv._id.toString());
  assert(result.action === null, `I: CHECK_AVAILABILITY action must be null. Got: ${JSON.stringify(result.action)}`);

  await Conversation.deleteMany({ tenantId }); await Message.deleteMany({ tenantId }); await Patient.deleteMany({ tenantId });
  testDone("I — CHECK_AVAILABILITY → action: null");
}

async function testJ() {
  const today = new Date().toISOString().slice(0, 10);
  const bookingDate = nextWeekday(today, 1);
  const patient = await Patient.create({ tenantId, firstName: "Patient", lastName: "Whatsapp", phone: "+21690000005", status: "lead" });
  const patientId = patient._id.toString();
  const conv = await Conversation.create({
    tenantId, patientId: patient._id, channel: "whatsapp", status: "active", contactWaId: "21690000005",
    pendingBookingContext: { date: bookingDate, proposedSlots: [{ startTime: "10:00", endTime: "10:30" }] },
  });
  await Message.create({ tenantId, conversationId: conv._id, patientId: patient._id, direction: "inbound", status: "received", providerMessageId: "wamid_j", content: "Je prends 10h." });

  mockProvider.reset();
  // No scheduling.date → no Two-Pass triggered; direct confirmation
  mockProvider.pass1Response = JSON.stringify({
    intent: "appointment_confirmation", scheduling: { date: null, durationMin: null },
    reply: "Parfait ! Pourriez-vous me préciser votre Nom et Prénom ?",
    needsHumanEscalation: false,
    action: { type: "book_appointment", targetId: patientId, reason: "Patient confirmed 10h", confidence: 1.0,
      booking: { date: bookingDate, startTime: "10:00", durationMin: 30, treatment: "Consultation dentaire" } },
    patientInfo: { firstName: null, lastName: null },
  });

  const result = await aiService.getSuggestion(tenantId, conv._id.toString());
  assert(result.action !== null, "J: BOOK_APPOINTMENT must produce a non-null action");
  assert(result.action!.type === "book_appointment", `J: Expected book_appointment, got ${result.action!.type}`);
  assert(result.intent === "appointment_confirmation", `J: Expected appointment_confirmation, got ${result.intent}`);

  await Conversation.deleteMany({ tenantId }); await Message.deleteMany({ tenantId }); await Patient.deleteMany({ tenantId });
  testDone("J — BOOK_APPOINTMENT → action: book_appointment");
}

async function testK() {
  const today = new Date().toISOString().slice(0, 10);
  const sunday = nextWeekday(today, 0);
  const result = await availabilityService.getAvailableSlots({ tenantId, date: sunday, durationMin: 30 });
  assert(result.status === "CLOSED", `K: Sunday should return status=CLOSED, got ${result.status}`);
  // isClosed and status must be consistent
  assert(result.isClosed === true, "K: When status=CLOSED, isClosed must also be true");

  const monday = nextWeekday(today, 1);
  const openResult = await availabilityService.getAvailableSlots({ tenantId, date: monday, durationMin: 30 });
  assert(openResult.status !== "CLOSED", `K: Monday must NOT be CLOSED, got ${openResult.status}`);
  testDone("K — Décision CLOSED vient uniquement de slotsResult.status");
}

async function testL() {
  const today = new Date().toISOString().slice(0, 10);
  const monday = nextWeekday(today, 1);
  const r1 = await availabilityService.getAvailableSlots({ tenantId, date: monday, durationMin: 30 });
  const r2 = await availabilityService.getAvailableSlots({ tenantId, date: monday, durationMin: 30 });
  assert(r1.status === r2.status, `L: Two calls on same date must return same status. Got ${r1.status} vs ${r2.status}`);
  testDone("L — Anti-cache-stale: deux appels successifs → même statut");
}

async function testP0_13() {
  // THE test: exact bug scenario. samedi/dimanche → findNextBookableDay → D → getAvailableSlots(D) × 2 = OPEN
  const today = new Date().toISOString().slice(0, 10);
  const saturday = nextWeekday(today, 6);
  const sunday   = nextWeekday(today, 0);

  for (const [startDate, label] of [[saturday, "samedi"], [sunday, "dimanche"]] as const) {
    const nextDay = await availabilityService.findNextBookableDay({ tenantId, startDateIso: startDate, durationMin: 30 });
    assert(nextDay !== null, `P0.13 [${label}]: findNextBookableDay must return a day, got null`);

    const slots1 = await availabilityService.getAvailableSlots({ tenantId, date: nextDay!.date, durationMin: 30 });
    assert(
      slots1.status === "OPEN_WITH_AVAILABILITY",
      `P0.13 [${label}]: getAvailableSlots(${nextDay!.date}) call #1 = ${slots1.status}, expected OPEN_WITH_AVAILABILITY`
    );

    const slots2 = await availabilityService.getAvailableSlots({ tenantId, date: nextDay!.date, durationMin: 30 });
    assert(
      slots2.status === "OPEN_WITH_AVAILABILITY",
      `P0.13 [${label}]: getAvailableSlots(${nextDay!.date}) call #2 = ${slots2.status}, expected OPEN_WITH_AVAILABILITY`
    );

    assert(slots1.status === slots2.status, `P0.13 [${label}]: Both calls must agree. Got ${slots1.status} vs ${slots2.status}`);
    console.log(`   ✔ P0.13 [${label}]: findNextBookableDay → ${nextDay!.date} (${nextDay!.weekdayFr}) → ${slots1.status} ✓ × 2`);
  }
  testDone("P0.13 — Même date + même tenant, deux appels successifs → même statut. Scénario du bug fermé.");
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function runTests() {
  console.log("🧪 Starting Phase 6.14 — Single Source of Truth Consistency Tests...\n");
  await setup();

  const tests: Array<{ label: string; fn: () => Promise<void> }> = [
    { label: "A", fn: testA },
    { label: "B", fn: testB },
    { label: "C", fn: testC },
    { label: "D", fn: testD },
    { label: "E", fn: testE },
    { label: "F", fn: testF },
    { label: "G", fn: testG },
    { label: "H", fn: testH },
    { label: "I", fn: testI },
    { label: "J", fn: testJ },
    { label: "K", fn: testK },
    { label: "L", fn: testL },
    { label: "P0.13", fn: testP0_13 },
  ];

  for (const { label, fn } of tests) {
    try {
      await fn();
    } catch (err) {
      testFail(label, err);
    }
  }

  await mongoose.disconnect();

  const total = tests.length;
  console.log(`\n${"═".repeat(60)}`);
  console.log(`Phase 6.14 Results: ${passed}/${total} passed${failed > 0 ? `, ${failed} FAILED` : ""}`);
  console.log(`${"═".repeat(60)}\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
