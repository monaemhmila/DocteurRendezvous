import mongoose from "mongoose";
import * as dotenv from "dotenv";
dotenv.config();

async function run() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("No MONGO_URI in environment");
    process.exit(1);
  }
  await mongoose.connect(mongoUri);
  
  // Upgrade all lead patients who have real names (firstName length > 2, lastName length > 1)
  // These are family members who were created with confirmed identities but incorrectly marked as lead
  const result = await mongoose.connection.collection("patients").updateMany(
    { 
      status: "lead",
      firstName: { $exists: true, $not: /^patient$/i, $regex: /^.{2,}$/ },
      lastName: { $exists: true, $regex: /^.{1,}$/ }
    },
    { $set: { status: "active" } }
  );
  console.log(`Updated ${result.modifiedCount} lead patients with real names → active`);
  
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
