"use strict";
/**
 * Seed script – creates the Super Admin account on first run.
 * Run once: npx ts-node src/scripts/seed.ts
 *
 * Credentials are read from environment variables.
 * Set these in your .env file BEFORE running.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = __importDefault(require("../shared/db"));
const user_model_1 = require("../modules/users/user.model");
dotenv_1.default.config();
async function seed() {
    await (0, db_1.default)();
    const email = process.env.SUPER_ADMIN_EMAIL || "admin@medical-ai.com";
    const password = process.env.SUPER_ADMIN_PASSWORD || "admin123";
    const existing = await user_model_1.User.findOne({ email });
    if (existing) {
        console.log(`✅  Super Admin already exists: ${email}`);
        process.exit(0);
    }
    const passwordHash = await bcrypt_1.default.hash(password, 10);
    await user_model_1.User.create({
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
//# sourceMappingURL=seed.js.map