"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const tenant_model_1 = require("../modules/tenants/tenant.model");
const appointment_model_1 = require("../modules/appointments/appointment.model");
const availability_service_1 = require("../modules/appointments/availability.service");
const user_model_1 = require("../modules/users/user.model");
async function runTest() {
    await mongoose_1.default.connect("mongodb://localhost:27017/medical-ai");
    console.log("Connected to MongoDB");
    const tenant = await tenant_model_1.Tenant.findOne({ status: "active" });
    if (!tenant) {
        console.error("No active tenant found");
        return;
    }
    const doctor = await user_model_1.User.findOne({ tenantId: tenant._id });
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toISOString().slice(0, 10);
    // Setup an existing appointment at 10:00 -> 10:30
    const testAppt = await appointment_model_1.Appointment.create({
        tenantId: tenant._id,
        patientId: new mongoose_1.default.Types.ObjectId(),
        doctorId: doctor?._id || new mongoose_1.default.Types.ObjectId(),
        date: tomorrowIso,
        startTime: "10:00",
        endTime: "10:30",
        durationMin: 30,
        treatment: "Consultation test anti-gruyère",
        status: "scheduled",
        source: "manual"
    });
    console.log(`\nExisting appointment on ${tomorrowIso}: 10:00 -> 10:30`);
    // Run availability check for a 30-min slot
    const result = await availability_service_1.availabilityService.getAvailableSlots({
        tenantId: tenant._id.toString(),
        date: tomorrowIso,
        durationMin: 30,
    });
    console.log("\n--- ANTI-GRUYÈRE RANKED SLOTS (Top 5) ---");
    result.slots?.forEach((s, i) => {
        console.log(`Rank #${i + 1}: ${s.startTime} -> ${s.endTime}`);
    });
    const firstSlot = result.slots?.[0];
    const isOptimal = firstSlot?.startTime === "09:30" ||
        firstSlot?.startTime === "10:30" ||
        firstSlot?.startTime === "08:30";
    console.log(`\nIs top-ranked slot optimal (compact)? ${isOptimal ? "✅ OUI" : "❌ NON"}`);
    // Cleanup
    await appointment_model_1.Appointment.findByIdAndDelete(testAppt._id);
    await mongoose_1.default.disconnect();
    console.log("Cleaned up successfully.");
}
runTest().catch(console.error);
//# sourceMappingURL=test-anti-gruyere.js.map