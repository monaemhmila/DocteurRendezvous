import { Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { AuthRequest } from "../../shared/middleware/requireAuth";
import { User } from "./user.model";
import { Tenant } from "../tenants/tenant.model";

async function resolveTenantId(req: AuthRequest): Promise<string | null> {
  let tenantId = req.user?.tenantId;
  if (tenantId) return tenantId;

  const activeTenant = await Tenant.findOne({ status: "active" });
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

const createTeamMemberSchema = z.object({
  firstName: z.string().min(2, "Le prénom est requis"),
  lastName: z.string().min(2, "Le nom est requis"),
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères").optional(),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  role: z.enum(["clinic_owner", "dentist", "receptionist", "assistant"]),
  status: z.enum(["active", "inactive"]).optional(),
  permissions: z
    .object({
      appointments: z.boolean().optional(),
      patients: z.boolean().optional(),
      conversations: z.boolean().optional(),
      aiConfig: z.boolean().optional(),
      analytics: z.boolean().optional(),
      settings: z.boolean().optional(),
    })
    .optional(),
});

const updateTeamMemberSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  role: z.enum(["clinic_owner", "dentist", "receptionist", "assistant"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  permissions: z
    .object({
      appointments: z.boolean().optional(),
      patients: z.boolean().optional(),
      conversations: z.boolean().optional(),
      aiConfig: z.boolean().optional(),
      analytics: z.boolean().optional(),
      settings: z.boolean().optional(),
    })
    .optional(),
});

export const getTeamMembers = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: "No tenant context" });

    const users = await User.find({ tenantId }).select("-passwordHash").sort({ createdAt: 1 });

    const formattedUsers = users.map((u) => {
      const role = u.role || "receptionist";
      const fallbackPerms = defaultPermissionsByRole[role as keyof typeof defaultPermissionsByRole] || defaultPermissionsByRole.receptionist;
      return {
        ...u.toObject(),
        permissions: {
          ...fallbackPerms,
          ...(u.permissions || {}),
        },
      };
    });

    res.json(formattedUsers);
  } catch (error) {
    console.error("getTeamMembers error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createTeamMember = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: "No tenant context" });

    const data = createTeamMemberSchema.parse(req.body);
    const normalizedEmail = data.email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ error: "Un utilisateur avec cet email existe déjà" });
    }

    const rawPassword = data.password || Math.random().toString(36).slice(-8) + "A1!";
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const defaultPerms = defaultPermissionsByRole[data.role] || defaultPermissionsByRole.receptionist;
    const finalPermissions = {
      ...defaultPerms,
      ...(data.permissions || {}),
    };

    const newUser = await User.create({
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
    delete (userObj as any).passwordHash;

    res.status(201).json({
      message: "Membre de l'équipe ajouté avec succès",
      user: userObj,
      temporaryPassword: data.password ? undefined : rawPassword,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message || "Données invalides" });
    }
    console.error("createTeamMember error:", error);
    res.status(500).json({ error: "Erreur lors de la création du membre" });
  }
};

export const updateTeamMember = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    const { id } = req.params;

    const user = await User.findOne({ _id: id, ...(tenantId ? { tenantId } : {}) });
    if (!user) {
      return res.status(404).json({ error: "Membre de l'équipe introuvable" });
    }

    const data = updateTeamMemberSchema.parse(req.body);

    if (data.email) {
      const normalizedEmail = data.email.toLowerCase().trim();
      if (normalizedEmail !== user.email) {
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
          return res.status(400).json({ error: "Cet email est déjà utilisé" });
        }
        user.email = normalizedEmail;
      }
    }

    if (data.firstName) user.firstName = data.firstName.trim();
    if (data.lastName) user.lastName = data.lastName.trim();
    if (data.phone !== undefined) user.phone = data.phone.trim();
    if (data.specialty !== undefined) user.specialty = data.specialty.trim();
    if (data.role) user.role = data.role;
    if (data.status) user.status = data.status;

    if (data.permissions) {
      user.permissions = {
        ...(user.permissions || defaultPermissionsByRole[user.role as keyof typeof defaultPermissionsByRole] || {}),
        ...data.permissions,
      };
    }

    await user.save();

    const userObj = user.toObject();
    delete (userObj as any).passwordHash;

    res.json({ message: "Membre mis à jour avec succès", user: userObj });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message || "Données invalides" });
    }
    console.error("updateTeamMember error:", error);
    res.status(500).json({ error: "Erreur lors de la modification du membre" });
  }
};

export const updateTeamMemberStatus = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ error: "Statut invalide" });
    }

    const user = await User.findOne({ _id: id, ...(tenantId ? { tenantId } : {}) });
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
  } catch (error) {
    console.error("updateTeamMemberStatus error:", error);
    res.status(500).json({ error: "Erreur interne" });
  }
};

export const resetTeamMemberPassword = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    const { id } = req.params;
    const { password } = req.body;

    if (!id) {
      return res.status(400).json({ error: "ID requis" });
    }

    const user = await User.findOne({ _id: id, ...(tenantId ? { tenantId } : {}) });
    if (!user) {
      return res.status(404).json({ error: "Membre introuvable" });
    }

    const newPassword = password || Math.random().toString(36).slice(-8) + "B2!";
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({
      message: "Mot de passe réinitialisé avec succès",
      newPassword,
    });
  } catch (error) {
    console.error("resetTeamMemberPassword error:", error);
    res.status(500).json({ error: "Erreur interne" });
  }
};

export const deleteTeamMember = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "ID requis" });
    }

    const user = await User.findOne({ _id: id, ...(tenantId ? { tenantId } : {}) });
    if (!user) {
      return res.status(404).json({ error: "Membre introuvable" });
    }

    if (user.role === "clinic_owner") {
      return res.status(400).json({ error: "Impossible de supprimer le titulaire / propriétaire du cabinet" });
    }

    await User.findByIdAndDelete(id);
    res.json({ message: "Membre supprimé avec succès" });
  } catch (error) {
    console.error("deleteTeamMember error:", error);
    res.status(500).json({ error: "Erreur interne" });
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "super_admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const users = await User.find().populate("tenantId", "name").select("-passwordHash").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
