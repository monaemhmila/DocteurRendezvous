import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { Tenant } from "./tenant.model";
import { User } from "../users/user.model";
import { z } from "zod";
import { AuthRequest } from "../../shared/middleware/requireAuth";

const createTenantSchema = z.object({
  clinicName: z.string().min(2),
  ownerName: z.string().min(2),
  ownerEmail: z.string().email(),
  // Optionnel: On pourrait générer le mot de passe et l'envoyer par email
  ownerPassword: z.string().min(6).optional(),
});

export const createTenant = async (req: AuthRequest, res: Response) => {
  try {
    // 1. Vérification des droits : Seul un super_admin peut créer un tenant
    if (req.user?.role !== "super_admin") {
      return res.status(403).json({ error: "Forbidden: Super Admin access required" });
    }

    const { clinicName, ownerName, ownerEmail, ownerPassword } = createTenantSchema.parse(req.body);

    // Vérifier si l'utilisateur (owner) existe déjà
    const existingUser = await User.findOne({ email: ownerEmail });
    if (existingUser) {
      return res.status(400).json({ error: "Un utilisateur avec cet email existe déjà" });
    }

    // 2. Création du Tenant (le cabinet médical)
    const tenant = await Tenant.create({ name: clinicName });

    // 3. Création du mot de passe
    const rawPassword = ownerPassword || Math.random().toString(36).slice(-8); // Mdp généré par défaut
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const [firstName, ...lastNames] = ownerName.split(" ");

    // 4. Création de l'utilisateur Propriétaire (clinic_owner) lié au tenant
    const user = await User.create({
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

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getTenants = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "super_admin") {
      return res.status(403).json({ error: "Forbidden: Super Admin access required" });
    }

    const tenants = await Tenant.find().sort({ createdAt: -1 });
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getCurrentTenant = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "No tenant context" });

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });
    
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

