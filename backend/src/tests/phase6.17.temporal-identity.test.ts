import mongoose from "mongoose";
import dotenv from "dotenv";
import { Tenant } from "../modules/tenants/tenant.model";
import { User } from "../modules/users/user.model";
import { Patient } from "../modules/patients/patient.model";
import { Appointment } from "../modules/appointments/appointment.model";
import { Conversation, Message } from "../modules/communications/communication.model";
import { AIAutoBookingService } from "../modules/ai/ai.auto-booking.service";
import { appointmentService } from "../modules/appointments/appointment.service";
import { AIService } from "../modules/ai/ai.service";
import { nowInTimezone, DEFAULT_TIMEZONE } from "../modules/ai/temporal.utils";
import { IAIProvider, IChatMessage } from "../modules/ai/ai.provider.interface";
import { IMessagingProvider, SendMessageParams } from "../modules/communications/providers/messaging.provider";

dotenv.config();

const MONGO_URI = process.env.MONGO_TEST_URI || "mongodb://localhost:27017/medical-ai-test";

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
  async sendMessage(_payload: SendMessageParams, _tenant: any): Promise<{ providerMessageId: string }> {
    return { providerMessageId: `noop-${Date.now()}` };
  }
}

async function runTests() {
  await mongoose.connect(MONGO_URI);

  const tA = new mongoose.Types.ObjectId().toString();
  await Tenant.create({
    _id: tA,
    name: "Cabinet Test",
    timezone: "Africa/Tunis",
    settings: {
      businessHours: {
        start: "08:00",
        end: "18:00" // Open all day to make tests simple
      }
    }
  });

  const doctorAId = new mongoose.Types.ObjectId().toString();
  await User.create({
    _id: doctorAId,
    tenantId: tA,
    firstName: "Doc",
    lastName: "Test",
    passwordHash: "dummy",
    email: `docA-617-${Date.now()}@test.com`,
    role: "clinic_owner"
  });

  const patientA = await Patient.create({
    tenantId: tA,
    firstName: "Patient", // No name yet
    lastName: "WhatsApp",
    phone: "+33610000000"
  });

  const convA = await Conversation.create({
    tenantId: tA,
    patientId: patientA._id,
    channel: "whatsapp",
    contactWaId: "+33610000000",
    status: "active"
  });

  const mockProvider = new ScriptableMockAIProvider();
  const mockMessaging = new NoOpMessagingProvider();
  const aiService = new AIService(mockProvider);
  const aiAutoBookingService = new AIAutoBookingService(aiService, mockMessaging);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ ${testName} PASSED`);
      passed++;
    } else {
      console.error(`❌ ${testName} FAILED`);
      failed++;
    }
  }

  console.log("\n🧪 Starting Phase 6.17 — Temporal & Identity Tests...");

  // ---------------------------------------------------------
  // PART 1: Temporal Date+Time P0 fix
  // ---------------------------------------------------------

  // Helper to test past/future logic in createAppointment
  const now = nowInTimezone("Africa/Tunis");
  const todayDate = new Date(now.date);
  const todayIso = todayDate.toISOString().slice(0, 10);
  
  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowIso = tomorrowDate.toISOString().slice(0, 10);

  const yesterdayDate = new Date(todayDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayIso = yesterdayDate.toISOString().slice(0, 10);

  const futureTime = "23:59";
  const pastTime = "00:00"; // Assuming tests don't run exactly at midnight

  console.log("\n▶ TESTS TEMPORAL (appointment.service)");

  // 1. Yesterday is always PAST
  try {
    await appointmentService.createAppointment({
      patientId: patientA._id as any,
      date: yesterdayIso,
      startTime: "12:00",
      endTime: "12:30",
      durationMin: 30,
      treatment: "Consultation",
      status: "scheduled"
    }, tA);
    assert(false, "Test 1: Yesterday should be rejected as PAST");
  } catch (err: any) {
    assert(err.message.includes("Past_Date_Error"), "Test 1: Yesterday rejected correctly");
  }

  // 2. Today past time is PAST
  try {
    await appointmentService.createAppointment({
      patientId: patientA._id as any,
      date: todayIso,
      startTime: pastTime,
      endTime: "00:30",
      durationMin: 30,
      treatment: "Consultation",
      status: "scheduled"
    }, tA);
    assert(false, `Test 2: Today ${pastTime} should be rejected as PAST`);
  } catch (err: any) {
    assert(err.message.includes("Past_Date_Error"), `Test 2: Today ${pastTime} rejected correctly`);
  }

  // 3. Tomorrow past time is FUTURE (BUG FIX)
  try {
    const appt = await appointmentService.createAppointment({
      patientId: patientA._id as any,
      date: tomorrowIso,
      startTime: pastTime,
      endTime: "00:30",
      durationMin: 30,
      treatment: "Consultation",
      status: "scheduled"
    }, tA);
    assert(!!appt, `Test 3: Tomorrow ${pastTime} accepted correctly as FUTURE`);
    await Appointment.findByIdAndDelete(appt._id);
  } catch (err: any) {
    assert(false, `Test 3: Tomorrow ${pastTime} rejected incorrectly: ${err.message}`);
  }

  // ---------------------------------------------------------
  // PART 2: Patient Identity Enforcement
  // ---------------------------------------------------------
  console.log("\n▶ TESTS IDENTITY (ai.auto-booking.service)");

  // Add dummy message to fulfill the inbound requirement
  await Message.create({
    tenantId: tA,
    conversationId: convA._id,
    direction: "inbound",
    status: "received",
    content: "Je prends 10h demain",
    providerMessageId: "msg1"
  });

  // 4. Booking without name → Should save pending intent and ask name
  mockProvider.responses = [
    JSON.stringify({
      reply: "Parfait",
      intent: "appointment_confirmation",
      action: { type: "book_appointment", targetId: "self", reason: "test", confidence: 1, booking: { date: tomorrowIso, startTime: "10:00", durationMin: 30, treatment: "Consultation" } }
    })
  ];

  await aiAutoBookingService.processInboundMessage(tA, convA._id.toString(), "msg1");
  const convAfterNoName = await Conversation.findById(convA._id).lean();
  console.log("DEBUG convAfterNoName:", JSON.stringify(convAfterNoName, null, 2));
  
  const apptsAfterNoName = await Appointment.find({ patientId: patientA._id }).lean();
  
  assert(apptsAfterNoName.length === 0, "Test 4: No appointment created when name is missing");
  assert(!!convAfterNoName?.pendingBookingIntent?.awaitingIdentity, "Test 5: pendingBookingIntent saved correctly");
  assert(convAfterNoName?.pendingBookingIntent?.startTime === "10:00", "Test 6: pending intent time matches");

  // 5. Patient provides name → Should resume booking and create appointment
  await Message.create({
    tenantId: tA,
    conversationId: convA._id,
    direction: "inbound",
    status: "received",
    content: "Jas Hamila",
    providerMessageId: "msg2"
  });

  mockProvider.reset();
  mockProvider.responses = [
    JSON.stringify({
      reply: "D'accord",
      intent: "general_question",
      patientInfo: { firstName: "Jas", lastName: "Hamila" }
    })
  ];
  
  await aiAutoBookingService.processInboundMessage(tA, convA._id.toString(), "msg2");
  const convAfterName = await Conversation.findById(convA._id).lean();
  const apptsAfterName = await Appointment.find({ patientId: patientA._id }).lean();
  const patientAfter = await Patient.findById(patientA._id).lean();

  assert(apptsAfterName.length === 1, "Test 7: Appointment created automatically after name provided");
  assert(!convAfterName?.pendingBookingIntent, "Test 8: pendingBookingIntent cleared after success");
  assert((patientAfter as any)?.firstName === "Jas", "Test 9: Patient profile updated");
  assert(apptsAfterName[0]?.startTime === "10:00", "Test 10: Booked correct time");

  // Cleanup for next test
  await Appointment.deleteMany({ patientId: patientA._id });
  
  // 6. Availability check without name → Should NOT ask for name
  await Patient.findByIdAndUpdate(patientA._id, { firstName: "Patient", lastName: "WhatsApp" }); // Reset name
  
  mockProvider.reset();
  mockProvider.responses = [
    JSON.stringify({
      reply: "Dispo à 10h et 11h",
      intent: "appointment_availability",
      scheduling: { date: tomorrowIso, durationMin: 30 }
    })
  ];
  
  await aiAutoBookingService.processInboundMessage(tA, convA._id.toString(), "msg3");
  
  const convAfterAvail = await Conversation.findById(convA._id).lean();
  assert(!convAfterAvail?.pendingBookingIntent, "Test 11: No pending intent for availability checks");

  // 7. Booking with name already present → Should book directly
  await Patient.findByIdAndUpdate(patientA._id, { firstName: "Existing", lastName: "Name" });
  
  mockProvider.reset();
  mockProvider.responses = [
    JSON.stringify({
      reply: "C'est noté",
      intent: "appointment_confirmation",
      action: { type: "book_appointment", targetId: "self", reason: "test", confidence: 1, booking: { date: tomorrowIso, startTime: "08:00", durationMin: 30, treatment: "Consultation" } }
    })
  ];
  
  await aiAutoBookingService.processInboundMessage(tA, convA._id.toString(), "msg4");
  const apptsAfterDirect = await Appointment.find({ patientId: patientA._id }).lean();
  assert(apptsAfterDirect.length === 1 && apptsAfterDirect[0].startTime === "08:00", "Test 12: Booked directly when name is known");

  // ---------------------------------------------------------
  // TEST 13 — REGRESSION: Split business hours — 12:49 → 14:00 must be FUTURE
  // Scenario: Clinic hours 08:30-12:30 and 14:00-18:00.
  // At 12:49, the morning session is over but 14:00 is still FUTURE.
  // The backend must NOT reject a 14:00 slot with Past_Date_Error.
  // ---------------------------------------------------------
  console.log("\n▶ TEST 13 — REGRESSION: Split hours, 12:49 → 14:00 must be FUTURE");

  {
    // Create a tenant with split hours (08:30-12:30 and 14:00-18:00)
    const tSplit = new mongoose.Types.ObjectId().toString();
    await Tenant.create({
      _id: tSplit,
      name: "Cabinet Split Horaires",
      timezone: "Africa/Tunis",
      settings: {
        businessHours: {
          monday:    [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:00" }],
          tuesday:   [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:00" }],
          wednesday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:00" }],
          thursday:  [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:00" }],
          friday:    [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:00" }],
          saturday:  [],
          sunday:    [],
        }
      }
    });

    const doctorSplit = new mongoose.Types.ObjectId().toString();
    await User.create({
      _id: doctorSplit,
      tenantId: tSplit,
      firstName: "Doc", lastName: "Split",
      passwordHash: "dummy",
      email: `doc-split-${Date.now()}@test.com`,
      role: "clinic_owner"
    });

    const patientSplit = await Patient.create({
      tenantId: tSplit,
      firstName: "Ali", lastName: "Ben",
      phone: "+21612345678"
    });

    // Simulate: current tenant timezone time = 12:49, today is a weekday
    // We inject a fake "now" that is 12:49 in Africa/Tunis to test the boundary.
    // Since appointmentService uses the real clock, we test with a future time
    // that is strictly AFTER now (14:00 today).
    // If the real clock is past 14:00, use a future date for the test slot.
    const nowForTest = nowInTimezone("Africa/Tunis");
    const nowMins = nowForTest.hours * 60 + nowForTest.minutes;
    const slot1400 = 14 * 60; // 14:00 = 840 mins

    // Find a weekday for today to check if 14:00 would be valid
    // We test the service logic directly: 14:00 > current time → must succeed
    // If current time is past 18:00, skip with a note (edge case: tests run late)
    if (nowMins < slot1400) {
      // Current time is before 14:00 — slot at 14:00 today must be accepted
      try {
        const apptSplit = await appointmentService.createAppointment({
          patientId: patientSplit._id as any,
          date: todayIso,
          startTime: "14:00",
          endTime: "14:30",
          durationMin: 30,
          treatment: "Consultation",
          status: "scheduled"
        }, tSplit);
        assert(!!apptSplit, "Test 13a: Slot 14:00 today is FUTURE when current time < 14:00 — accepted correctly");
        await Appointment.findByIdAndDelete(apptSplit._id);
      } catch (err: any) {
        assert(false, `Test 13a: Slot 14:00 today INCORRECTLY rejected when time is ${nowForTest.hours}:${String(nowForTest.minutes).padStart(2,"0")}: ${err.message}`);
      }
    } else if (nowMins >= slot1400 && nowMins < 18 * 60) {
      // Current time is between 14:00 and 18:00 — 14:00 is in the past, should be rejected
      try {
        await appointmentService.createAppointment({
          patientId: patientSplit._id as any,
          date: todayIso,
          startTime: "14:00",
          endTime: "14:30",
          durationMin: 30,
          treatment: "Consultation",
          status: "scheduled"
        }, tSplit);
        assert(false, "Test 13b: Slot 14:00 should be PAST when current time >= 14:00");
      } catch (err: any) {
        assert(err.message.includes("Past_Date_Error"), `Test 13b: Slot 14:00 correctly rejected as PAST when time is ${nowForTest.hours}:${String(nowForTest.minutes).padStart(2,"0")}`);
      }
    } else {
      // After 18:00 — all today slots are past, test with tomorrow's 14:00
      try {
        const apptSplit = await appointmentService.createAppointment({
          patientId: patientSplit._id as any,
          date: tomorrowIso,
          startTime: "14:00",
          endTime: "14:30",
          durationMin: 30,
          treatment: "Consultation",
          status: "scheduled"
        }, tSplit);
        assert(!!apptSplit, "Test 13c: Slot 14:00 tomorrow is always FUTURE — accepted correctly");
        await Appointment.findByIdAndDelete(apptSplit._id);
      } catch (err: any) {
        assert(false, `Test 13c: Slot 14:00 tomorrow INCORRECTLY rejected: ${err.message}`);
      }
    }

    // Split hours: verify getAvailableSlots returns afternoon slots when called at "between sessions" time
    // (14:00 block should be present as candidates even if morning session ended at 12:30)
    const { availabilityService } = await import("../modules/appointments/availability.service");
    const slotsResult = await availabilityService.getAvailableSlots({
      tenantId: tSplit,
      date: tomorrowIso, // Always future → safe to test deterministically
      durationMin: 30,
    });
    const has1400 = slotsResult.slots?.some(s => s.startTime === "14:00");
    assert(
      slotsResult.status === "OPEN_WITH_AVAILABILITY" && !!has1400,
      "Test 13d: getAvailableSlots for tomorrow includes 14:00 slot from afternoon block"
    );

    // Cleanup
    await Tenant.findByIdAndDelete(tSplit);
    await User.findByIdAndDelete(doctorSplit);
    await Patient.findByIdAndDelete(patientSplit._id);
  }

  // ---------------------------------------------------------
  // TEST 14 — REGRESSION 6.17.3: "Ajrd 14h je peux pas venir svp ?"
  // Scenario: current time = 13:18, patient says "today 14h I can't come"
  // Expected:
  //   1. date resolved = today
  //   2. time resolved = 14:00
  //   3. 14:00 is FUTURE (14:00 > 13:18)
  //   4. NOT classified as PAST
  //   5. Real availability for 14:00 is queried (two-pass triggered)
  //   6. Reply does NOT contain "déjà passé" / "créneau passé"
  //   7. Split hours 08:30-12:30 / 14:00-18:00 handled correctly
  // ---------------------------------------------------------
  console.log("\n▶ TEST 14 — REGRESSION 6.17.3: Ajrd 14h je peux pas venir → FUTURE");

  {
    const tSplit14 = new mongoose.Types.ObjectId().toString();
    await Tenant.create({
      _id: tSplit14,
      name: "Cabinet Split 14h",
      timezone: "Africa/Tunis",
      settings: {
        businessHours: {
          monday:    [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:00" }],
          tuesday:   [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:00" }],
          wednesday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:00" }],
          thursday:  [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:00" }],
          friday:    [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:00" }],
          saturday:  [],
          sunday:    [],
        }
      }
    });

    const doctorSplit14 = new mongoose.Types.ObjectId().toString();
    await User.create({
      _id: doctorSplit14,
      tenantId: tSplit14,
      firstName: "Doc", lastName: "Split14",
      passwordHash: "dummy",
      email: `doc-split14-${Date.now()}@test.com`,
      role: "clinic_owner"
    });

    const patientSplit14 = await Patient.create({
      tenantId: tSplit14,
      firstName: "Rami", lastName: "Jlassi",
      phone: "+21698777888"
    });

    const convSplit14 = await Conversation.create({
      tenantId: tSplit14,
      patientId: patientSplit14._id,
      channel: "whatsapp",
      contactWaId: "+21698777888",
      status: "active"
    });

    await Message.create({
      tenantId: tSplit14,
      conversationId: convSplit14._id,
      direction: "inbound",
      status: "received",
      content: "Ajrd 14h je peux pas venir svp ?",
      providerMessageId: `msg-split14-${Date.now()}`
    });

    // The AI (PASS 1) should resolve: date=today, time=14:00, intent=appointment_availability
    // It must NOT say "déjà passé" because 14:00 > 13:18
    // PASS 2 should return available slots from the afternoon block

    const mockProvider14 = new ScriptableMockAIProvider();
    const aiService14 = new AIService(mockProvider14);

    // PASS 1: AI identifies the intent as appointment_availability with date=today, 14:00
    // (We simulate what a correct AI should output for this input)
    mockProvider14.responses = [
      // PASS 1 — correct classification: today, 14:00, appointment_availability
      JSON.stringify({
        intent: "appointment_availability",
        scheduling: {
          date: todayIso,
          durationMin: 30,
        },
        reply: "Je vérifie la disponibilité pour 14h aujourd'hui...",
        action: null,
        needsHumanEscalation: false
      }),
      // PASS 2 — after backend confirms slots, AI replies with availability
      JSON.stringify({
        intent: "appointment_availability",
        reply: "Oui, 14h00 est disponible aujourd'hui. Souhaitez-vous réserver ce créneau ?",
        action: null,
        needsHumanEscalation: false
      })
    ];

    const result = await aiService14.getSuggestion(tSplit14, convSplit14._id.toString());

    // 1. Two-pass was triggered (slot query happened)
    assert(
      mockProvider14.history.length === 2,
      "Test 14a: Two-pass triggered for today 14:00 appointment_availability"
    );

    // 2. PASS 1 system prompt contains the correct current time
    const pass1SystemMsg = mockProvider14.history[0].find(m => m.role === "system");
    assert(
      !!pass1SystemMsg,
      "Test 14b: System message present in PASS 1"
    );

    // 3. PASS 2 system message contains [SYSTEM] with real slot data (not PAST/FERMÉ)
    const pass2Messages = mockProvider14.history[1];
    const sysUpdateMsg = pass2Messages.find(m => m.role === "system" && m.content.includes("[SYSTEM]"));
    assert(
      !!sysUpdateMsg,
      "Test 14c: [SYSTEM] slot update message present in PASS 2"
    );
    assert(
      !sysUpdateMsg!.content.includes("DÉJÀ PASSÉE") && !sysUpdateMsg!.content.includes("PASSÉE"),
      "Test 14d: PASS 2 [SYSTEM] does NOT say the date is PASSÉE"
    );
    assert(
      !sysUpdateMsg!.content.includes("Le cabinet est FERMÉ"),
      "Test 14e: PASS 2 [SYSTEM] does NOT say the cabinet is FERMÉ for today (has afternoon slots)"
    );

    // 4. The scheduling object in PASS 1 response correctly set date=today
    const pass1AssistantMsg = mockProvider14.history[1].find(m => m.role === "assistant");
    // The assistant PASS 1 reply was our mock — verify PASS 2 input has today's date
    assert(
      pass2Messages.some(m => m.content?.includes(todayIso)),
      "Test 14f: PASS 2 messages reference today's date"
    );

    // 5. Final reply does not contain "déjà passé"
    const finalReply = result.suggestion?.toLowerCase() ?? "";
    assert(
      !finalReply.includes("déjà passé") && !finalReply.includes("créneau passé") && !finalReply.includes("est passé"),
      `Test 14g: Final reply does not say the slot is past. Got: "${result.suggestion}"`
    );

    // 6. Backend availability check: verify 14:00 IS available for today (if today is a weekday before 18:00)
    const nowForTest14 = nowInTimezone("Africa/Tunis");
    const nowMins14 = nowForTest14.hours * 60 + nowForTest14.minutes;
    const slot1400 = 14 * 60;
    const slot1800 = 18 * 60;

    if (nowMins14 < slot1400) {
      // Before 14:00 — 14:00 slot must be FUTURE and bookable
      const { availabilityService: avSvc } = await import("../modules/appointments/availability.service");
      const todaySlotsResult = await avSvc.getAvailableSlots({
        tenantId: tSplit14,
        date: todayIso,
        durationMin: 30,
      });
      const has14Today = todaySlotsResult.slots?.some(s => s.startTime === "14:00");
      assert(
        todaySlotsResult.status !== "PAST",
        `Test 14h: getAvailableSlots for today NOT PAST (got ${todaySlotsResult.status})`
      );
      // If today is a weekday, 14:00 must be in slots
      const todayWeekday = nowForTest14.date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
      if (!["saturday", "sunday"].includes(todayWeekday)) {
        assert(
          !!has14Today,
          `Test 14i: Slot 14:00 available today (weekday before 14:00, split hours)`
        );
      }
    } else if (nowMins14 >= slot1400 && nowMins14 < slot1800) {
      // Between 14:00-18:00 — 14:00 is now past
      const { availabilityService: avSvc } = await import("../modules/appointments/availability.service");
      const todaySlotsResult = await avSvc.getAvailableSlots({
        tenantId: tSplit14,
        date: todayIso,
        durationMin: 30,
      });
      const noSlotBefore14 = !todaySlotsResult.slots?.some(s => {
        const [h, m] = s.startTime.split(":").map(Number);
        return (h * 60 + m) < slot1400;
      });
      assert(
        noSlotBefore14,
        "Test 14h-alt: No slots before 14:00 returned when time is past 14:00"
      );
    }

    // Cleanup
    await Tenant.findByIdAndDelete(tSplit14);
    await User.findByIdAndDelete(doctorSplit14);
    await Patient.findByIdAndDelete(patientSplit14._id);
    await Conversation.findByIdAndDelete(convSplit14._id);
    await Message.deleteMany({ conversationId: convSplit14._id });
  }

  // ---------------------------------------------------------
  // Finish
  // ---------------------------------------------------------


  console.log(`\n═══════════════════════════════════════════════════════`);
  if (failed === 0) {
    console.log(`🎉 ALL PHASE 6.17 TESTS PASSED — ${passed} tests`);
  } else {
    console.log(`❌ ${failed} TESTS FAILED, ${passed} PASSED`);
  }
  console.log(`═══════════════════════════════════════════════════════\n`);

  // Cleanup DB
  await Tenant.findByIdAndDelete(tA);
  await User.findByIdAndDelete(doctorAId);
  await Patient.findByIdAndDelete(patientA._id);
  await Conversation.findByIdAndDelete(convA._id);
  await Message.deleteMany({ conversationId: convA._id });
  await Appointment.deleteMany({ patientId: patientA._id });

  await mongoose.disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
