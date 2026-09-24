/**
 * Phase 6.9 Integration Tests
 * Idempotence, Concurrency, and Resilience of the Auto-Booking system.
 *
 * Tests cover:
 * - Duplicate webhook handling (providerMessageId dedup)
 * - Race condition / double booking protection (MongoDB unique index)
 * - Booking idempotency (retry without creating duplicate appointments)
 * - WhatsApp failure & retry (appointment preserved, message retried)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { communicationService } from "../modules/communications/communication.service";
import { handleWebhookEvent } from "../modules/communications/webhook.controller";
import {
  AIAutoBookingService,
  buildBookingConfirmationMessage,
} from "../modules/ai/ai.auto-booking.service";
import { executeAIAction } from "../modules/ai/ai.action.executor";
import { Patient } from "../modules/patients/patient.model";
import { Tenant } from "../modules/tenants/tenant.model";
import { User } from "../modules/users/user.model";
import { Conversation, Message } from "../modules/communications/communication.model";
import { Appointment } from "../modules/appointments/appointment.model";

// Simple mock for Express Response
class MockResponse {
  statusCode: number = 200;
  body: any = null;
  status(code: number) { this.statusCode = code; return this; }
  send(body: any) { this.body = body; return this; }
  json(body: any) { this.body = body; return this; }
  sendStatus(code: number) { this.statusCode = code; return this; }
}
import { availabilityService } from "../modules/appointments/availability.service";
import { IMessagingProvider } from "../modules/communications/providers/messaging.provider";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/medical-ai-test";

// ─── Stub messaging providers ────────────────────────────────────────────────

const failingProvider: IMessagingProvider = {
  sendMessage: async () => {
    throw new Error("WhatsApp Network Error");
  },
};

const workingProvider: IMessagingProvider = {
  sendMessage: async () => ({ providerMessageId: "meta-wamid-success", status: "sent" } as any),
};

// ─── Test runner ─────────────────────────────────────────────────────────────

async function runPhase69Tests() {
  console.log("🧪 Starting Phase 6.9 — Idempotence, Concurrency & Resilience Tests...");

  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB for Phase 6.9 testing.\n");

    // ── Mock availability to bypass business-hours logic ─────────────────────
    const originalCheck = availabilityService.checkAvailability;
    availabilityService.checkAvailability = async () => true;

    const tenantId = new mongoose.Types.ObjectId().toString();
    const PHONE_NUMBER_ID = `test-pnid-${tenantId}`;

    // ── Clean up only this test's data ────────────────────────────────────────
    await User.deleteMany({ email: `doc-${tenantId}@test.com` });
    await Patient.deleteMany({ tenantId });
    await Conversation.deleteMany({ tenantId });
    await Message.deleteMany({ tenantId });
    await Appointment.deleteMany({ tenantId });

    // ── Seed tenant ──────────────────────────────────────────────────────────
    await Tenant.create({
      _id: new mongoose.Types.ObjectId(tenantId),
      name: "Test Clinic 6.9",
      settings: {
        whatsappConfig: { phoneNumberId: PHONE_NUMBER_ID },
        businessHours: { start: "08:00", end: "18:00" },
      },
    });

    const doctor = await User.create({
      tenantId,
      email: `doc-${tenantId}@test.com`,
      passwordHash: "hash",
      role: "clinic_owner",
      firstName: "Doc",
      lastName: "Main",
    });

    const patientA = await Patient.create({
      tenantId,
      firstName: "Marie",
      lastName: "Curie",
      phone: `+336${tenantId.slice(0, 8)}01`,
    });

    const patientB = await Patient.create({
      tenantId,
      firstName: "Albert",
      lastName: "Einstein",
      phone: `+336${tenantId.slice(0, 8)}02`,
    });

    // Conversations with pendingBookingContext for the concurrent-booking tests
    const pendingCtxA = {
      date: "2026-10-20",
      durationMin: 30,
      proposedSlots: [{ startTime: "10:00", endTime: "10:30" }],
      proposedAt: new Date(),
    };
    const pendingCtxB = {
      date: "2026-10-20", // Same date/time as A — intentional race
      durationMin: 30,
      proposedSlots: [{ startTime: "10:00", endTime: "10:30" }],
      proposedAt: new Date(),
    };

    const conversationA = await Conversation.create({
      tenantId,
      patientId: patientA._id,
      channel: "whatsapp",
      contactWaId: `${patientA.phone}-conv1`,
      pendingBookingContext: pendingCtxA,
    });

    const conversationB = await Conversation.create({
      tenantId,
      patientId: patientB._id,
      channel: "whatsapp",
      contactWaId: `${patientB.phone}-conv1`,
      pendingBookingContext: pendingCtxB,
    });

    // ================================================================
    // TEST 1 — Duplicate Webhook (same providerMessageId)
    // ================================================================
    console.log("▶ TEST 1 — Duplicate Webhook Handling...");

    const waMessageId = `wamid-69-${tenantId}`;
    const webhookPayload = {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          field: "messages",
          value: {
            metadata: { phone_number_id: PHONE_NUMBER_ID },
            messages: [{
              id: waMessageId,
              from: patientA.phone,
              type: "text",
              text: { body: "Bonjour" },
            }],
          },
        }],
      }],
    };

    // Fire the same webhook 3 times (as Meta would when not ack'd)
    await handleWebhookEvent({ body: webhookPayload } as any, new MockResponse() as any);
    await handleWebhookEvent({ body: webhookPayload } as any, new MockResponse() as any);
    await handleWebhookEvent({ body: webhookPayload } as any, new MockResponse() as any);

    const inboundMessages = await Message.find({ tenantId, providerMessageId: waMessageId });
    if (inboundMessages.length !== 1) {
      throw new Error(`TEST 1 FAILED: Expected 1 message, got ${inboundMessages.length}`);
    }
    console.log("✅ TEST 1 PASSED: 3 duplicate webhooks → exactly 1 Message in DB.\n");

    // ================================================================
    // TEST 2 & 3 — Concurrent Double Booking (race condition)
    // ================================================================
    console.log("▶ TEST 2 & 3 — Race Condition / Double Booking Protection...");

    const raceBookingA = executeAIAction(tenantId, conversationA._id.toString(), {
      type: "book_appointment",
      targetId: patientA._id.toString(),
      booking: { date: "2026-10-20", startTime: "10:00", durationMin: 30, treatment: "Consultation" },
    });

    const raceBookingB = executeAIAction(tenantId, conversationB._id.toString(), {
      type: "book_appointment",
      targetId: patientB._id.toString(),
      booking: { date: "2026-10-20", startTime: "10:00", durationMin: 30, treatment: "Consultation" },
    });

    const [resA, resB] = await Promise.allSettled([raceBookingA, raceBookingB]);

    let successCount = 0;
    let doubleBookingCount = 0;

    if (resA.status === "fulfilled") successCount++;
    if (resB.status === "fulfilled") successCount++;

    if (resA.status === "rejected") {
      if ((resA.reason as Error).message.includes("SLOT_UNAVAILABLE")) doubleBookingCount++;
      else console.warn("A rejected with unexpected error:", (resA.reason as Error).message);
    }
    if (resB.status === "rejected") {
      if ((resB.reason as Error).message.includes("SLOT_UNAVAILABLE")) doubleBookingCount++;
      else console.warn("B rejected with unexpected error:", (resB.reason as Error).message);
    }

    if (successCount !== 1) throw new Error(`TEST 2 FAILED: Expected 1 success, got ${successCount}`);
    if (doubleBookingCount !== 1) throw new Error(`TEST 3 FAILED: Expected 1 SLOT_UNAVAILABLE, got ${doubleBookingCount}`);

    const sameSlotAppts = await Appointment.find({ tenantId, date: "2026-10-20", startTime: "10:00" });
    if (sameSlotAppts.length !== 1) {
      throw new Error(`TEST 2/3 FAILED: Expected 1 appointment in DB, found ${sameSlotAppts.length}`);
    }
    console.log("✅ TEST 2 PASSED: Exactly 1 booking succeeded concurrently.");
    console.log("✅ TEST 3 PASSED: Double_Booking_Error correctly thrown for the duplicate.\n");

    // ================================================================
    // TEST 4 — Appointment created, WhatsApp fails → message=failed
    // TEST 5 — Retry reuses existing appointment, WhatsApp succeeds
    // ================================================================
    console.log("▶ TEST 4 & 5 — Booking Idempotency & WhatsApp Failure + Retry...");

    const retryDate = "2026-10-21";
    const retryStartTime = "14:00";

    const patientRetry = await Patient.create({
      tenantId,
      firstName: "Retry",
      lastName: "Patient",
      phone: "+21699333444",
    });

    // Setup a fresh conversation with proper context
    const conversationRetry = await Conversation.create({
      tenantId,
      patientId: patientRetry._id,
      channel: "whatsapp",
      contactWaId: `${patientRetry.phone}-retry`,
      pendingBookingContext: {
        date: retryDate,
        durationMin: 30,
        proposedSlots: [{ startTime: retryStartTime, endTime: "14:30" }],
        proposedAt: new Date(),
      },
    });

    // Mock AI service that always returns a book_appointment for retryDate/retryStartTime
    const mockAiService = {
      getSuggestion: async () => ({
        intent: "book_appointment",
        action: {
          type: "book_appointment",
          targetId: patientRetry._id.toString(),
          booking: {
            date: retryDate,
            startTime: retryStartTime,
            durationMin: 30,
            treatment: "Détartrage",
          },
        },
      }),
    };

    // First run — WhatsApp will fail
    const svcWithFail = new AIAutoBookingService(mockAiService as any, failingProvider);
    await svcWithFail.processInboundMessage(tenantId, conversationRetry._id.toString());

    // Verify appointment WAS created
    const apptAfterFail = await Appointment.findOne({ tenantId, date: retryDate, startTime: retryStartTime });
    if (!apptAfterFail) throw new Error("TEST 4 FAILED: Appointment was not created on first run");

    // Verify the outbound message was persisted as 'failed'
    const deterministicId = `auto-booking-confirm-${apptAfterFail._id.toString()}`;
    const failedMsg = await Message.findOne({ providerMessageId: deterministicId });
    if (!failedMsg || failedMsg.status !== "failed") {
      throw new Error(`TEST 4 FAILED: Expected failed message, got: ${failedMsg?.status ?? "not found"}`);
    }
    console.log("✅ TEST 4 PASSED: Appointment created, WhatsApp failed → message persisted as 'failed'.");

    // Second run — Working WhatsApp, should reuse appointment (NOT create a new one)
    const svcWorking = new AIAutoBookingService(mockAiService as any, workingProvider);
    await svcWorking.processInboundMessage(tenantId, conversationRetry._id.toString());

    // Verify still only 1 appointment
    const apptCountAfterRetry = await Appointment.countDocuments({ tenantId, date: retryDate, startTime: retryStartTime });
    if (apptCountAfterRetry !== 1) {
      throw new Error(`TEST 5 FAILED: Expected 1 appointment after retry, found ${apptCountAfterRetry}`);
    }

    // Verify message is now 'sent'
    const sentMsg = await Message.findOne({ providerMessageId: deterministicId });
    if (!sentMsg || sentMsg.status !== "sent") {
      throw new Error(`TEST 5 FAILED: Expected message status 'sent', got '${sentMsg?.status}'`);
    }
    console.log("✅ TEST 5 PASSED: Retry reused existing appointment, WhatsApp sent → message updated to 'sent'.\n");

    // ================================================================
    // TEST 6 — No false confirmation on Double_Booking_Error
    // ================================================================
    console.log("▶ TEST 6 — No False Confirmation on Double_Booking_Error...");

    const dupDate = "2026-10-22";
    const dupTime = "09:00";

    // Pre-create an appointment for patientA on that slot
    await Appointment.create({
      tenantId,
      patientId: patientA._id,
      doctorId: doctor._id.toString(),
      date: dupDate,
      startTime: dupTime,
      endTime: "09:30",
      durationMin: 30,
      treatment: "Existing",
      status: "scheduled",
    });

    // Now patientB tries to book the same slot
    const convDup = await Conversation.create({
      tenantId,
      patientId: patientB._id,
      channel: "whatsapp",
      contactWaId: `${patientB.phone}-dup`,
      pendingBookingContext: {
        date: dupDate,
        durationMin: 30,
        proposedSlots: [{ startTime: dupTime, endTime: "09:30" }],
        proposedAt: new Date(),
      },
    });

    const dupAiService = {
      getSuggestion: async () => ({
        intent: "book_appointment",
        action: {
          type: "book_appointment",
          targetId: patientB._id.toString(),
          booking: { date: dupDate, startTime: dupTime, durationMin: 30, treatment: "Consultation" },
        },
      }),
    };

    // Track WhatsApp calls
    const sentMessages: any[] = [];
    const trackingProvider: IMessagingProvider = {
      sendMessage: async (params: any) => {
        sentMessages.push(params);
        return { providerMessageId: "track-wamid", status: "sent" } as any;
      },
    };

    const svcDup = new AIAutoBookingService(dupAiService as any, trackingProvider);
    await svcDup.processInboundMessage(tenantId, convDup._id.toString());

    // PatientB should NOT have received a booking confirmation
    const falseConfirmation = sentMessages.find(
      (m) => m.content && (m.content.includes("Votre rendez-vous est confirmé") || m.content.includes("confirmé pour le"))
    );
    if (falseConfirmation) {
      throw new Error(`TEST 6 FAILED: False confirmation sent to Patient B: ${falseConfirmation.content}`);
    }

    const apptCountPatientB = await Appointment.countDocuments({ tenantId, patientId: patientB._id, date: dupDate });
    if (apptCountPatientB !== 0) {
      throw new Error(`TEST 6 FAILED: PatientB should have 0 appointments for that slot, got ${apptCountPatientB}`);
    }
    console.log("✅ TEST 6 PASSED: Double_Booking_Error caught, no false confirmation sent to Patient B.\n");

    // ================================================================
    // TEST 7 — pendingBookingContext slot validation blocks wrong slots
    // ================================================================
    console.log("▶ TEST 7 — PendingBookingContext Slot Validation...");

    const patientBadSlot = await Patient.create({
      tenantId,
      firstName: "BadSlot",
      lastName: "Patient",
      phone: "+21699555666",
    });

    const convBadSlot = await Conversation.create({
      tenantId,
      patientId: patientBadSlot._id,
      channel: "whatsapp",
      contactWaId: `${patientBadSlot.phone}-badslot`,
      pendingBookingContext: {
        date: "2026-10-23",
        durationMin: 30,
        proposedSlots: [{ startTime: "10:00", endTime: "10:30" }], // Only 10:00 was proposed
        proposedAt: new Date(),
      },
    });

    const wrongSlotAI = {
      getSuggestion: async () => ({
        intent: "book_appointment",
        action: {
          type: "book_appointment",
          targetId: patientBadSlot._id.toString(),
          booking: { date: "2026-10-23", startTime: "15:00", durationMin: 30, treatment: "Test" }, // 15:00 was NOT proposed
        },
      }),
    };

    let wrongSlotWaCalls = 0;
    const wrongSlotProvider: IMessagingProvider = {
      sendMessage: async () => { wrongSlotWaCalls++; return { providerMessageId: "ws", status: "sent" } as any; },
    };

    const svcBadSlot = new AIAutoBookingService(wrongSlotAI as any, wrongSlotProvider);
    await svcBadSlot.processInboundMessage(tenantId, convBadSlot._id.toString());

    const badSlotAppts = await Appointment.countDocuments({ tenantId, date: "2026-10-23", startTime: "15:00" });
    if (badSlotAppts > 0 || wrongSlotWaCalls > 0) {
      throw new Error(`TEST 7 FAILED: Booking proceeded for an unproposed slot!`);
    }
    console.log("✅ TEST 7 PASSED: Unproposed slot correctly rejected, no booking, no WhatsApp sent.\n");

    // ================================================================
    // TESTS 8–10 — Regression: tenant isolation, patientId from conversation
    // ================================================================
    console.log("▶ TEST 8 — Cross-Tenant Booking Isolation...");

    const otherTenantId = new mongoose.Types.ObjectId().toString();
    await Tenant.create({
      _id: new mongoose.Types.ObjectId(otherTenantId),
      name: "Other Clinic",
      settings: { whatsappConfig: { phoneNumberId: "other-pnid" }, businessHours: { start: "08:00", end: "18:00" } },
    });

    await User.create({
      tenantId: otherTenantId,
      email: `doc-${otherTenantId}@test.com`,
      passwordHash: "hash",
      role: "clinic_owner",
      firstName: "Other",
      lastName: "Doc",
    });

    // Try to book with otherTenantId but use conversationA (tenantId)
    let crossTenantThrew = false;
    try {
      await executeAIAction(otherTenantId, conversationA._id.toString(), {
        type: "book_appointment",
        targetId: patientA._id.toString(),
        booking: { date: "2026-10-25", startTime: "10:00", durationMin: 30, treatment: "Cross" },
      });
    } catch {
      crossTenantThrew = true;
    }

    if (!crossTenantThrew) {
      throw new Error("TEST 8 FAILED: Cross-tenant booking was NOT rejected");
    }
    console.log("✅ TEST 8 PASSED: Cross-tenant booking correctly rejected.\n");

    console.log("▶ TEST 9 — Missing Treatment Blocked...");
    const convMissingTreatment = await Conversation.create({
      tenantId,
      patientId: patientA._id,
      channel: "whatsapp",
      contactWaId: `${patientA.phone}-notreat`,
      pendingBookingContext: {
        date: "2026-10-26",
        durationMin: 30,
        proposedSlots: [{ startTime: "10:00", endTime: "10:30" }],
        proposedAt: new Date(),
      },
    });

    let noTreatmentThrew = false;
    try {
      await executeAIAction(tenantId, convMissingTreatment._id.toString(), {
        type: "book_appointment",
        targetId: patientA._id.toString(),
        booking: { date: "2026-10-26", startTime: "10:00", durationMin: 30, treatment: "" },
      });
    } catch (err: any) {
      if (err.message.includes("treatment")) noTreatmentThrew = true;
    }

    if (!noTreatmentThrew) {
      throw new Error("TEST 9 FAILED: Missing treatment was not rejected");
    }
    console.log("✅ TEST 9 PASSED: Empty treatment correctly blocked.\n");

    // ================================================================
    // TEST 10 — Multiple dentists: automatic booking REFUSED (no arbitrary pick)
    // ================================================================
    console.log("▶ TEST 10 — Multiple Dentists Refuse Auto-Booking...");
    const tenantMulti = new mongoose.Types.ObjectId().toString();
    await Tenant.create({
      _id: new mongoose.Types.ObjectId(tenantMulti),
      name: "Multi-Dentist Clinic",
      settings: { whatsappConfig: { phoneNumberId: "multi-pnid" }, businessHours: { start: "08:00", end: "18:00" } },
    });
    // NO clinic_owner — TWO dentists: unique doctor cannot be determined
    for (const [fn, em] of [["Alice", `multi-a-${tenantMulti}@test.com`], ["Bob", `multi-b-${tenantMulti}@test.com`]] as const) {
      await User.create({ tenantId: tenantMulti, email: em, passwordHash: "hash", role: "dentist", firstName: fn, lastName: "Dent" });
    }
    const patientMulti = await Patient.create({ tenantId: tenantMulti, firstName: "Multi", lastName: "Patient", phone: `+336${tenantMulti.slice(0, 8)}03` });
    const convMulti = await Conversation.create({
      tenantId: tenantMulti,
      patientId: patientMulti._id,
      channel: "whatsapp",
      contactWaId: `${patientMulti.phone}-multi`,
    });

    let multiThrew = false;
    try {
      await executeAIAction(tenantMulti, convMulti._id.toString(), {
        type: "book_appointment",
        targetId: patientMulti._id.toString(),
        booking: { date: "2026-10-27", startTime: "10:00", durationMin: 30, treatment: "Checkup" },
      });
    } catch (err: any) {
      if (err.message.includes("Multiple dentists")) multiThrew = true;
    }
    if (!multiThrew) {
      throw new Error("TEST 10 FAILED: Booking with multiple dentists was NOT refused");
    }
    const multiAppts = await Appointment.countDocuments({ tenantId: tenantMulti, date: "2026-10-27" });
    if (multiAppts !== 0) {
      throw new Error(`TEST 10 FAILED: Appointment created despite ambiguous doctor (count=${multiAppts})`);
    }
    console.log("✅ TEST 10 PASSED: Multiple dentists refuse auto-booking, no appointment, no arbitrary pick.\n");

    // ================================================================
    // Summary
    // ================================================================
    console.log("═══════════════════════════════════════════════════════");
    console.log("🎉 ALL PHASE 6.9 TESTS PASSED — 10/10");
    console.log("═══════════════════════════════════════════════════════");

    // Restore mock
    availabilityService.checkAvailability = originalCheck;

  } catch (error: any) {
    console.error("\n❌ PHASE 6.9 TEST SUITE FAILED:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runPhase69Tests();
