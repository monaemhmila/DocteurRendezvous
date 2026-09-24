import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/medical-ai";

async function seed() {
  try {
    console.log("Connecting to", MONGO_URI);
    await mongoose.connect(MONGO_URI);
    
    // Use the schemas to create properly formatted data
    const db = mongoose.connection.db;

    const hashPw = async (pw: string) => await bcrypt.hash(pw, 10);

    // 1. Super Admin
    const adminEmail = "admin@medical-ai.com";
    if (!await db.collection("users").findOne({ email: adminEmail })) {
      await db.collection("users").insertOne({
        email: adminEmail,
        passwordHash: await hashPw("admin123"),
        firstName: "Super",
        lastName: "Admin",
        role: "super_admin",
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log("✅ Created Super Admin");
    } else {
      console.log("✅ Super Admin already exists");
    }

    // 2. Demo Dentaire
    const demo1Email = "demo@dentaire-tunis.com";
    if (!await db.collection("users").findOne({ email: demo1Email })) {
      const tenant1 = await db.collection("tenants").insertOne({
        name: "Clinique Dentaire Tunis",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await db.collection("users").insertOne({
        email: demo1Email,
        passwordHash: await hashPw("demo123"),
        firstName: "Dr. Demo",
        lastName: "Dentaire",
        role: "clinic_owner",
        tenantId: tenant1.insertedId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log("✅ Created Demo Dentaire");
    } else {
      console.log("✅ Demo Dentaire already exists");
    }

    // 3. Demo Cardio
    const demo2Email = "demo@cabinet-cardio.com";
    if (!await db.collection("users").findOne({ email: demo2Email })) {
      const tenant2 = await db.collection("tenants").insertOne({
        name: "Cabinet Cardiologie",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await db.collection("users").insertOne({
        email: demo2Email,
        passwordHash: await hashPw("demo123"),
        firstName: "Dr. Demo",
        lastName: "Cardio",
        role: "clinic_owner",
        tenantId: tenant2.insertedId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log("✅ Created Demo Cardio");
    } else {
      console.log("✅ Demo Cardio already exists");
    }

    console.log("Seeding complete.");
    process.exit(0);
  } catch (e) {
    console.error("Seed error:", e);
    process.exit(1);
  }
}

seed();
