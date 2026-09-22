import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { Appointment } from "../modules/appointments/appointment.model";

dotenv.config({ path: path.join(__dirname, "../../.env") });

async function main() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/medical-ai";
  console.log("Connecting to MongoDB:", mongoUri);
  await mongoose.connect(mongoUri);

  const total = await Appointment.countDocuments();
  console.log(`Total appointments: ${total}`);

  const missingSource = await Appointment.find({
    $or: [{ source: { $exists: false } }, { source: null }, { source: "" }]
  });
  console.log(`Appointments with missing source: ${missingSource.length}`);

  // Update them to "ai" (since our test patient/bot appointments were created via AI flow)
  const res = await Appointment.updateMany(
    { $or: [{ source: { $exists: false } }, { source: null }, { source: "" }] },
    { $set: { source: "ai" } }
  );
  console.log(`Updated ${res.modifiedCount} appointments to source='ai'`);

  const all = await Appointment.find().lean();
  console.log("Current appointments summary:", all.map(a => ({ id: a._id, patient: a.patientId, date: a.date, time: a.startTime, source: a.source })));

  await mongoose.disconnect();
}

main().catch(err => {
  console.error("Backfill error:", err);
  process.exit(1);
});
