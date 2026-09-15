/**
 * Seed script – creates the Super Admin account on first run.
 * Run once: npx ts-node src/scripts/seed.ts
 *
 * Credentials are read from environment variables.
 * Set these in your .env file BEFORE running.
 */

import dotenv from "dotenv";
import bcrypt from "bcrypt";
import connectDB from "../shared/db";
import { User } from "../modules/users/user.model";

dotenv.config();

async function seed() {
  await connectDB();

  const email = process.env.SUPER_ADMIN_EMAIL || "admin@medical-ai.com";
  const password = process.env.SUPER_ADMIN_PASSWORD || "admin123";

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`✅  Super Admin already exists: ${email}`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await User.create({
    tenantId: "000000000000000000000000", // System-level, no tenant
    email,
    passwordHash,
    firstName: "Super",
    lastName: "Admin",
    role: "super_admin",
  });

  console.log(`🎉  Super Admin created:`);
  console.log(`    Email:    ${email}`);
  console.log(`    Password: ${password}  ← Change this immediately in production!`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
