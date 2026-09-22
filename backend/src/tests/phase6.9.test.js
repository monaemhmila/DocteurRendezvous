"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const communication_service_1 = require("../modules/communications/communication.service");
const ai_auto_booking_service_1 = require("../modules/ai/ai.auto-booking.service");
const ai_action_executor_1 = require("../modules/ai/ai.action.executor");
const patient_model_1 = require("../modules/patients/patient.model");
const tenant_model_1 = require("../modules/tenants/tenant.model");
const user_model_1 = require("../modules/users/user.model");
const communication_model_1 = require("../modules/communications/communication.model");
const appointment_model_1 = require("../modules/appointments/appointment.model");
const availability_service_1 = require("../modules/appointments/availability.service");
dotenv_1.default.config();
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/medical-ai-test";
// ─── Stub messaging providers ────────────────────────────────────────────────
const failingProvider = {
    sendMessage: async () => {
        throw new Error("WhatsApp Network Error");
    },
};
const workingProvider = {
    sendMessage: async () => ({ providerMessageId: "meta-wamid-success", status: "sent" }),
};
// ─── Test runner ─────────────────────────────────────────────────────────────
async function runPhase69Tests() {
    console.log("🧪 Starting Phase 6.9 — Idempotence, Concurrency & Resilience Tests...");
    try {
        await mongoose_1.default.connect(MONGO_URI);
        console.log("Connected to MongoDB for Phase 6.9 testing.\n");
        // ── Mock availability to bypass business-hours logic ─────────────────────
        const originalCheck = availability_service_1.availabilityService.checkAvailability;
        availability_service_1.availabilityService.checkAvailability = async () => true;
        const tenantId = new mongoose_1.default.Types.ObjectId().toString();
        const PHONE_NUMBER_ID = `test-pnid-${tenantId}`;
        // ── Clean up only this test's data ────────────────────────────────────────
        await user_model_1.User.deleteMany({ email: `doc-${tenantId}@test.com` });
        await patient_model_1.Patient.deleteMany({ tenantId });
        await communication_model_1.Conversation.deleteMany({ tenantId });
        await communication_model_1.Message.deleteMany({ tenantId });
        await appointment_model_1.Appointment.deleteMany({ tenantId });
        // ── Seed tenant ──────────────────────────────────────────────────────────
        await tenant_model_1.Tenant.create({
            _id: new mongoose_1.default.Types.ObjectId(tenantId),
            name: "Test Clinic 6.9",
            settings: {
                whatsappConfig: { phoneNumberId: PHONE_NUMBER_ID },
                businessHours: { start: "08:00", end: "18:00" },
            },
        });
        const doctor = await user_model_1.User.create({
            tenantId,
            email: `doc-${tenantId}@test.com`,
            passwordHash: "hash",
            role: "clinic_owner",
            firstName: "Doc",
            lastName: "Main",
        });
        const patientA = await patient_model_1.Patient.create({
            tenantId,
            firstName: "Marie",
            lastName: "Curie",
            phone: `+336${tenantId.slice(0, 8)}01`,
        });
        const patientB = await patient_model_1.Patient.create({
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
        const conversationA = await communication_model_1.Conversation.create({
            tenantId,
            patientId: patientA._id,
            channel: "whatsapp",
            contactWaId: `${patientA.phone}-conv1`,
            pendingBookingContext: pendingCtxA,
        });
        const conversationB = await communication_model_1.Conversation.create({
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
        await communication_service_1.communicationService.handleWebhook(webhookPayload);
        await communication_service_1.communicationService.handleWebhook(webhookPayload);
        await communication_service_1.communicationService.handleWebhook(webhookPayload);
        const inboundMessages = await communication_model_1.Message.find({ tenantId, providerMessageId: waMessageId });
        if (inboundMessages.length !== 1) {
            throw new Error(`TEST 1 FAILED: Expected 1 message, got ${inboundMessages.length}`);
        }
        console.log("✅ TEST 1 PASSED: 3 duplicate webhooks → exactly 1 Message in DB.\n");
        // ================================================================
        // TEST 2 & 3 — Concurrent Double Booking (race condition)
        // ================================================================
        console.log("▶ TEST 2 & 3 — Race Condition / Double Booking Protection...");
        const raceBookingA = (0, ai_action_executor_1.executeAIAction)(tenantId, conversationA._id.toString(), {
            type: "book_appointment",
            targetId: patientA._id.toString(),
            booking: { date: "2026-10-20", startTime: "10:00", durationMin: 30, treatment: "Consultation" },
        });
        const raceBookingB = (0, ai_action_executor_1.executeAIAction)(tenantId, conversationB._id.toString(), {
            type: "book_appointment",
            targetId: patientB._id.toString(),
            booking: { date: "2026-10-20", startTime: "10:00", durationMin: 30, treatment: "Consultation" },
        });
        const [resA, resB] = await Promise.allSettled([raceBookingA, raceBookingB]);
        let successCount = 0;
        let doubleBookingCount = 0;
        if (resA.status === "fulfilled")
            successCount++;
        if (resB.status === "fulfilled")
            successCount++;
        if (resA.status === "rejected") {
            if (resA.reason.message.includes("Double_Booking_Error"))
                doubleBookingCount++;
            else
                console.warn("A rejected with unexpected error:", resA.reason.message);
        }
        if (resB.status === "rejected") {
            if (resB.reason.message.includes("Double_Booking_Error"))
                doubleBookingCount++;
            else
                console.warn("B rejected with unexpected error:", resB.reason.message);
        }
        if (successCount !== 1)
            throw new Error(`TEST 2 FAILED: Expected 1 success, got ${successCount}`);
        if (doubleBookingCount !== 1)
            throw new Error(`TEST 3 FAILED: Expected 1 Double_Booking_Error, got ${doubleBookingCount}`);
        const sameSlotAppts = await appointment_model_1.Appointment.find({ tenantId, date: "2026-10-20", startTime: "10:00" });
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
        // Setup a fresh conversation with proper context
        const conversationRetry = await communication_model_1.Conversation.create({
            tenantId,
            patientId: patientA._id,
            channel: "whatsapp",
            contactWaId: `${patientA.phone}-retry`,
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
                    targetId: patientA._id.toString(),
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
        const svcWithFail = new ai_auto_booking_service_1.AIAutoBookingService(mockAiService, failingProvider);
        await svcWithFail.processInboundMessage(tenantId, conversationRetry._id.toString());
        // Verify appointment WAS created
        const apptAfterFail = await appointment_model_1.Appointment.findOne({ tenantId, date: retryDate, startTime: retryStartTime });
        if (!apptAfterFail)
            throw new Error("TEST 4 FAILED: Appointment was not created on first run");
        // Verify the outbound message was persisted as 'failed'
        const deterministicId = `auto-booking-confirm-${apptAfterFail._id.toString()}`;
        const failedMsg = await communication_model_1.Message.findOne({ providerMessageId: deterministicId });
        if (!failedMsg || failedMsg.status !== "failed") {
            throw new Error(`TEST 4 FAILED: Expected failed message, got: ${failedMsg?.status ?? "not found"}`);
        }
        console.log("✅ TEST 4 PASSED: Appointment created, WhatsApp failed → message persisted as 'failed'.");
        // Second run — Working WhatsApp, should reuse appointment (NOT create a new one)
        const svcWorking = new ai_auto_booking_service_1.AIAutoBookingService(mockAiService, workingProvider);
        await svcWorking.processInboundMessage(tenantId, conversationRetry._id.toString());
        // Verify still only 1 appointment
        const apptCountAfterRetry = await appointment_model_1.Appointment.countDocuments({ tenantId, date: retryDate, startTime: retryStartTime });
        if (apptCountAfterRetry !== 1) {
            throw new Error(`TEST 5 FAILED: Expected 1 appointment after retry, found ${apptCountAfterRetry}`);
        }
        // Verify message is now 'sent'
        const sentMsg = await communication_model_1.Message.findOne({ providerMessageId: deterministicId });
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
        await appointment_model_1.Appointment.create({
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
        const convDup = await communication_model_1.Conversation.create({
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
        let whatsappCallCount = 0;
        const trackingProvider = {
            sendMessage: async () => {
                whatsappCallCount++;
                return { providerMessageId: "track-wamid", status: "sent" };
            },
        };
        const svcDup = new ai_auto_booking_service_1.AIAutoBookingService(dupAiService, trackingProvider);
        await svcDup.processInboundMessage(tenantId, convDup._id.toString());
        // PatientB should NOT have received a confirmation (Double_Booking_Error path)
        if (whatsappCallCount > 0) {
            throw new Error(`TEST 6 FAILED: WhatsApp was called ${whatsappCallCount} times — false confirmation sent!`);
        }
        const apptCountPatientB = await appointment_model_1.Appointment.countDocuments({ tenantId, patientId: patientB._id, date: dupDate });
        if (apptCountPatientB !== 0) {
            throw new Error(`TEST 6 FAILED: PatientB should have 0 appointments for that slot, got ${apptCountPatientB}`);
        }
        console.log("✅ TEST 6 PASSED: Double_Booking_Error caught, no false confirmation sent to Patient B.\n");
        // ================================================================
        // TEST 7 — pendingBookingContext slot validation blocks wrong slots
        // ================================================================
        console.log("▶ TEST 7 — PendingBookingContext Slot Validation...");
        const convBadSlot = await communication_model_1.Conversation.create({
            tenantId,
            patientId: patientA._id,
            channel: "whatsapp",
            contactWaId: `${patientA.phone}-badslot`,
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
                    targetId: patientA._id.toString(),
                    booking: { date: "2026-10-23", startTime: "15:00", durationMin: 30, treatment: "Test" }, // 15:00 was NOT proposed
                },
            }),
        };
        let wrongSlotWaCalls = 0;
        const wrongSlotProvider = {
            sendMessage: async () => { wrongSlotWaCalls++; return { providerMessageId: "ws", status: "sent" }; },
        };
        const svcBadSlot = new ai_auto_booking_service_1.AIAutoBookingService(wrongSlotAI, wrongSlotProvider);
        await svcBadSlot.processInboundMessage(tenantId, convBadSlot._id.toString());
        const badSlotAppts = await appointment_model_1.Appointment.countDocuments({ tenantId, date: "2026-10-23", startTime: "15:00" });
        if (badSlotAppts > 0 || wrongSlotWaCalls > 0) {
            throw new Error(`TEST 7 FAILED: Booking proceeded for an unproposed slot!`);
        }
        console.log("✅ TEST 7 PASSED: Unproposed slot correctly rejected, no booking, no WhatsApp sent.\n");
        // ================================================================
        // TESTS 8–10 — Regression: tenant isolation, patientId from conversation
        // ================================================================
        console.log("▶ TEST 8 — Cross-Tenant Booking Isolation...");
        const otherTenantId = new mongoose_1.default.Types.ObjectId().toString();
        await tenant_model_1.Tenant.create({
            _id: new mongoose_1.default.Types.ObjectId(otherTenantId),
            name: "Other Clinic",
            settings: { whatsappConfig: { phoneNumberId: "other-pnid" }, businessHours: { start: "08:00", end: "18:00" } },
        });
        await user_model_1.User.create({
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
            await (0, ai_action_executor_1.executeAIAction)(otherTenantId, conversationA._id.toString(), {
                type: "book_appointment",
                targetId: patientA._id.toString(),
                booking: { date: "2026-10-25", startTime: "10:00", durationMin: 30, treatment: "Cross" },
            });
        }
        catch {
            crossTenantThrew = true;
        }
        if (!crossTenantThrew) {
            throw new Error("TEST 8 FAILED: Cross-tenant booking was NOT rejected");
        }
        console.log("✅ TEST 8 PASSED: Cross-tenant booking correctly rejected.\n");
        console.log("▶ TEST 9 — Missing Treatment Blocked...");
        const convMissingTreatment = await communication_model_1.Conversation.create({
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
            await (0, ai_action_executor_1.executeAIAction)(tenantId, convMissingTreatment._id.toString(), {
                type: "book_appointment",
                targetId: patientA._id.toString(),
                booking: { date: "2026-10-26", startTime: "10:00", durationMin: 30, treatment: "" },
            });
        }
        catch (err) {
            if (err.message.includes("treatment"))
                noTreatmentThrew = true;
        }
        if (!noTreatmentThrew) {
            throw new Error("TEST 9 FAILED: Missing treatment was not rejected");
        }
        console.log("✅ TEST 9 PASSED: Empty treatment correctly blocked.\n");
        // ================================================================
        // TEST 10 — Multiple dentists: automatic booking REFUSED (no arbitrary pick)
        // ================================================================
        console.log("▶ TEST 10 — Multiple Dentists Refuse Auto-Booking...");
        const tenantMulti = new mongoose_1.default.Types.ObjectId().toString();
        await tenant_model_1.Tenant.create({
            _id: new mongoose_1.default.Types.ObjectId(tenantMulti),
            name: "Multi-Dentist Clinic",
            settings: { whatsappConfig: { phoneNumberId: "multi-pnid" }, businessHours: { start: "08:00", end: "18:00" } },
        });
        // NO clinic_owner — TWO dentists: unique doctor cannot be determined
        for (const [fn, em] of [["Alice", `multi-a-${tenantMulti}@test.com`], ["Bob", `multi-b-${tenantMulti}@test.com`]]) {
            await user_model_1.User.create({ tenantId: tenantMulti, email: em, passwordHash: "hash", role: "dentist", firstName: fn, lastName: "Dent" });
        }
        const patientMulti = await patient_model_1.Patient.create({ tenantId: tenantMulti, firstName: "Multi", lastName: "Patient", phone: `+336${tenantMulti.slice(0, 8)}03` });
        const convMulti = await communication_model_1.Conversation.create({
            tenantId: tenantMulti,
            patientId: patientMulti._id,
            channel: "whatsapp",
            contactWaId: `${patientMulti.phone}-multi`,
        });
        let multiThrew = false;
        try {
            await (0, ai_action_executor_1.executeAIAction)(tenantMulti, convMulti._id.toString(), {
                type: "book_appointment",
                targetId: patientMulti._id.toString(),
                booking: { date: "2026-10-27", startTime: "10:00", durationMin: 30, treatment: "Checkup" },
            });
        }
        catch (err) {
            if (err.message.includes("Multiple dentists"))
                multiThrew = true;
        }
        if (!multiThrew) {
            throw new Error("TEST 10 FAILED: Booking with multiple dentists was NOT refused");
        }
        const multiAppts = await appointment_model_1.Appointment.countDocuments({ tenantId: tenantMulti, date: "2026-10-27" });
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
        availability_service_1.availabilityService.checkAvailability = originalCheck;
    }
    catch (error) {
        console.error("\n❌ PHASE 6.9 TEST SUITE FAILED:", error.message);
        process.exit(1);
    }
    finally {
        await mongoose_1.default.disconnect();
    }
}
runPhase69Tests();
//# sourceMappingURL=phase6.9.test.js.map