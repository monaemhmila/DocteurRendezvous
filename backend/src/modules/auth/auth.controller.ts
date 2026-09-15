import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../users/user.model";
import { Tenant } from "../tenants/tenant.model";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }

    // Fetch tenant name if user belongs to a tenant
    let tenantName: string | undefined;
    if (user.tenantId) {
      const tenant = await Tenant.findById(user.tenantId);
      tenantName = tenant?.name;
    }

    const initials = `${(user.firstName || "")[0] || ""}${(user.lastName || "")[0] || ""}`.toUpperCase();

    const token = jwt.sign(
      { id: user._id, tenantId: user.tenantId, role: user.role },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "1d" }
    );

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
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Données invalides." });
    }
    res.status(500).json({ error: "Erreur interne du serveur." });
  }
};

export const registerDemo = async (req: Request, res: Response) => {
  // Utility endpoint to seed a tenant and user for testing
  try {
    const existingUser = await User.findOne({ email: "demo@dentalai.com" });
    if (existingUser) {
      return res.status(400).json({ error: "Demo user already exists" });
    }

    const tenant = await Tenant.create({ name: "Demo Clinic" });
    const passwordHash = await bcrypt.hash("password123", 10);
    
    const user = await User.create({
      tenantId: tenant._id,
      email: "demo@dentalai.com",
      passwordHash,
      firstName: "Admin",
      lastName: "Demo",
      role: "clinic_owner"
    });

    res.status(201).json({ message: "Demo account created", user, tenant });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
}
