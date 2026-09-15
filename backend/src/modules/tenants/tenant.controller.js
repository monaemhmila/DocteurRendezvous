"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentTenant = exports.getTenants = exports.createTenant = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const tenant_model_1 = require("./tenant.model");
const user_model_1 = require("../users/user.model");
const zod_1 = require("zod");
const createTenantSchema = zod_1.z.object({
    clinicName: zod_1.z.string().min(2),
    ownerName: zod_1.z.string().min(2),
    ownerEmail: zod_1.z.string().email(),
    // Optionnel: On pourrait générer le mot de passe et l'envoyer par email
    ownerPassword: zod_1.z.string().min(6).optional(),
});
const createTenant = async (req, res) => {
    try {
        // 1. Vérification des droits : Seul un super_admin peut créer un tenant
        if (req.user?.role !== "super_admin") {
            return res.status(403).json({ error: "Forbidden: Super Admin access required" });
        }
        const { clinicName, ownerName, ownerEmail, ownerPassword } = createTenantSchema.parse(req.body);
        // Vérifier si l'utilisateur (owner) existe déjà
        const existingUser = await user_model_1.User.findOne({ email: ownerEmail });
        if (existingUser) {
            return res.status(400).json({ error: "Un utilisateur avec cet email existe déjà" });
        }
        // 2. Création du Tenant (le cabinet médical)
        const tenant = await tenant_model_1.Tenant.create({ name: clinicName });
        // 3. Création du mot de passe
        const rawPassword = ownerPassword || Math.random().toString(36).slice(-8); // Mdp généré par défaut
        const passwordHash = await bcrypt_1.default.hash(rawPassword, 10);
        const [firstName, ...lastNames] = ownerName.split(" ");
        // 4. Création de l'utilisateur Propriétaire (clinic_owner) lié au tenant
        const user = await user_model_1.User.create({
            tenantId: tenant._id,
            email: ownerEmail,
            passwordHash,
            firstName: firstName || "Dr.",
            lastName: lastNames.join(" ") || "Cabinet",
            role: "clinic_owner",
        });
        // TODO: Dans un vrai système, envoyer un email avec le mot de passe généré `rawPassword`
        res.status(201).json({
            message: "Cabinet créé avec succès",
            tenant: { id: tenant._id, name: tenant.name },
            owner: { id: user._id, email: user.email, role: user.role },
            generatedPassword: rawPassword, // À retirer en prod (envoyer par email à la place)
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.createTenant = createTenant;
const getTenants = async (req, res) => {
    try {
        if (req.user?.role !== "super_admin") {
            return res.status(403).json({ error: "Forbidden: Super Admin access required" });
        }
        const tenants = await tenant_model_1.Tenant.find().sort({ createdAt: -1 });
        res.json(tenants);
    }
    catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getTenants = getTenants;
const getCurrentTenant = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "No tenant context" });
        const tenant = await tenant_model_1.Tenant.findById(tenantId);
        if (!tenant)
            return res.status(404).json({ error: "Tenant not found" });
        res.json(tenant);
    }
    catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getCurrentTenant = getCurrentTenant;
//# sourceMappingURL=tenant.controller.js.map