/**
 * Phase 6.13 — Availability Consistency & Proactive Suggestion Tests
 *
 * Tests A through O covering:
 *   - findNextBookableDay skipping closed/full days
 *   - DayAvailabilityStatus (OPEN_WITH_AVAILABILITY, OPEN_FULL, CLOSED, PAST)
 *   - Two-pass system updates with verified next open days
 *   - CLOSED vs FULL taxonomy enforcement
 *   - Strict prohibition of unverified alternative dates
 *   - Tenant timezone consistency (Africa/Tunis)
 *
 * Dates: week of 26-30 Sept 2026
 *   2026-09-26 = samedi
 *   2026-09-27 = dimanche (fermé)
 *   2026-09-28 = lundi
 *   2026-09-29 = mardi
 *   2026-09-30 = mercredi
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

// Weekly hours fixture: Monday-Friday 08:30-12:30 & 14:00-18:30, Saturday 08:30-12:30, Sunday closed
const WEEKLY_BUSINESS_HOURS = {
  monday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  tuesday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  wednesday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  thursday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  friday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  saturday: [{ start: "08:30", end: "12:30" }],
  sunday: [],
};

// Scriptable Mock AI Provider
class ScriptableMockAIProvider implements IAIProvider {
  public history: IChatMessage[][] = [];
  public pass1Response: string = "";
  public pass2Response: string = "";
  private callCount = 0;

  public reset() {
    this.history = [];
    this.callCount = 0;
  }

  async generateCompletion(messages: IChatMessage[]): Promise<string> {
    this.history.push([...messages]);
    this.callCount++;
    if (this.callCount === 1) {
      return this.pass1Response;
    }
    return this.pass2Response;
  }
}

let passed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
}
function testDone(label: string) {
  passed++;
  console.log(`✅ TEST ${label} PASSED`);
}

async function runTests() {
  console.log("🧪 Starting Phase 6.13 — Availability Consistency & Next Day Suggestion Tests...\n");

  await mongoose.connect(MONGO_URI);

  // Clean DB
  await Tenant.deleteMany({});
  await User.deleteMany({});
  await Patient.deleteMany({});
  await Appointment.deleteMany({});
  await Conversation.deleteMany({});
  await Message.deleteMany({});

  // Setup test tenant
  const tenant = await Tenant.create({
    name: "Cabinet Dentaire Dr. Ben Ammar",
    timezone: "Africa/Tunis",
    status: "active",
    plan: "pro",
    settings: {
      businessHours: WEEKLY_BUSINESS_HOURS,
      services: [{ name: "Consultation générale", durationMin: 30, price: 60 }],
    },
  });

  const doctor = await User.create({
    tenantId: tenant._id,
    firstName: "Dr. Ben",
    lastName: "Ammar",
    email: "dr.benammar@clinic.tn",
    passwordHash: "hash123",
    role: "clinic_owner",
  });

  const tenantId = tenant._id.toString();
  const doctorId = doctor._id.toString();

  // ── TEST A — findNextBookableDay skips Sunday (closed) to find Monday ──
  try {
    // 2026-09-26 is Saturday. The next day is Sunday 2026-09-27 (closed). Monday 2026-09-28 is open.
    const nextDay = await availabilityService.findNextBookableDay({
      tenantId,
      startDateIso: "2026-09-26",
      durationMin: 30,
    });

    assert(nextDay !== null, "A: Expected nextDay to be found");
    assert(nextDay?.date === "2026-09-28", `A: Expected 2026-09-28 (Monday), got ${nextDay?.date}`);
    assert(nextDay?.weekdayFr === "lundi", `A: Expected weekday 'lundi', got ${nextDay?.weekdayFr}`);
    assert(nextDay?.slotsCount! > 0, "A: Expected slotsCount > 0");
    testDone("A");
  } catch (e: any) {
    console.error("❌ TEST A FAILED:", e.message);
    throw e;
  }

  // ── TEST B — findNextBookableDay skips Sunday (closed) AND Monday (fully booked) to find Tuesday ──
  try {
    const dummyPatient = await Patient.create({
      tenantId,
      firstName: "Test",
      lastName: "Patient",
      phone: "+21699999999",
      status: "lead",
    });

    // Fully book Monday 2026-09-28 (08:30 to 12:30 and 14:00 to 18:30)
    await Appointment.create([
      { tenantId, doctorId, patientId: dummyPatient._id, date: "2026-09-28", startTime: "08:30", endTime: "12:30", status: "confirmed", treatment: "Soins" },
      { tenantId, doctorId, patientId: dummyPatient._id, date: "2026-09-28", startTime: "14:00", endTime: "18:30", status: "confirmed", treatment: "Soins" },
    ]);

    const nextDay = await availabilityService.findNextBookableDay({
      tenantId,
      startDateIso: "2026-09-26",
      durationMin: 30,
    });

    assert(nextDay !== null, "B: Expected nextDay to be found");
    assert(nextDay?.date === "2026-09-29", `B: Expected 2026-09-29 (Tuesday), got ${nextDay?.date}`);
    assert(nextDay?.weekdayFr === "mardi", `B: Expected weekday 'mardi', got ${nextDay?.weekdayFr}`);
    testDone("B");
  } catch (e: any) {
    console.error("❌ TEST B FAILED:", e.message);
    throw e;
  }

  // ── TEST C — findNextBookableDay returns null if all days in 14-day window are closed ──
  try {
    const closedTenant = await Tenant.create({
      name: "Closed Clinic",
      timezone: "Africa/Tunis",
      status: "active",
      plan: "pro",
      settings: {
        businessHours: {
          monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
        },
      },
    });

    const nextDay = await availabilityService.findNextBookableDay({
      tenantId: closedTenant._id.toString(),
      startDateIso: "2026-09-26",
      durationMin: 30,
      maxDaysAhead: 14,
    });

    assert(nextDay === null, "C: Expected null when all days are closed");
    testDone("C");
  } catch (e: any) {
    console.error("❌ TEST C FAILED:", e.message);
    throw e;
  }

  // ── TEST D — getAvailableSlots returns status: 'CLOSED' for Sunday ──
  try {
    const result = await availabilityService.getAvailableSlots({
      tenantId,
      date: "2026-09-27", // Sunday
      durationMin: 30,
    });

    assert(result.status === "CLOSED", `D: Expected status 'CLOSED', got ${result.status}`);
    assert(result.isClosed === true, "D: Expected isClosed to be true");
    assert(result.slots.length === 0, `D: Expected 0 slots, got ${result.slots.length}`);
    testDone("D");
  } catch (e: any) {
    console.error("❌ TEST D FAILED:", e.message);
    throw e;
  }

  // ── TEST E — getAvailableSlots returns status: 'OPEN_FULL' for fully booked Monday ──
  try {
    const result = await availabilityService.getAvailableSlots({
      tenantId,
      date: "2026-09-28", // Monday (booked in Test B)
      durationMin: 30,
    });

    assert(result.status === "OPEN_FULL", `E: Expected status 'OPEN_FULL', got ${result.status}`);
    assert(result.slots.length === 0, `E: Expected 0 slots, got ${result.slots.length}`);
    testDone("E");
  } catch (e: any) {
    console.error("❌ TEST E FAILED:", e.message);
    throw e;
  }

  // ── TEST F — getAvailableSlots returns status: 'OPEN_WITH_AVAILABILITY' for Tuesday ──
  try {
    const result = await availabilityService.getAvailableSlots({
      tenantId,
      date: "2026-09-29", // Tuesday (unbooked)
      durationMin: 30,
    });

    assert(result.status === "OPEN_WITH_AVAILABILITY", `F: Expected status 'OPEN_WITH_AVAILABILITY', got ${result.status}`);
    assert(result.slots.length > 0, `F: Expected slots > 0, got ${result.slots.length}`);
    assert(result.slots[0].startTime === "08:30", `F: Expected first slot 08:30, got ${result.slots[0].startTime}`);
    testDone("F");
  } catch (e: any) {
    console.error("❌ TEST F FAILED:", e.message);
    throw e;
  }

  // ── TEST G — getAvailableSlots returns status: 'PAST' for past date ──
  try {
    const result = await availabilityService.getAvailableSlots({
      tenantId,
      date: "2020-01-01",
      durationMin: 30,
    });

    assert(result.status === "PAST", `G: Expected status 'PAST', got ${result.status}`);
    assert(result.isPastDate === true, "G: Expected isPastDate to be true");
    assert(result.slots.length === 0, `G: Expected 0 slots, got ${result.slots.length}`);
    testDone("G");
  } catch (e: any) {
    console.error("❌ TEST G FAILED:", e.message);
    throw e;
  }

  // ── TEST H — Two-pass AI flow for CLOSED day (Sunday 2026-09-27) ──
  try {
    const mockProvider = new ScriptableMockAIProvider();
    const aiService = new AIService(mockProvider);

    const patient = await Patient.create({
      tenantId,
      firstName: "Amine",
      lastName: "Gharbi",
      phone: "+21698000001",
      status: "lead",
    });

    const conversation = await Conversation.create({
      tenantId,
      patientId: patient._id,
      contactWaId: "+21698000001",
      channel: "whatsapp",
      status: "active",
    });

    await Message.create({
      tenantId,
      conversationId: conversation._id,
      patientId: patient._id,
      direction: "inbound",
      status: "received",
      providerMessageId: "wamid_test_h_1",
      content: "Bonjour, avez-vous des disponibilités pour dimanche 27 septembre ?",
    });

    // Pass 1 returns appointment_availability intent for 2026-09-27
    mockProvider.pass1Response = JSON.stringify({
      intent: "appointment_availability",
      scheduling: {
        date: "2026-09-27",
        durationMin: 30,
      },
      reply: "Je vérifie les disponibilités pour dimanche...",
    });

    // Pass 2 response
    mockProvider.pass2Response = JSON.stringify({
      intent: "appointment_availability",
      reply: "Le cabinet est fermé le dimanche 27 septembre. Le prochain jour avec des créneaux disponibles est le mardi 29 septembre. Souhaitez-vous que je vous présente les créneaux pour mardi ?",
    });

    const aiRes = await aiService.getSuggestion(tenantId, conversation._id.toString());

    // Verify Pass 2 was called with systemUpdate containing next available day
    assert(mockProvider.history.length === 2, `H: Expected 2 passes, got ${mockProvider.history.length}`);
    const pass2Messages = mockProvider.history[1];
    const systemUpdateMsg = pass2Messages.find((m) => m.role === "system" && m.content.includes("[SYSTEM] Le cabinet est FERMÉ"));
    assert(systemUpdateMsg !== undefined, "H: Expected [SYSTEM] Le cabinet est FERMÉ in Pass 2 system message");
    assert(systemUpdateMsg!.content.includes("29 septembre") || systemUpdateMsg!.content.includes("mardi"), "H: Expected next open day (mardi 29 septembre) in system message");
    assert(systemUpdateMsg!.content.includes("NE PROPOSEZ PAS ENCORE D'HORAIRES PRÉCIS"), "H: Expected rule not to propose hours without agreement");
    assert(aiRes.suggestion.includes("fermé"), "H: Expected reply to explain clinic is closed");
    testDone("H");
  } catch (e: any) {
    console.error("❌ TEST H FAILED:", e.message);
    throw e;
  }

  // ── TEST I — Two-pass AI flow for OPEN_FULL day (Monday 2026-09-28) ──
  try {
    const mockProvider = new ScriptableMockAIProvider();
    const aiService = new AIService(mockProvider);

    const patient = await Patient.create({
      tenantId,
      firstName: "Sonia",
      lastName: "Trabelsi",
      phone: "+21698000002",
      status: "lead",
    });

    const conversation = await Conversation.create({
      tenantId,
      patientId: patient._id,
      contactWaId: "+21698000002",
      channel: "whatsapp",
      status: "active",
    });

    await Message.create({
      tenantId,
      conversationId: conversation._id,
      patientId: patient._id,
      direction: "inbound",
      status: "received",
      providerMessageId: "wamid_test_i_1",
      content: "Est-ce qu'il y a de la place lundi 28 septembre ?",
    });

    mockProvider.pass1Response = JSON.stringify({
      intent: "appointment_availability",
      scheduling: {
        date: "2026-09-28",
        durationMin: 30,
      },
      reply: "Je vérifie les disponibilités pour lundi...",
    });

    mockProvider.pass2Response = JSON.stringify({
      intent: "appointment_availability",
      reply: "Le planning est complet pour le lundi 28 septembre. Le prochain jour avec des créneaux disponibles est le mardi 29 septembre. Souhaitez-vous voir les créneaux pour cette date ?",
    });

    const aiRes = await aiService.getSuggestion(tenantId, conversation._id.toString());

    assert(mockProvider.history.length === 2, `I: Expected 2 passes, got ${mockProvider.history.length}`);
    const pass2Messages = mockProvider.history[1];
    const systemUpdateMsg = pass2Messages.find((m) => m.role === "system" && m.content.includes("[SYSTEM] Le planning est COMPLET"));
    assert(systemUpdateMsg !== undefined, "I: Expected [SYSTEM] Le planning est COMPLET in Pass 2 system message");
    assert(systemUpdateMsg!.content.includes("29 septembre") || systemUpdateMsg!.content.includes("mardi"), "I: Expected next bookable day Tuesday in system message");
    assert(aiRes.suggestion.includes("complet"), "I: Expected reply to explain planning is complet");
    assert(!aiRes.suggestion.includes("fermé le lundi"), "I: Expected reply NOT to say clinic is closed on Monday");
    testDone("I");
  } catch (e: any) {
    console.error("❌ TEST I FAILED:", e.message);
    throw e;
  }

  // ── TEST J — Two-pass AI flow for OPEN_WITH_AVAILABILITY (Tuesday 2026-09-29) ──
  try {
    const mockProvider = new ScriptableMockAIProvider();
    const aiService = new AIService(mockProvider);

    const patient = await Patient.create({
      tenantId,
      firstName: "Kamel",
      lastName: "Mahjoub",
      phone: "+21698000003",
      status: "lead",
    });

    const conversation = await Conversation.create({
      tenantId,
      patientId: patient._id,
      contactWaId: "+21698000003",
      channel: "whatsapp",
      status: "active",
    });

    await Message.create({
      tenantId,
      conversationId: conversation._id,
      patientId: patient._id,
      direction: "inbound",
      status: "received",
      providerMessageId: "wamid_test_j_1",
      content: "Disponibilités mardi 29 septembre s'il vous plaît",
    });

    mockProvider.pass1Response = JSON.stringify({
      intent: "appointment_availability",
      scheduling: {
        date: "2026-09-29",
        durationMin: 30,
      },
      reply: "Je vérifie les créneaux...",
    });

    mockProvider.pass2Response = JSON.stringify({
      intent: "appointment_availability",
      reply: "Pour le mardi 29 septembre, nous avons des disponibilités à 08h30, 09h00, 09h30, 10h00 ou 10h30. Quel horaire vous conviendrait le mieux ?",
    });

    const aiRes = await aiService.getSuggestion(tenantId, conversation._id.toString());

    assert(mockProvider.history.length === 2, `J: Expected 2 passes, got ${mockProvider.history.length}`);
    const pass2Messages = mockProvider.history[1];
    const systemUpdateMsg = pass2Messages.find((m) => m.role === "system" && m.content.includes("Créneaux disponibles:"));
    assert(systemUpdateMsg !== undefined, "J: Expected Créneaux disponibles in system message");
    assert(aiRes.proposedSlots !== undefined && aiRes.proposedSlots.length > 0, "J: Expected proposedSlots to be returned");
    testDone("J");
  } catch (e: any) {
    console.error("❌ TEST J FAILED:", e.message);
    throw e;
  }

  // ── TEST K — Taxonomy check: CLOSED day uses 'fermé', not 'complet' ──
  try {
    const res = await availabilityService.getAvailableSlots({
      tenantId,
      date: "2026-09-27", // Sunday
      durationMin: 30,
    });
    assert(res.status === "CLOSED", "K: Sunday must be status CLOSED");
    assert(res.status !== "OPEN_FULL", "K: Sunday must NOT be OPEN_FULL");
    testDone("K");
  } catch (e: any) {
    console.error("❌ TEST K FAILED:", e.message);
    throw e;
  }

  // ── TEST L — Taxonomy check: OPEN_FULL day uses 'complet', not 'fermé' ──
  try {
    const res = await availabilityService.getAvailableSlots({
      tenantId,
      date: "2026-09-28", // Monday with all hours booked
      durationMin: 30,
    });
    assert(res.status === "OPEN_FULL", "L: Fully booked Monday must be OPEN_FULL");
    assert(res.status !== "CLOSED", "L: Fully booked Monday must NOT be CLOSED");
    testDone("L");
  } catch (e: any) {
    console.error("❌ TEST L FAILED:", e.message);
    throw e;
  }

  // ── TEST M — No blind suggestion: Saturday request when Sunday closed proposes Tuesday (Monday booked) ──
  try {
    const nextDayFromSat = await availabilityService.findNextBookableDay({
      tenantId,
      startDateIso: "2026-09-26", // Saturday
      durationMin: 30,
    });
    // Next day must be Tuesday 2026-09-29 (Monday 2026-09-28 is fully booked in test setup)
    assert(nextDayFromSat?.date !== "2026-09-27", "M: Must not propose Sunday (closed)");
    assert(nextDayFromSat?.date !== "2026-09-28", "M: Must not propose Monday (fully booked)");
    assert(nextDayFromSat?.date === "2026-09-29", "M: Must propose Tuesday (first available open day)");
    testDone("M");
  } catch (e: any) {
    console.error("❌ TEST M FAILED:", e.message);
    throw e;
  }

  // ── TEST N — Reason explained: Sunday is explained as closed in system instruction ──
  try {
    const nextDay = await availabilityService.findNextBookableDay({
      tenantId,
      startDateIso: "2026-09-27",
      durationMin: 30,
    });
    assert(nextDay?.weekdayFr === "mardi", "N: Next bookable day after Sunday is Tuesday (Monday booked)");
    testDone("N");
  } catch (e: any) {
    console.error("❌ TEST N FAILED:", e.message);
    throw e;
  }

  // ── TEST O — Timezone consistency: Africa/Tunis tenant timezone preserved ──
  try {
    const tunisTenant = await Tenant.findById(tenantId).lean();
    assert((tunisTenant as any)?.timezone === "Africa/Tunis", "O: Tenant timezone must be Africa/Tunis");

    const slotsRes = await availabilityService.getAvailableSlots({
      tenantId,
      date: "2026-09-30", // Wednesday
      durationMin: 30,
    });
    assert(slotsRes.weekdayFr === "mercredi", `O: Expected mercredi, got ${slotsRes.weekdayFr}`);
    assert(slotsRes.status === "OPEN_WITH_AVAILABILITY", "O: Wednesday has availability");
    testDone("O");
  } catch (e: any) {
    console.error("❌ TEST O FAILED:", e.message);
    throw e;
  }

  console.log(`\n═══════════════════════════════════════════════════════`);
  console.log(`🎉 ALL PHASE 6.13 TESTS PASSED — ${passed}/15 tests`);
  console.log(`═══════════════════════════════════════════════════════\n`);

  await mongoose.disconnect();
}

runTests().catch((e) => {
  console.error("FATAL ERROR IN TEST SUITE:", e);
  process.exit(1);
});
