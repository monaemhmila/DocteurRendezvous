"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsers = exports.deleteTeamMember = exports.resetTeamMemberPassword = exports.updateTeamMemberStatus = exports.updateTeamMember = exports.createTeamMember = exports.getTeamMembers = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const zod_1 = require("zod");
const user_model_1 = require("./user.model");
const tenant_model_1 = require("../tenants/tenant.model");
async function resolveTenantId(req) {
    let tenantId = req.user?.tenantId;
    if (tenantId)
        return tenantId;
    const activeTenant = await tenant_model_1.Tenant.findOne({ status: "active" });
    return activeTenant ? activeTenant._id.toString() : null;
}
const defaultPermissionsByRole = {
    clinic_owner: {
        appointments: true,
        patients: true,
        conversations: true,
        aiConfig: true,
        analytics: true,
        settings: true,
    },
    dentist: {
        appointments: true,
        patients: true,
        conversations: true,
        aiConfig: false,
        analytics: true,
        settings: false,
    },
    receptionist: {
        appointments: true,
        patients: true,
        conversations: true,
        aiConfig: false,
        analytics: false,
        settings: false,
    },
    assistant: {
        appointments: true,
        patients: true,
        conversations: false,
        aiConfig: false,
        analytics: false,
        settings: false,
    },
    super_admin: {
        appointments: true,
        patients: true,
        conversations: true,
        aiConfig: true,
        analytics: true,
        settings: true,
    },
};
const createTeamMemberSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(2, "Le prénom est requis"),
    lastName: zod_1.z.string().min(2, "Le nom est requis"),
    email: zod_1.z.string().email("Adresse email invalide"),
    password: zod_1.z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères").optional(),
    phone: zod_1.z.string().optional(),
    specialty: zod_1.z.string().optional(),
    role: zod_1.z.enum(["clinic_owner", "dentist", "receptionist", "assistant"]),
    status: zod_1.z.enum(["active", "inactive"]).optional(),
    permissions: zod_1.z
        .object({
        appointments: zod_1.z.boolean().optional(),
        patients: zod_1.z.boolean().optional(),
        conversations: zod_1.z.boolean().optional(),
        aiConfig: zod_1.z.boolean().optional(),
        analytics: zod_1.z.boolean().optional(),
        settings: zod_1.z.boolean().optional(),
    })
        .optional(),
});
const updateTeamMemberSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(2).optional(),
    lastName: zod_1.z.string().min(2).optional(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    specialty: zod_1.z.string().optional(),
    role: zod_1.z.enum(["clinic_owner", "dentist", "receptionist", "assistant"]).optional(),
    status: zod_1.z.enum(["active", "inactive"]).optional(),
    permissions: zod_1.z
        .object({
        appointments: zod_1.z.boolean().optional(),
        patients: zod_1.z.boolean().optional(),
        conversations: zod_1.z.boolean().optional(),
        aiConfig: zod_1.z.boolean().optional(),
        analytics: zod_1.z.boolean().optional(),
        settings: zod_1.z.boolean().optional(),
    })
        .optional(),
});
const getTeamMembers = async (req, res) => {
    try {
        const tenantId = await resolveTenantId(req);
        if (!tenantId)
            return res.status(403).json({ error: "No tenant context" });
        const users = await user_model_1.User.find({ tenantId }).select("-passwordHash").sort({ createdAt: 1 });
        const formattedUsers = users.map((u) => {
            const role = u.role || "receptionist";
            const fallbackPerms = defaultPermissionsByRole[role] || defaultPermissionsByRole.receptionist;
            return {
                ...u.toObject(),
                permissions: {
                    ...fallbackPerms,
                    ...(u.permissions || {}),
                },
            };
        });
        res.json(formattedUsers);
    }
    catch (error) {
        console.error("getTeamMembers error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getTeamMembers = getTeamMembers;
const createTeamMember = async (req, res) => {
    try {
        const tenantId = await resolveTenantId(req);
        if (!tenantId)
            return res.status(403).json({ error: "No tenant context" });
        const data = createTeamMemberSchema.parse(req.body);
        const normalizedEmail = data.email.toLowerCase().trim();
        const existing = await user_model_1.User.findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(400).json({ error: "Un utilisateur avec cet email existe déjà" });
        }
        const rawPassword = data.password || Math.random().toString(36).slice(-8) + "A1!";
        const passwordHash = await bcrypt_1.default.hash(rawPassword, 10);
        const defaultPerms = defaultPermissionsByRole[data.role] || defaultPermissionsByRole.receptionist;
        const finalPermissions = {
            ...defaultPerms,
            ...(data.permissions || {}),
        };
        const newUser = await user_model_1.User.create({
            tenantId,
            email: normalizedEmail,
            passwordHash,
            firstName: data.firstName.trim(),
            lastName: data.lastName.trim(),
            phone: data.phone?.trim() || "",
            specialty: data.specialty?.trim() || (data.role === "dentist" ? "Praticien" : data.role === "assistant" ? "Assistant(e)" : "Secrétariat"),
            role: data.role,
            status: data.status || "active",
            permissions: finalPermissions,
        });
        const userObj = newUser.toObject();
        delete userObj.passwordHash;
        res.status(201).json({
            message: "Membre de l'équipe ajouté avec succès",
            user: userObj,
            temporaryPassword: data.password ? undefined : rawPassword,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors[0]?.message || "Données invalides" });
        }
        console.error("createTeamMember error:", error);
        res.status(500).json({ error: "Erreur lors de la création du membre" });
    }
};
exports.createTeamMember = createTeamMember;
const updateTeamMember = async (req, res) => {
    try {
        const tenantId = await resolveTenantId(req);
        const { id } = req.params;
        const user = await user_model_1.User.findOne({ _id: id, ...(tenantId ? { tenantId } : {}) });
        if (!user) {
            return res.status(404).json({ error: "Membre de l'équipe introuvable" });
        }
        const data = updateTeamMemberSchema.parse(req.body);
        if (data.email) {
            const normalizedEmail = data.email.toLowerCase().trim();
            if (normalizedEmail !== user.email) {
                const existing = await user_model_1.User.findOne({ email: normalizedEmail });
                if (existing) {
                    return res.status(400).json({ error: "Cet email est déjà utilisé" });
                }
                user.email = normalizedEmail;
            }
        }
        if (data.firstName)
            user.firstName = data.firstName.trim();
        if (data.lastName)
            user.lastName = data.lastName.trim();
        if (data.phone !== undefined)
            user.phone = data.phone.trim();
        if (data.specialty !== undefined)
            user.specialty = data.specialty.trim();
        if (data.role)
            user.role = data.role;
        if (data.status)
            user.status = data.status;
        if (data.permissions) {
            user.permissions = {
                ...(user.permissions || defaultPermissionsByRole[user.role] || {}),
                ...data.permissions,
            };
        }
        await user.save();
        const userObj = user.toObject();
        delete userObj.passwordHash;
        res.json({ message: "Membre mis à jour avec succès", user: userObj });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors[0]?.message || "Données invalides" });
        }
        console.error("updateTeamMember error:", error);
        res.status(500).json({ error: "Erreur lors de la modification du membre" });
    }
};
exports.updateTeamMember = updateTeamMember;
const updateTeamMemberStatus = async (req, res) => {
    try {
        const tenantId = await resolveTenantId(req);
        const { id } = req.params;
        const { status } = req.body;
        if (!["active", "inactive"].includes(status)) {
            return res.status(400).json({ error: "Statut invalide" });
        }
        const user = await user_model_1.User.findOne({ _id: id, ...(tenantId ? { tenantId } : {}) });
        if (!user) {
            return res.status(404).json({ error: "Membre introuvable" });
        }
        // Protect clinic owner from deactivation
        if (user.role === "clinic_owner" && status === "inactive") {
            return res.status(400).json({ error: "Impossible de désactiver le compte du titulaire du cabinet" });
        }
        user.status = status;
        await user.save();
        res.json({ message: `Statut mis à jour : ${status}`, user });
    }
    catch (error) {
        console.error("updateTeamMemberStatus error:", error);
        res.status(500).json({ error: "Erreur interne" });
    }
};
exports.updateTeamMemberStatus = updateTeamMemberStatus;
const resetTeamMemberPassword = async (req, res) => {
    try {
        const tenantId = await resolveTenantId(req);
        const { id } = req.params;
        const { password } = req.body;
        const user = await user_model_1.User.findOne({ _id: id, ...(tenantId ? { tenantId } : {}) });
        if (!user) {
            return res.status(404).json({ error: "Membre introuvable" });
        }
        const newPassword = password || Math.random().toString(36).slice(-8) + "B2!";
        if (newPassword.length < 6) {
            return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères" });
        }
        user.passwordHash = await bcrypt_1.default.hash(newPassword, 10);
        await user.save();
        res.json({
            message: "Mot de passe réinitialisé avec succès",
            newPassword,
        });
    }
    catch (error) {
        console.error("resetTeamMemberPassword error:", error);
        res.status(500).json({ error: "Erreur interne" });
    }
};
exports.resetTeamMemberPassword = resetTeamMemberPassword;
const deleteTeamMember = async (req, res) => {
    try {
        const tenantId = await resolveTenantId(req);
        const { id } = req.params;
        const user = await user_model_1.User.findOne({ _id: id, ...(tenantId ? { tenantId } : {}) });
        if (!user) {
            return res.status(404).json({ error: "Membre introuvable" });
        }
        if (user.role === "clinic_owner") {
            return res.status(400).json({ error: "Impossible de supprimer le titulaire / propriétaire du cabinet" });
        }
        await user_model_1.User.findByIdAndDelete(id);
        res.json({ message: "Membre supprimé avec succès" });
    }
    catch (error) {
        console.error("deleteTeamMember error:", error);
        res.status(500).json({ error: "Erreur interne" });
    }
};
exports.deleteTeamMember = deleteTeamMember;
const getAllUsers = async (req, res) => {
    try {
        if (req.user?.role !== "super_admin") {
            return res.status(403).json({ error: "Forbidden" });
        }
        const users = await user_model_1.User.find().populate("tenantId", "name").select("-passwordHash").sort({ createdAt: -1 });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getAllUsers = getAllUsers;
//# sourceMappingURL=user.controller.js.map