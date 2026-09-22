"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDemo = exports.login = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = require("../users/user.model");
const tenant_model_1 = require("../tenants/tenant.model");
const zod_1 = require("zod");
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
const login = async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const user = await user_model_1.User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Email ou mot de passe incorrect." });
        }
        const isMatch = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: "Email ou mot de passe incorrect." });
        }
        // Check tenant status if user belongs to a tenant
        let tenantName;
        if (user.tenantId) {
            const tenant = await tenant_model_1.Tenant.findById(user.tenantId);
            if (!tenant) {
                return res.status(401).json({ error: "Cabinet introuvable ou supprimé." });
            }
            if (tenant.status === "suspended") {
                return res.status(403).json({
                    error: `Accès suspendu : Le compte de votre cabinet "${tenant.name}" a été suspendu (${tenant.suspensionReason || "retard de paiement"}). Veuillez contacter l'administrateur de la plateforme.`,
                });
            }
            tenantName = tenant.name;
        }
        const initials = `${(user.firstName || "")[0] || ""}${(user.lastName || "")[0] || ""}`.toUpperCase();
        const token = jsonwebtoken_1.default.sign({
            id: user._id.toString(),
            tenantId: user.tenantId ? user.tenantId.toString() : "",
            role: user.role,
        }, process.env.JWT_SECRET, { expiresIn: "1d" });
        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                tenantId: user.tenantId,
                tenantName,
                initials,
            },
        });
    }
    catch (error) {
        console.error("Login error:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: "Données invalides." });
        }
        res.status(500).json({ error: error.message || "Erreur interne du serveur." });
    }
};
exports.login = login;
const registerDemo = async (req, res) => {
    // Disabled by default. Never expose predictable demo credentials in production.
    if (process.env.ENABLE_DEMO_REGISTRATION !== "true") {
        return res.status(404).json({ error: "Not Found" });
    }
    // Utility endpoint to seed a tenant and user for testing
    try {
        const existingUser = await user_model_1.User.findOne({ email: "demo@dentalai.com" });
        if (existingUser) {
            return res.status(400).json({ error: "Demo user already exists" });
        }
        const tenant = await tenant_model_1.Tenant.create({ name: "Demo Clinic" });
        const passwordHash = await bcrypt_1.default.hash("password123", 10);
        const user = await user_model_1.User.create({
            tenantId: tenant._id,
            email: "demo@dentalai.com",
            passwordHash,
            firstName: "Admin",
            lastName: "Demo",
            role: "clinic_owner"
        });
        res.status(201).json({ message: "Demo account created", user, tenant });
    }
    catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.registerDemo = registerDemo;
//# sourceMappingURL=auth.controller.js.map