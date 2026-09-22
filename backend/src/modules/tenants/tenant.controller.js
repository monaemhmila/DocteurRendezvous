"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testAIKey = exports.updateTenantSettings = exports.updateCurrentTenant = exports.getCurrentTenant = exports.deleteTenant = exports.resetTenantPassword = exports.updateTenantStatus = exports.updateTenant = exports.getTenants = exports.createTenant = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const tenant_model_1 = require("./tenant.model");
const user_model_1 = require("../users/user.model");
const patient_model_1 = require("../patients/patient.model");
const appointment_model_1 = require("../appointments/appointment.model");
const zod_1 = require("zod");
const createTenantSchema = zod_1.z.object({
    clinicName: zod_1.z.string().min(2, "Le nom du cabinet doit contenir au moins 2 caractères"),
    ownerName: zod_1.z.string().min(2, "Le nom du médecin est requis"),
    ownerEmail: zod_1.z.string().email("Adresse email invalide"),
    ownerPassword: zod_1.z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères").optional(),
    specialty: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    plan: zod_1.z.enum(["starter", "pro", "enterprise"]).optional(),
});
const updateTenantSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    specialty: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    plan: zod_1.z.enum(["starter", "pro", "enterprise"]).optional(),
    status: zod_1.z.enum(["active", "suspended", "trial"]).optional(),
    suspensionReason: zod_1.z.string().optional(),
    ownerName: zod_1.z.string().optional(),
    ownerEmail: zod_1.z.string().email().optional(),
});
const createTenant = async (req, res) => {
    try {
        if (req.user?.role !== "super_admin") {
            return res.status(403).json({ error: "Accès réservé au Super Admin" });
        }
        const data = createTenantSchema.parse(req.body);
        const existingUser = await user_model_1.User.findOne({ email: data.ownerEmail.toLowerCase().trim() });
        if (existingUser) {
            return res.status(400).json({ error: "Un utilisateur avec cette adresse email existe déjà" });
        }
        // 1. Create Tenant
        const tenant = await tenant_model_1.Tenant.create({
            name: data.clinicName.trim(),
            specialty: data.specialty || "Générale",
            email: data.ownerEmail.toLowerCase().trim(),
            phone: data.phone || "",
            address: data.address || "",
            status: "active",
            plan: data.plan || "pro",
        });
        // 2. Setup Password
        const rawPassword = data.ownerPassword || Math.random().toString(36).slice(-8) + "A1!";
        const passwordHash = await bcrypt_1.default.hash(rawPassword, 10);
        const parts = data.ownerName.trim().split(" ");
        const firstName = parts[0] || "Dr.";
        const lastName = parts.slice(1).join(" ") || "Médecin";
        // 3. Create Clinic Owner User
        const user = await user_model_1.User.create({
            tenantId: tenant._id,
            email: data.ownerEmail.toLowerCase().trim(),
            passwordHash,
            firstName,
            lastName,
            role: "clinic_owner",
        });
        res.status(201).json({
            message: "Cabinet créé avec succès",
            tenant,
            owner: {
                id: user._id,
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                role: user.role,
            },
            generatedPassword: rawPassword,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors[0]?.message || "Données invalides" });
        }
        console.error("createTenant error:", error);
        res.status(500).json({ error: "Erreur interne du serveur" });
    }
};
exports.createTenant = createTenant;
const getTenants = async (req, res) => {
    try {
        if (req.user?.role !== "super_admin") {
            return res.status(403).json({ error: "Accès réservé au Super Admin" });
        }
        const tenants = await tenant_model_1.Tenant.find().sort({ createdAt: -1 });
        // Fetch owners and aggregate counts for each tenant
        const tenantsWithDetails = await Promise.all(tenants.map(async (t) => {
            const [owner, userCount, patientCount, appointmentCount] = await Promise.all([
                user_model_1.User.findOne({ tenantId: t._id, role: "clinic_owner" }).select("firstName lastName email phone"),
                user_model_1.User.countDocuments({ tenantId: t._id }),
                patient_model_1.Patient.countDocuments({ tenantId: t._id }),
                appointment_model_1.Appointment.countDocuments({ tenantId: t._id }),
            ]);
            return {
                ...t.toObject(),
                owner: owner
                    ? {
                        name: `${owner.firstName} ${owner.lastName}`,
                        email: owner.email,
                    }
                    : null,
                metrics: {
                    userCount,
                    patientCount,
                    appointmentCount,
                },
            };
        }));
        res.json(tenantsWithDetails);
    }
    catch (error) {
        console.error("getTenants error:", error);
        res.status(500).json({ error: "Erreur interne du serveur" });
    }
};
exports.getTenants = getTenants;
const updateTenant = async (req, res) => {
    try {
        if (req.user?.role !== "super_admin") {
            return res.status(403).json({ error: "Accès réservé au Super Admin" });
        }
        const { id } = req.params;
        const data = updateTenantSchema.parse(req.body);
        const tenant = await tenant_model_1.Tenant.findById(id);
        if (!tenant) {
            return res.status(404).json({ error: "Cabinet introuvable" });
        }
        if (data.name)
            tenant.name = data.name;
        if (data.specialty !== undefined)
            tenant.specialty = data.specialty;
        if (data.email !== undefined)
            tenant.email = data.email;
        if (data.phone !== undefined)
            tenant.phone = data.phone;
        if (data.address !== undefined)
            tenant.address = data.address;
        if (data.plan !== undefined)
            tenant.plan = data.plan;
        if (data.status !== undefined)
            tenant.status = data.status;
        if (data.suspensionReason !== undefined)
            tenant.suspensionReason = data.suspensionReason;
        await tenant.save();
        // Update owner user name/email if specified
        if (data.ownerName || data.ownerEmail) {
            const owner = await user_model_1.User.findOne({ tenantId: tenant._id, role: "clinic_owner" });
            if (owner) {
                if (data.ownerName) {
                    const parts = data.ownerName.trim().split(" ");
                    owner.firstName = parts[0] || "Dr.";
                    owner.lastName = parts.slice(1).join(" ") || "";
                }
                if (data.ownerEmail) {
                    owner.email = data.ownerEmail.toLowerCase().trim();
                }
                await owner.save();
            }
        }
        res.json({ message: "Cabinet mis à jour avec succès", tenant });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors[0]?.message || "Données invalides" });
        }
        console.error("updateTenant error:", error);
        res.status(500).json({ error: "Erreur interne du serveur" });
    }
};
exports.updateTenant = updateTenant;
const updateTenantStatus = async (req, res) => {
    try {
        if (req.user?.role !== "super_admin") {
            return res.status(403).json({ error: "Accès réservé au Super Admin" });
        }
        const { id } = req.params;
        const { status, suspensionReason } = req.body;
        if (!["active", "suspended", "trial"].includes(status)) {
            return res.status(400).json({ error: "Statut invalide (active, suspended, trial)" });
        }
        const tenant = await tenant_model_1.Tenant.findByIdAndUpdate(id, {
            status,
            suspensionReason: status === "suspended" ? suspensionReason || "Retard de paiement" : "",
        }, { returnDocument: 'after' });
        if (!tenant) {
            return res.status(404).json({ error: "Cabinet introuvable" });
        }
        res.json({ message: `Statut du cabinet mis à jour: ${status}`, tenant });
    }
    catch (error) {
        console.error("updateTenantStatus error:", error);
        res.status(500).json({ error: "Erreur interne du serveur" });
    }
};
exports.updateTenantStatus = updateTenantStatus;
const resetTenantPassword = async (req, res) => {
    try {
        if (req.user?.role !== "super_admin") {
            return res.status(403).json({ error: "Accès réservé au Super Admin" });
        }
        const { id } = req.params;
        const { newPassword } = req.body;
        const owner = await user_model_1.User.findOne({ tenantId: id, role: "clinic_owner" });
        if (!owner) {
            return res.status(404).json({ error: "Médecin / propriétaire du cabinet introuvable" });
        }
        const passwordToSet = newPassword || Math.random().toString(36).slice(-8) + "B2!";
        if (passwordToSet.length < 6) {
            return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères" });
        }
        owner.passwordHash = await bcrypt_1.default.hash(passwordToSet, 10);
        await owner.save();
        res.json({
            message: "Mot de passe réinitialisé avec succès",
            email: owner.email,
            newPassword: passwordToSet,
        });
    }
    catch (error) {
        console.error("resetTenantPassword error:", error);
        res.status(500).json({ error: "Erreur interne du serveur" });
    }
};
exports.resetTenantPassword = resetTenantPassword;
const deleteTenant = async (req, res) => {
    try {
        if (req.user?.role !== "super_admin") {
            return res.status(403).json({ error: "Accès réservé au Super Admin" });
        }
        const { id } = req.params;
        await Promise.all([
            tenant_model_1.Tenant.findByIdAndDelete(id),
            user_model_1.User.deleteMany({ tenantId: id }),
            patient_model_1.Patient.deleteMany({ tenantId: id }),
            appointment_model_1.Appointment.deleteMany({ tenantId: id }),
        ]);
        res.json({ message: "Cabinet et données associées supprimés avec succès" });
    }
    catch (error) {
        console.error("deleteTenant error:", error);
        res.status(500).json({ error: "Erreur interne du serveur" });
    }
};
exports.deleteTenant = deleteTenant;
const getCurrentTenant = async (req, res) => {
    try {
        let tenantId = req.user?.tenantId;
        let tenant = null;
        if (tenantId) {
            tenant = await tenant_model_1.Tenant.findById(tenantId);
        }
        if (!tenant) {
            tenant = await tenant_model_1.Tenant.findOne({ status: "active" });
        }
        if (!tenant)
            return res.status(404).json({ error: "Tenant not found" });
        res.json(tenant);
    }
    catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getCurrentTenant = getCurrentTenant;
const updateCurrentTenant = async (req, res) => {
    try {
        let tenantId = req.user?.tenantId;
        let tenant = null;
        if (tenantId) {
            tenant = await tenant_model_1.Tenant.findById(tenantId);
        }
        if (!tenant) {
            tenant = await tenant_model_1.Tenant.findOne({ status: "active" });
        }
        if (!tenant)
            return res.status(404).json({ error: "Tenant introuvable" });
        const { name, specialty, email, phone, address, settings } = req.body;
        if (name !== undefined)
            tenant.name = name.trim();
        if (specialty !== undefined)
            tenant.specialty = specialty.trim();
        if (email !== undefined)
            tenant.email = email.trim().toLowerCase();
        if (phone !== undefined)
            tenant.phone = phone.trim();
        if (address !== undefined)
            tenant.address = address.trim();
        if (settings && typeof settings === "object") {
            tenant.settings = {
                ...(tenant.settings || {}),
                ...settings,
            };
            tenant.markModified("settings");
        }
        await tenant.save();
        res.json({ message: "Informations du cabinet mises à jour avec succès", tenant });
    }
    catch (error) {
        console.error("updateCurrentTenant error:", error);
        res.status(500).json({ error: error.message || "Erreur interne" });
    }
};
exports.updateCurrentTenant = updateCurrentTenant;
const updateTenantSettings = async (req, res) => {
    try {
        let tenantId = req.user?.tenantId;
        let tenant = null;
        if (tenantId) {
            tenant = await tenant_model_1.Tenant.findById(tenantId);
        }
        if (!tenant) {
            tenant = await tenant_model_1.Tenant.findOne({ status: "active" });
        }
        if (!tenant)
            return res.status(404).json({ error: "Tenant introuvable" });
        const incomingSettings = req.body.settings || req.body;
        if (!incomingSettings || typeof incomingSettings !== "object") {
            return res.status(400).json({ error: "Paramètres invalides" });
        }
        tenant.settings = {
            ...(tenant.settings || {}),
            ...incomingSettings,
        };
        tenant.markModified("settings");
        await tenant.save();
        res.json({ message: "Paramètres mis à jour avec succès", settings: tenant.settings });
    }
    catch (error) {
        console.error("updateTenantSettings error:", error);
        res.status(500).json({ error: error.message || "Erreur interne" });
    }
};
exports.updateTenantSettings = updateTenantSettings;
const testAIKey = async (req, res) => {
    try {
        const { apiKey, providerUrl, model } = req.body;
        if (!apiKey || typeof apiKey !== "string") {
            return res.status(400).json({ error: "Clé API manquante" });
        }
        const targetUrl = (providerUrl || "https://api.openai.com/v1").replace(/\/+$/, "") + "/chat/completions";
        const targetModel = model || "gpt-4o-mini";
        const startTime = Date.now();
        const response = await fetch(targetUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey.trim()}`,
            },
            body: JSON.stringify({
                model: targetModel,
                messages: [{ role: "user", content: "Ping! Réponds juste 'OK'" }],
                max_tokens: 10,
            }),
        });
        const latencyMs = Date.now() - startTime;
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const msg = errorData?.error?.message || `HTTP ${response.status}`;
            return res.status(400).json({
                success: false,
                error: `Erreur API (${response.status}): ${msg}`,
            });
        }
        const data = await response.json();
        const reply = data?.choices?.[0]?.message?.content || "OK";
        return res.json({
            success: true,
            model: targetModel,
            latencyMs,
            reply: reply.trim(),
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message || "Impossible de contacter l'API",
        });
    }
};
exports.testAIKey = testAIKey;
//# sourceMappingURL=tenant.controller.js.map