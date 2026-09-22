import mongoose from "mongoose";
import dotenv from "dotenv";
import { Appointment, computeOccupiedSlots } from "../modules/appointments/appointment.model";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/medical-ai";

export async function migrateOccupiedSlots() {
  console.log("🔄 Starting idempotent migration for Appointment.occupiedSlots...");
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  // 1. Sync indexes to ensure multikey index is created
  await Appointment.syncIndexes();
  console.log("✅ Indexes synchronized.");

  // 2. Find appointments missing occupiedSlots
  const appts = await Appointment.find({
    $or: [{ occupiedSlots: { $exists: false } }, { occupiedSlots: { $size: 0 } }],
  });

  let migratedCount = 0;
  for (const appt of appts) {
    if (appt.startTime && appt.endTime) {
      const slots = computeOccupiedSlots(appt.startTime, appt.endTime);
      await Appointment.updateOne({ _id: appt._id }, { $set: { occupiedSlots: slots } });
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
