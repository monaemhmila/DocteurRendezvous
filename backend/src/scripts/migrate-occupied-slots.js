"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateOccupiedSlots = migrateOccupiedSlots;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const appointment_model_1 = require("../modules/appointments/appointment.model");
dotenv_1.default.config();
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/medical-ai";
async function migrateOccupiedSlots() {
    console.log("🔄 Starting idempotent migration for Appointment.occupiedSlots...");
    if (mongoose_1.default.connection.readyState === 0) {
        await mongoose_1.default.connect(MONGO_URI);
    }
    // 1. Sync indexes to ensure multikey index is created
    await appointment_model_1.Appointment.syncIndexes();
    console.log("✅ Indexes synchronized.");
    // 2. Find appointments missing occupiedSlots
    const appts = await appointment_model_1.Appointment.find({
        $or: [{ occupiedSlots: { $exists: false } }, { occupiedSlots: { $size: 0 } }],
    });
    let migratedCount = 0;
    for (const appt of appts) {
        if (appt.startTime && appt.endTime) {
            const slots = (0, appointment_model_1.computeOccupiedSlots)(appt.startTime, appt.endTime);
            await appointment_model_1.Appointment.updateOne({ _id: appt._id }, { $set: { occupiedSlots: slots } });
            migratedCount++;
        }
    }
    console.log(`✅ Migration complete. Migrated ${migratedCount} appointments.`);
}
if (process.argv[1]?.includes("migrate-occupied-slots")) {
    migrateOccupiedSlots()
        .then(() => process.exit(0))
        .catch((err) => {
        console.error("Migration error:", err);
        process.exit(1);
    });
}
//# sourceMappingURL=migrate-occupied-slots.js.map