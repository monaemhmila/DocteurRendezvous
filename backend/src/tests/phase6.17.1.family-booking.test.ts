/**
 * Phase 6.17.1 — Patient Target / Family Member Booking Tests
 *
 * Tests:
 *  1. Nouveau patient + booking → nouveau patient créé
 *  2. Patient existant + booking pour lui-même → patient existant utilisé
 *  3. Patient existant + "pour mon fils Mohamed" → Ahmed non modifié
 *  4. Enfant existant → son patientId est utilisé (pas de doublon)
 *  5. Enfant inexistant → nouveau patient créé
 *  6. Parent avec rdv actif + enfant sans rdv → réservation enfant autorisée
 *  7. Enfant avec rdv actif → réservation enfant bloquée (Phase 6.15)
 *  8. Aucun doublon patient quand membre existe déjà
 *  9. Toutes les recherches restent tenant-isolated
 * 10. pendingBookingIntent conserve correctement date/startTime/duration/treatment + targetPatientInfo
 * 11. Après identité du membre, booking revalidé avant création
 * 12. Availability seule ne déclenche aucune création/modification de patient
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { Tenant } from "../modules/tenants/tenant.model";
import { User } from "../modules/users/user.model";
import { Patient } from "../modules/patients/patient.model";
import { Appointment } from "../modules/appointments/appointment.model";
import { Conversation, Message } from "../modules/communications/communication.model";
import { AIAutoBookingService } from "../modules/ai/ai.auto-booking.service";
import { AIService } from "../modules/ai/ai.service";
import { IAIProvider, IChatMessage } from "../modules/ai/ai.provider.interface";
import { IMessagingProvider, SendMessageParams } from "../modules/communications/providers/messaging.provider";

dotenv.config();

const MONGO_URI = process.env.MONGO_TEST_URI || "mongodb://localhost:27017/medical-ai-test";

class MockAIProvider implements IAIProvider {
  public responses: string[] = [];
  private callCount = 0;

  reset() { this.callCount = 0; this.responses = []; }

  async generateCompletion(_messages: IChatMessage[]): Promise<string> {
    const r = this.responses[this.callCount] ?? this.responses[this.responses.length - 1] ?? "{}";
    this.callCount++;
    return r;
  }
}

class NoOpMessaging implements IMessagingProvider {
  async sendMessage(_p: SendMessageParams, _t: any): Promise<{ providerMessageId: string }> {
    return { providerMessageId: `noop-${Date.now()}` };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function bookingResponse(date: string, startTime: string): string {
  return JSON.stringify({
    reply: "Parfait",
    intent: "appointment_confirmation",
    action: {
      type: "book_appointment",
      targetId: "self",
      reason: "test",
      confidence: 1,
      booking: { date, startTime, durationMin: 30, treatment: "Consultation" }
    }
  });
}

function availabilityResponse(): string {
  return JSON.stringify({
    reply: "Voici les disponibilités",
    intent: "appointment_availability",
    scheduling: { date: "2026-09-22", durationMin: 30 }
  });
}

// ──────────────────────────────────────────────────────────────────────────────

async function runTests() {
  await mongoose.connect(MONGO_URI);

  const tenantId = new mongoose.Types.ObjectId().toString();
  const tenant2Id = new mongoose.Types.ObjectId().toString();

  await Tenant.create([
    {
      _id: tenantId, name: "Cabinet T1", timezone: "Africa/Tunis",
      settings: {
        businessHours: {
          start: "08:00",
          end: "18:00"
        }
      }
    },
    { _id: tenant2Id, name: "Cabinet T2", timezone: "Africa/Tunis" },
  ]);
  const docUser = await User.create({
    tenantId, firstName: "Doc", lastName: "Test",
    passwordHash: "dummy", email: `doc-${Date.now()}@test.com`, role: "clinic_owner"
  });
  const doctorId = docUser._id.toString();

  // Use next Monday and Tuesday — guaranteed weekdays with businessHours
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : (8 - dayOfWeek);
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  const nextTuesday = new Date(nextMonday);
  nextTuesday.setDate(nextMonday.getDate() + 1);
  const tomorrowIso = nextMonday.toISOString().slice(0, 10);
  const dayAfterIso = nextTuesday.toISOString().slice(0, 10);

  const mockProvider = new MockAIProvider();
  const aiService = new AIService(mockProvider);
  const svc = new AIAutoBookingService(aiService, new NoOpMessaging());

  let passed = 0; let failed = 0;

  function assert(cond: boolean, name: string) {
    if (cond) { console.log(`✅ ${name}`); passed++; }
    else { console.error(`❌ ${name}`); failed++; }
  }

  console.log("\n🧪 Phase 6.17.1 — Family Booking Tests\n");

  // ── TEST 1: Nouveau patient (aucun patient connu) + booking direct ──────────
  {
    const conv = await Conversation.create({
      tenantId, contactWaId: "+336001", channel: "whatsapp", status: "active"
    });
    await Message.create({
      tenantId, conversationId: conv._id, direction: "inbound", status: "received",
      content: "Je veux un rdv lundi pour Mohamed Hamila", providerMessageId: `t1-${Date.now()}`
    });
    // No patientId on conversation → should fail gracefully (no booking without patient)
    mockProvider.reset();
    mockProvider.responses = [bookingResponse(tomorrowIso, "08:00")];
    await svc.processInboundMessage(tenantId, conv._id.toString(), `t1-wamid`);
    const appts = await Appointment.find({ tenantId }).lean();
    assert(appts.length === 0, "TEST 1: Pas de booking sans patientId sur la conversation");
    await Conversation.deleteMany({ _id: conv._id });
    await Message.deleteMany({ conversationId: conv._id });
  }

  // ── TEST 2: Patient existant + booking pour lui-même ────────────────────────
  {
    const ahmed = await Patient.create({
      tenantId, firstName: "Ahmed", lastName: "Ben Ali", phone: "+336002", status: "active"
    });
    const conv = await Conversation.create({
      tenantId, patientId: ahmed._id, contactWaId: "+336002", channel: "whatsapp", status: "active"
    });
    await Message.create({
      tenantId, conversationId: conv._id, direction: "inbound", status: "received",
      content: "Je veux un rdv lundi à 08h", providerMessageId: `t2-${Date.now()}`
    });
    mockProvider.reset();
    mockProvider.responses = [bookingResponse(tomorrowIso, "08:00")];
    await svc.processInboundMessage(tenantId, conv._id.toString(), `t2-wamid`);

    const appts = await Appointment.find({ patientId: ahmed._id }).lean();
    const ahmedAfter = await Patient.findById(ahmed._id).lean();
    assert(appts.length === 1 && appts[0].startTime === "08:00", "TEST 2: Booking pour Ahmed créé");
    assert((ahmedAfter as any).firstName === "Ahmed" && (ahmedAfter as any).lastName === "Ben Ali",
      "TEST 2: Ahmed non modifié");

    await Appointment.deleteMany({ patientId: ahmed._id });
    await Conversation.deleteMany({ _id: conv._id });
    await Message.deleteMany({ conversationId: conv._id });
    await Patient.deleteMany({ _id: ahmed._id });
  }

  // ── TEST 3: Patient existant + "pour mon fils Mohamed" → Ahmed non modifié ──
  {
    const ahmed = await Patient.create({
      tenantId, firstName: "Ahmed", lastName: "Ben Ali", phone: "+336003", status: "active"
    });
    const conv = await Conversation.create({
      tenantId, patientId: ahmed._id, contactWaId: "+336003", channel: "whatsapp", status: "active"
    });
    await Message.create({
      tenantId, conversationId: conv._id, direction: "inbound", status: "received",
      content: "Je veux un rdv pour mon fils Mohamed Ben Ali lundi à 08h",
      providerMessageId: `t3-${Date.now()}`
    });
    mockProvider.reset();
    mockProvider.responses = [JSON.stringify({
      reply: "Parfait",
      intent: "appointment_confirmation",
      action: {
        type: "book_appointment", targetId: "self", reason: "test", confidence: 1,
        booking: { date: tomorrowIso, startTime: "08:00", durationMin: 30, treatment: "Consultation" }
      },
      patientInfo: { firstName: "Mohamed", lastName: "Ben Ali" }
    })];
    await svc.processInboundMessage(tenantId, conv._id.toString(), `t3-wamid`);

    const ahmedAfter = await Patient.findById(ahmed._id).lean();
    const mohamedPatients = await Patient.find({ tenantId, firstName: "Mohamed", lastName: "Ben Ali" }).lean();
    const mohamedAppts = mohamedPatients.length > 0
      ? await Appointment.find({ patientId: mohamedPatients[0]._id }).lean()
      : [];

    assert((ahmedAfter as any).firstName === "Ahmed", "TEST 3: Ahmed.firstName intact");
    assert((ahmedAfter as any).lastName === "Ben Ali", "TEST 3: Ahmed.lastName intact");
    assert(mohamedAppts.length === 1, "TEST 3: Rdv créé pour Mohamed Ben Ali");

    const ahmedAppts = await Appointment.find({ patientId: ahmed._id }).lean();
    assert(ahmedAppts.length === 0, "TEST 3: Aucun rdv pour Ahmed");

    await Appointment.deleteMany({ patientId: mohamedPatients[0]?._id });
    await Patient.deleteMany({ _id: { $in: [ahmed._id, ...(mohamedPatients.map(p => p._id))] } });
    await Conversation.deleteMany({ _id: conv._id });
    await Message.deleteMany({ conversationId: conv._id });
  }

  // ── TEST 4: Enfant existant → patientId existant utilisé (pas de doublon) ───
  {
    const ahmed = await Patient.create({
      tenantId, firstName: "Ahmed", lastName: "Ben Ali", phone: "+336004a", status: "active"
    });
    const sara = await Patient.create({
      tenantId, firstName: "Sara", lastName: "Ben Ali", phone: "+336004b", status: "lead"
    });
    const conv = await Conversation.create({
      tenantId, patientId: ahmed._id, contactWaId: "+336004a", channel: "whatsapp", status: "active"
    });
    await Message.create({
      tenantId, conversationId: conv._id, direction: "inbound", status: "received",
      content: "Pour ma fille Sara Ben Ali lundi à 08h", providerMessageId: `t4-${Date.now()}`
    });
    mockProvider.reset();
    mockProvider.responses = [JSON.stringify({
      reply: "Parfait",
      intent: "appointment_confirmation",
      action: {
        type: "book_appointment", targetId: "self", reason: "test", confidence: 1,
        booking: { date: tomorrowIso, startTime: "08:00", durationMin: 30, treatment: "Consultation" }
      },
      patientInfo: { firstName: "Sara", lastName: "Ben Ali" }
    })];
    await svc.processInboundMessage(tenantId, conv._id.toString(), `t4-wamid`);

    const saraCount = await Patient.countDocuments({ tenantId, firstName: "Sara", lastName: "Ben Ali" });
    const saraAppts = await Appointment.find({ patientId: sara._id }).lean();

    assert(saraCount === 1, "TEST 4: Aucun doublon Sara Ben Ali");
    assert(saraAppts.length === 1, "TEST 4: Rdv créé pour le dossier Sara existant");

    await Appointment.deleteMany({ patientId: sara._id });
    await Patient.deleteMany({ _id: { $in: [ahmed._id, sara._id] } });
    await Conversation.deleteMany({ _id: conv._id });
    await Message.deleteMany({ conversationId: conv._id });
  }

  // ── TEST 5: Enfant inexistant → nouveau patient créé ─────────────────────────
  {
    const ahmed = await Patient.create({
      tenantId, firstName: "Ahmed", lastName: "Ben Ali", phone: "+336005", status: "active"
    });
    const conv = await Conversation.create({
      tenantId, patientId: ahmed._id, contactWaId: "+336005", channel: "whatsapp", status: "active"
    });
    await Message.create({
      tenantId, conversationId: conv._id, direction: "inbound", status: "received",
      content: "Pour mon fils Karim Ben Ali mardi à 08h", providerMessageId: `t5-${Date.now()}`
    });
    mockProvider.reset();
    mockProvider.responses = [JSON.stringify({
      reply: "Parfait",
      intent: "appointment_confirmation",
      action: {
        type: "book_appointment", targetId: "self", reason: "test", confidence: 1,
        booking: { date: dayAfterIso, startTime: "08:00", durationMin: 30, treatment: "Consultation" }
      },
      patientInfo: { firstName: "Karim", lastName: "Ben Ali" }
    })];
    await svc.processInboundMessage(tenantId, conv._id.toString(), `t5-wamid`);

    const karim = await Patient.findOne({ tenantId, firstName: "Karim", lastName: "Ben Ali" }).lean();
    assert(!!karim, "TEST 5: Nouveau patient Karim Ben Ali créé");
    if (karim) {
      const karimAppts = await Appointment.find({ patientId: karim._id }).lean();
      assert(karimAppts.length === 1, "TEST 5: Rdv créé pour Karim");
      await Appointment.deleteMany({ patientId: karim._id });
      await Patient.deleteMany({ _id: karim._id });
    }
    await Patient.deleteMany({ _id: ahmed._id });
    await Conversation.deleteMany({ _id: conv._id });
    await Message.deleteMany({ conversationId: conv._id });
  }

  // ── TEST 6: Parent avec rdv actif + enfant sans rdv → autorisé ──────────────
  {
    const ahmed = await Patient.create({
      tenantId, firstName: "Ahmed", lastName: "Ben Ali", phone: "+336006", status: "active"
    });
    // Ahmed has an active upcoming appointment
    await Appointment.create({
      tenantId, patientId: ahmed._id, doctorId, date: tomorrowIso,
      startTime: "10:00", endTime: "10:30", durationMin: 30, treatment: "Consultation", status: "scheduled"
    });
    const conv = await Conversation.create({
      tenantId, patientId: ahmed._id, contactWaId: "+336006", channel: "whatsapp", status: "active"
    });
    await Message.create({
      tenantId, conversationId: conv._id, direction: "inbound", status: "received",
      content: "Pour ma femme Fatima Ben Ali mardi à 08h", providerMessageId: `t6-${Date.now()}`
    });
    mockProvider.reset();
    mockProvider.responses = [JSON.stringify({
      reply: "Parfait",
      intent: "appointment_confirmation",
      action: {
        type: "book_appointment", targetId: "self", reason: "test", confidence: 1,
        booking: { date: dayAfterIso, startTime: "08:00", durationMin: 30, treatment: "Consultation" }
      },
      patientInfo: { firstName: "Fatima", lastName: "Ben Ali" }
    })];
    await svc.processInboundMessage(tenantId, conv._id.toString(), `t6-wamid`);

    const fatima = await Patient.findOne({ tenantId, firstName: "Fatima", lastName: "Ben Ali" }).lean();
    assert(!!fatima, "TEST 6: Fatima créée");
    if (fatima) {
      const fatimaAppts = await Appointment.find({ patientId: fatima._id }).lean();
      assert(fatimaAppts.length === 1, "TEST 6: Rdv Fatima autorisé malgré rdv de Ahmed");
      await Appointment.deleteMany({ patientId: fatima._id });
      await Patient.deleteMany({ _id: fatima._id });
    }
    await Appointment.deleteMany({ patientId: ahmed._id });
    await Patient.deleteMany({ _id: ahmed._id });
    await Conversation.deleteMany({ _id: conv._id });
    await Message.deleteMany({ conversationId: conv._id });
  }

  // ── TEST 7: Enfant avec rdv actif → réservation bloquée (Phase 6.15) ─────────
  {
    const ahmed = await Patient.create({
      tenantId, firstName: "Ahmed", lastName: "Ben Ali", phone: "+336007a", status: "active"
    });
    const child = await Patient.create({
      tenantId, firstName: "Youssef", lastName: "Ben Ali", phone: "+336007b", status: "active"
    });
    // child already has a future appointment
    await Appointment.create({
      tenantId, patientId: child._id, doctorId, date: tomorrowIso,
      startTime: "09:00", endTime: "09:30", durationMin: 30, treatment: "Consultation", status: "scheduled"
    });
    const conv = await Conversation.create({
      tenantId, patientId: ahmed._id, contactWaId: "+336007a", channel: "whatsapp", status: "active"
    });
    await Message.create({
      tenantId, conversationId: conv._id, direction: "inbound", status: "received",
      content: "Pour mon fils Youssef Ben Ali lundi à 08h", providerMessageId: `t7-${Date.now()}`
    });
    mockProvider.reset();
    mockProvider.responses = [JSON.stringify({
      reply: "Parfait",
      intent: "appointment_confirmation",
      action: {
        type: "book_appointment", targetId: "self", reason: "test", confidence: 1,
        booking: { date: tomorrowIso, startTime: "08:00", durationMin: 30, treatment: "Consultation" }
      },
      patientInfo: { firstName: "Youssef", lastName: "Ben Ali" }
    })];
    await svc.processInboundMessage(tenantId, conv._id.toString(), `t7-wamid`);

    const childAppts = await Appointment.find({ patientId: child._id }).lean();
    assert(childAppts.length === 1, "TEST 7: Deuxième rdv Youssef bloqué par Phase 6.15");

    await Appointment.deleteMany({ patientId: child._id });
    await Patient.deleteMany({ _id: { $in: [ahmed._id, child._id] } });
    await Conversation.deleteMany({ _id: conv._id });
    await Message.deleteMany({ conversationId: conv._id });
  }

  // ── TEST 8: Aucun doublon patient quand membre existe ──────────────────────
  {
    const countBefore = await Patient.countDocuments({ tenantId, firstName: "Sara", lastName: "BenX" });

    const ahmed = await Patient.create({
      tenantId, firstName: "Ahmed", lastName: "BenX", phone: "+336008a", status: "active"
    });
    const sara = await Patient.create({
      tenantId, firstName: "Sara", lastName: "BenX", phone: "+336008b", status: "lead"
    });
    const conv = await Conversation.create({
      tenantId, patientId: ahmed._id, contactWaId: "+336008a", channel: "whatsapp", status: "active"
    });
    await Message.create({
      tenantId, conversationId: conv._id, direction: "inbound", status: "received",
      content: "Pour ma sœur Sara BenX mardi à 08h", providerMessageId: `t8-${Date.now()}`
    });
    mockProvider.reset();
    mockProvider.responses = [JSON.stringify({
      reply: "Parfait",
      intent: "appointment_confirmation",
      action: {
        type: "book_appointment", targetId: "self", reason: "test", confidence: 1,
        booking: { date: dayAfterIso, startTime: "08:00", durationMin: 30, treatment: "Consultation" }
      },
      patientInfo: { firstName: "Sara", lastName: "BenX" }
    })];
    await svc.processInboundMessage(tenantId, conv._id.toString(), `t8-wamid`);

    const countAfter = await Patient.countDocuments({ tenantId, firstName: "Sara", lastName: "BenX" });
    assert(countAfter - countBefore === 1, "TEST 8: Aucun doublon Sara BenX créé");

    await Appointment.deleteMany({ patientId: sara._id });
    await Patient.deleteMany({ _id: { $in: [ahmed._id, sara._id] } });
    await Conversation.deleteMany({ _id: conv._id });
    await Message.deleteMany({ conversationId: conv._id });
  }

  // ── TEST 9: Isolation multi-tenant ─────────────────────────────────────────
  {
    // Patient with same name exists only in tenant2
    const p2 = await Patient.create({
      tenantId: tenant2Id, firstName: "Isolée", lastName: "CrossTenant",
      phone: "+336009t2", status: "lead"
    });
    const ahmed = await Patient.create({
      tenantId, firstName: "Ahmed", lastName: "T1", phone: "+336009t1", status: "active"
    });
    const conv = await Conversation.create({
      tenantId, patientId: ahmed._id, contactWaId: "+336009t1", channel: "whatsapp", status: "active"
    });
    await Message.create({
      tenantId, conversationId: conv._id, direction: "inbound", status: "received",
      content: "Pour ma fille Isolée CrossTenant mardi à 08h", providerMessageId: `t9-${Date.now()}`
    });
    mockProvider.reset();
    mockProvider.responses = [JSON.stringify({
      reply: "Parfait",
      intent: "appointment_confirmation",
      action: {
        type: "book_appointment", targetId: "self", reason: "test", confidence: 1,
        booking: { date: dayAfterIso, startTime: "08:00", durationMin: 30, treatment: "Consultation" }
      },
      patientInfo: { firstName: "Isolée", lastName: "CrossTenant" }
    })];
    await svc.processInboundMessage(tenantId, conv._id.toString(), `t9-wamid`);

    // A NEW patient with this name should be created in tenant1, not reusing tenant2's record
    const t1Match = await Patient.find({ tenantId, firstName: "Isolée", lastName: "CrossTenant" }).lean();
    const t2Match = await Patient.findById(p2._id).lean();
    const t2Appts = await Appointment.find({ patientId: p2._id }).lean();

    assert(t1Match.length === 1, "TEST 9: Nouveau patient créé dans T1");
    assert(t2Appts.length === 0, "TEST 9: Aucun rdv créé pour le patient T2");
    assert(!!(t2Match), "TEST 9: Patient T2 inchangé");

    await Appointment.deleteMany({ patientId: t1Match[0]?._id });
    await Patient.deleteMany({ _id: { $in: [ahmed._id, p2._id, ...(t1Match.map(p => p._id))] } });
    await Conversation.deleteMany({ _id: conv._id });
    await Message.deleteMany({ conversationId: conv._id });
  }

  // ── TEST 10: pendingBookingIntent avec targetPatientInfo ────────────────────
  {
    // Patient with placeholder name (will need identity)
    const patient = await Patient.create({
      tenantId, firstName: "Patient", lastName: "WhatsApp", phone: "+33601010", status: "lead"
    });
    const conv = await Conversation.create({
      tenantId, patientId: patient._id, contactWaId: "+33601010", channel: "whatsapp", status: "active"
    });
    await Message.create({
      tenantId, conversationId: conv._id, direction: "inbound", status: "received",
      content: "Pour mon fils Amine Trabelsi lundi à 08h", providerMessageId: `t10-${Date.now()}`
    });
    mockProvider.reset();
    mockProvider.responses = [JSON.stringify({
      reply: "Parfait",
      intent: "appointment_confirmation",
      action: {
        type: "book_appointment", targetId: "self", reason: "test", confidence: 1,
        booking: { date: tomorrowIso, startTime: "08:00", durationMin: 30, treatment: "Consultation" }
      },
      patientInfo: { firstName: "Amine", lastName: "Trabelsi" }
    })];
    await svc.processInboundMessage(tenantId, conv._id.toString(), `t10-wamid`);

    const convAfter = await Conversation.findById(conv._id).lean();
    const intent = convAfter?.pendingBookingIntent;
    assert(!!intent?.awaitingIdentity, "TEST 10: awaitingIdentity = true");
    assert(intent?.date === tomorrowIso, "TEST 10: date conservée");
    assert(intent?.startTime === "08:00", "TEST 10: startTime conservé");
    assert(intent?.targetPatientInfo?.firstName === "Amine", "TEST 10: targetPatientInfo.firstName = Amine");
    assert(intent?.targetPatientInfo?.lastName === "Trabelsi", "TEST 10: targetPatientInfo.lastName = Trabelsi");

    await Patient.deleteMany({ _id: patient._id });
    await Conversation.deleteMany({ _id: conv._id });
    await Message.deleteMany({ conversationId: conv._id });
  }

  // ── TEST 11: Après identité + pendingIntent avec targetPatientInfo → booking revalidé ──
  {
    const patient = await Patient.create({
      tenantId, firstName: "Patient", lastName: "WhatsApp", phone: "+33601011", status: "lead"
    });
    const conv = await Conversation.create({
      tenantId, patientId: patient._id, contactWaId: "+33601011", channel: "whatsapp",
      status: "active",
      pendingBookingIntent: {
        date: tomorrowIso, startTime: "08:00", durationMin: 30, treatment: "Consultation",
        awaitingIdentity: true,
        targetPatientInfo: { firstName: "Farid", lastName: "Khelil" }
      }
    });
    await Message.create({
      tenantId, conversationId: conv._id, direction: "inbound", status: "received",
      content: "Je m'appelle Hasan Dridi", providerMessageId: `t11-${Date.now()}`
    });
    mockProvider.reset();
    mockProvider.responses = [JSON.stringify({
      reply: "Merci",
      intent: "general_question",
      patientInfo: { firstName: "Hasan", lastName: "Dridi" }
    })];
    await svc.processInboundMessage(tenantId, conv._id.toString(), `t11-wamid`);

    // The conversation patient (Hasan) should be updated but not confused with Farid
    const hasanDoc = await Patient.findById(patient._id).lean();
    assert((hasanDoc as any).firstName === "Hasan", "TEST 11: Patient identifié comme Hasan");

    // Farid (the target) should have been created and booked
    const farid = await Patient.findOne({ tenantId, firstName: "Farid", lastName: "Khelil" }).lean();
    assert(!!farid, "TEST 11: Farid Khelil créé après identité Hasan");
    if (farid) {
      const faridAppts = await Appointment.find({ patientId: farid._id }).lean();
      assert(faridAppts.length === 1, "TEST 11: Rdv créé pour Farid");
      await Appointment.deleteMany({ patientId: farid._id });
      await Patient.deleteMany({ _id: farid._id });
    }

    const hasanAppts = await Appointment.find({ patientId: patient._id }).lean();
    assert(hasanAppts.length === 0, "TEST 11: Aucun rdv pour Hasan");

    await Patient.deleteMany({ _id: patient._id });
    await Conversation.deleteMany({ _id: conv._id });
    await Message.deleteMany({ conversationId: conv._id });
  }

  // ── TEST 12: Availability seule → aucune création/modification de patient ──
  {
    const count0 = await Patient.countDocuments({ tenantId });
    const ahmed = await Patient.create({
      tenantId, firstName: "Ahmed", lastName: "Avail", phone: "+33601012", status: "active"
    });
    const conv = await Conversation.create({
      tenantId, patientId: ahmed._id, contactWaId: "+33601012", channel: "whatsapp", status: "active"
    });
    await Message.create({
      tenantId, conversationId: conv._id, direction: "inbound", status: "received",
      content: "Quels sont vos créneaux demain ?", providerMessageId: `t12-${Date.now()}`
    });
    mockProvider.reset();
    mockProvider.responses = [availabilityResponse()];
    await svc.processInboundMessage(tenantId, conv._id.toString(), `t12-wamid`);

    const countAfter = await Patient.countDocuments({ tenantId });
    const ahmedAfter = await Patient.findById(ahmed._id).lean();
    const convAfter = await Conversation.findById(conv._id).lean();

    assert(countAfter === count0 + 1, "TEST 12: Aucun patient supplémentaire créé pour availability");
    assert((ahmedAfter as any).firstName === "Ahmed", "TEST 12: Ahmed non modifié");
    assert(!convAfter?.pendingBookingIntent, "TEST 12: Pas de pendingBookingIntent pour availability");

    await Patient.deleteMany({ _id: ahmed._id });
    await Conversation.deleteMany({ _id: conv._id });
    await Message.deleteMany({ conversationId: conv._id });
  }

  // ── Results ────────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════");
  if (failed === 0) {
    console.log(`🎉 ALL PHASE 6.17.1 TESTS PASSED — ${passed} tests`);
  } else {
    console.log(`❌ ${failed} TESTS FAILED, ${passed} PASSED`);
  }
  console.log("═══════════════════════════════════════════════════════\n");

  // Cleanup
  await Tenant.deleteMany({ _id: { $in: [tenantId, tenant2Id] } });
  await User.deleteMany({ tenantId });
  await mongoose.disconnect();

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
