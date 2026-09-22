"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const appointment_model_1 = require("../modules/appointments/appointment.model");
dotenv_1.default.config({ path: path_1.default.join(__dirname, "../../.env") });
async function main() {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/medical-ai";
    console.log("Connecting to MongoDB:", mongoUri);
    await mongoose_1.default.connect(mongoUri);
    const total = await appointment_model_1.Appointment.countDocuments();
    console.log(`Total appointments: ${total}`);
    const missingSource = await appointment_model_1.Appointment.find({
        $or: [{ source: { $exists: false } }, { source: null }, { source: "" }]
    });
    console.log(`Appointments with missing source: ${missingSource.length}`);
    // Update them to "ai" (since our test patient/bot appointments were created via AI flow)
    const res = await appointment_model_1.Appointment.updateMany({ $or: [{ source: { $exists: false } }, { source: null }, { source: "" }] }, { $set: { source: "ai" } });
    console.log(`Updated ${res.modifiedCount} appointments to source='ai'`);
    const all = await appointment_model_1.Appointment.find().lean();
    console.log("Current appointments summary:", all.map(a => ({ id: a._id, patient: a.patientId, date: a.date, time: a.startTime, source: a.source })));
    await mongoose_1.default.disconnect();
}
main().catch(err => {
    console.error("Backfill error:", err);
    process.exit(1);
});
//# sourceMappingURL=backfill-ai-source.js.map