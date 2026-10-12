import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { Tenant } from "./tenant.model";
import { User } from "../users/user.model";
import { Patient } from "../patients/patient.model";
import { Appointment } from "../appointments/appointment.model";
import { z } from "zod";
import { AuthRequest } from "../../shared/middleware/requireAuth";
import { getPlanLimits, getQuotaPercent, FEATURE_LABELS, PlanFeatureKey } from "../../shared/plan-limits";

const getDefaultServices = (specialty: string) => {
  const norm = specialty.toLowerCase().trim();
  if (norm.includes("dent")) {
    return [
      { id: "s1", name: "Consultation Dentaire", durationMin: 30, price: 60, description: "Consultation de routine" },
      { id: "s2", name: "Détartrage", durationMin: 30, price: 80, description: "Nettoyage complet" },
      { id: "s3", name: "Soin Carie / Composite", durationMin: 45, price: 120, description: "Soin de carie standard" },
      { id: "s4", name: "Extraction simple", durationMin: 45, price: 100 },
      { id: "s5", name: "Urgence Dentaire", durationMin: 30, price: 80 },
    ];
  } else if (norm.includes("derma")) {
    return [
      { id: "s1", name: "Consultation Dermatologique", durationMin: 20, price: 60 },
      { id: "s2", name: "Séance de Laser", durationMin: 45, price: 150 },
      { id: "s3", name: "Retrait grain de beauté", durationMin: 30, price: 120 },
    ];
  } else if (norm.includes("gyn")) {
    return [
      { id: "s1", name: "Consultation Gynécologique", durationMin: 30, price: 70 },
      { id: "s2", name: "Suivi de grossesse", durationMin: 30, price: 60 },
      { id: "s3", name: "Échographie", durationMin: 30, price: 90 },
    ];
  } else if (norm.includes("cardio")) {
    return [
      { id: "s1", name: "Consultation Cardiologique", durationMin: 30, price: 80 },
      { id: "s2", name: "ECG", durationMin: 20, price: 100 },
      { id: "s3", name: "Échographie cardiaque", durationMin: 45, price: 150 },
    ];
  } else if (norm.includes("péd") || norm.includes("ped")) {
    return [
      { id: "s1", name: "Consultation Pédiatrique", durationMin: 30, price: 60 },
      { id: "s2", name: "Vaccination", durationMin: 15, price: 40 },
    ];
  } else {
    // Default / Médecine Générale
    return [
      { id: "s1", name: "Consultation Générale", durationMin: 20, price: 50 },
      { id: "s2", name: "Visite de contrôle", durationMin: 15, price: 40 },
      { id: "s3", name: "Certificat Médical", durationMin: 15, price: 40 },
    ];
  }
};

function toTenantPublicDTO(tenant: any) {
  const obj = tenant.toObject ? tenant.toObject() : { ...tenant };
  
  const whatsappConfigured = !!(obj.settings?.whatsappConfig?.accessToken && obj.settings?.whatsappConfig?.phoneNumberId);
  const aiConfigured = !!(obj.settings?.aiConfig?.apiKey);
  
  if (obj.settings?.whatsappConfig) {
    delete obj.settings.whatsappConfig.accessToken;
    delete obj.settings.whatsappConfig.verifyToken;
  }
  if (obj.settings?.aiConfig) {
    delete obj.settings.aiConfig.apiKey;
  }
  
  return {
    ...obj,
    whatsappConfigured,
    aiConfigured
  };
}
const createTenantSchema = z.object({
  clinicName: z.string().min(2, "Le nom du cabinet doit contenir au moins 2 caractères"),
  ownerName: z.string().min(2, "Le nom du médecin est requis"),
  ownerEmail: z.string().email("Adresse email invalide"),
  ownerPassword: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères").optional(),
  specialty: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  plan: z.enum(["starter", "pro", "enterprise"]).optional(),
});

const updateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  specialty: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  currency: z.string().optional(),
  plan: z.enum(["starter", "pro", "enterprise"]).optional(),
  status: z.enum(["active", "suspended", "trial"]).optional(),
  suspensionReason: z.string().optional(),
  ownerName: z.string().optional(),
  ownerEmail: z.string().email().optional(),
  settings: z.any().optional(),
});

export const createTenant = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "super_admin") {
      return res.status(403).json({ error: "Accès réservé au Super Admin" });
    }

    const data = createTenantSchema.parse(req.body);

    const existingUser = await User.findOne({ email: data.ownerEmail.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ error: "Un utilisateur avec cette adresse email existe déjà" });
    }

    // 1. Create Tenant
    const tenant = await Tenant.create({
      name: data.clinicName.trim(),
      specialty: data.specialty || "Générale",
      email: data.ownerEmail.toLowerCase().trim(),
      phone: data.phone || "",
      address: data.address || "",
      status: "active",
      plan: data.plan || "pro",
      settings: {
        services: getDefaultServices(data.specialty || "Générale"),
      },
    });

    // 2. Setup Password
    const rawPassword = data.ownerPassword || Math.random().toString(36).slice(-8) + "A1!";
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const parts = data.ownerName.trim().split(" ");
    const firstName = parts[0] || "Dr.";
    const lastName = parts.slice(1).join(" ") || "Médecin";

    // 3. Create Clinic Owner User
    const user = await User.create({
      tenantId: tenant._id,
      email: data.ownerEmail.toLowerCase().trim(),
      passwordHash,
      firstName,
      lastName,
      role: "clinic_owner",
    });

    res.status(201).json({
      message: "Cabinet créé avec succès",
      tenant: toTenantPublicDTO(tenant),
      owner: {
        id: user._id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
      },
      passwordResetRequired: true,
    });
  } catch (error: any) {
    if (error?.name === "ZodError" || error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message || "Données invalides" });
    }
    console.error("createTenant error:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
};

export const getTenants = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "super_admin") {
      return res.status(403).json({ error: "Accès réservé au Super Admin" });
    }

    const tenants = await Tenant.find().sort({ createdAt: -1 });

    // Fetch owners and aggregate counts for each tenant
    const tenantsWithDetails = await Promise.all(
      tenants.map(async (t) => {
        const [owner, userCount, patientCount, appointmentCount] = await Promise.all([
          User.findOne({ tenantId: t._id, role: "clinic_owner" }).select("firstName lastName email phone"),
          User.countDocuments({ tenantId: t._id }),
          Patient.countDocuments({ tenantId: t._id }),
          Appointment.countDocuments({ tenantId: t._id }),
        ]);

        return {
          ...toTenantPublicDTO(t),
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
      })
    );

    res.json(tenantsWithDetails);
  } catch (error) {
    console.error("getTenants error:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
};

export const updateTenant = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "super_admin") {
      return res.status(403).json({ error: "Accès réservé au Super Admin" });
    }

    const { id } = req.params;
    const data = updateTenantSchema.parse(req.body);

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ error: "Cabinet introuvable" });
    }

    if (data.name) tenant.name = data.name;
    if (data.specialty !== undefined) {
      const newSpecialty = data.specialty.trim();
      // If specialty changed or services are empty, re-inject defaults
      if (tenant.specialty !== newSpecialty || !tenant.settings?.services || tenant.settings.services.length === 0) {
        tenant.settings = tenant.settings || {};
        if (!tenant.settings.services || tenant.settings.services.length === 0) {
          tenant.settings.services = getDefaultServices(newSpecialty);
          tenant.markModified("settings");
        }
      }
      tenant.specialty = newSpecialty;
    }
    if (data.email !== undefined) tenant.email = data.email;
    if (data.phone !== undefined) tenant.phone = data.phone;
    if (data.address !== undefined) tenant.address = data.address;
    if (data.currency !== undefined) tenant.currency = data.currency;
    if (data.plan !== undefined) tenant.plan = data.plan;
    if (data.status !== undefined) tenant.status = data.status;
    if (data.suspensionReason !== undefined) tenant.suspensionReason = data.suspensionReason;
    if (data.settings !== undefined) {
      tenant.settings = {
        ...(tenant.settings || {}),
        ...data.settings,
      };
      tenant.markModified("settings");
    }

    await tenant.save();

    // Update owner user name/email if specified
    if (data.ownerName || data.ownerEmail) {
      const owner = await User.findOne({ tenantId: tenant._id, role: "clinic_owner" });
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

    res.json({ message: "Cabinet mis à jour avec succès", tenant: toTenantPublicDTO(tenant) });
  } catch (error: any) {
    if (error?.name === "ZodError" || error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message || "Données invalides" });
    }
    console.error("updateTenant error:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
};

export const updateTenantStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "super_admin") {
      return res.status(403).json({ error: "Accès réservé au Super Admin" });
    }

    const { id } = req.params;
    const { status, suspensionReason } = req.body;

    if (!["active", "suspended", "trial"].includes(status)) {
      return res.status(400).json({ error: "Statut invalide (active, suspended, trial)" });
    }

    const tenant = await Tenant.findByIdAndUpdate(
      id,
      {
        status,
        suspensionReason: status === "suspended" ? suspensionReason || "Retard de paiement" : "",
      },
      { returnDocument: 'after' }
    );

    if (!tenant) {
      return res.status(404).json({ error: "Cabinet introuvable" });
    }

    res.json({ message: `Statut du cabinet mis à jour: ${status}`, tenant: toTenantPublicDTO(tenant) });
  } catch (error) {
    console.error("updateTenantStatus error:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
};

export const resetTenantPassword = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "super_admin") {
      return res.status(403).json({ error: "Accès réservé au Super Admin" });
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    const owner = await User.findOne({ tenantId: id, role: "clinic_owner" });
    if (!owner) {
      return res.status(404).json({ error: "Médecin / propriétaire du cabinet introuvable" });
    }

    const passwordToSet = newPassword || Math.random().toString(36).slice(-8) + "B2!";
    if (passwordToSet.length < 6) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères" });
    }

    owner.passwordHash = await bcrypt.hash(passwordToSet, 10);
    await owner.save();

    res.json({
      message: "Mot de passe réinitialisé avec succès",
      email: owner.email,
      passwordResetRequired: true,
    });
  } catch (error) {
    console.error("resetTenantPassword error:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
};

export const deleteTenant = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "super_admin") {
      return res.status(403).json({ error: "Accès réservé au Super Admin" });
    }

    const { id } = req.params;

    await Promise.all([
      Tenant.findByIdAndDelete(id),
      User.deleteMany({ tenantId: id }),
      Patient.deleteMany({ tenantId: id }),
      Appointment.deleteMany({ tenantId: id }),
    ]);

    res.json({ message: "Cabinet et données associées supprimés avec succès" });
  } catch (error) {
    console.error("deleteTenant error:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
};

export const getCurrentTenant = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: "Contexte de cabinet manquant (NO_TENANT_CONTEXT)" });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant || tenant.status !== "active") {
      return res.status(403).json({ error: "Cabinet introuvable ou inactif (TENANT_NOT_AVAILABLE)" });
    }

    res.json(toTenantPublicDTO(tenant));
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateCurrentTenant = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: "Contexte de cabinet manquant (NO_TENANT_CONTEXT)" });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant || tenant.status !== "active") {
      return res.status(403).json({ error: "Cabinet introuvable ou inactif (TENANT_NOT_AVAILABLE)" });
    }

    const { name, specialty, email, phone, address, currency, settings } = req.body;

    if (name !== undefined) tenant.name = name.trim();
    if (currency !== undefined) tenant.currency = currency.trim();
    if (specialty !== undefined) {
      const newSpecialty = specialty.trim();
      // If specialty changed or services are empty, re-inject defaults
      if (tenant.specialty !== newSpecialty || !tenant.settings?.services || tenant.settings.services.length === 0) {
        tenant.settings = tenant.settings || {};
        if (!tenant.settings.services || tenant.settings.services.length === 0) {
          tenant.settings.services = getDefaultServices(newSpecialty);
          tenant.markModified("settings");
        }
      }
      tenant.specialty = newSpecialty;
    }
    if (email !== undefined) tenant.email = email.trim().toLowerCase();
    if (phone !== undefined) tenant.phone = phone.trim();
    if (address !== undefined) tenant.address = address.trim();

    if (settings && typeof settings === "object") {
      // Prevent overwriting secrets directly
      if (settings.whatsappConfig) {
        delete settings.whatsappConfig.accessToken;
        delete settings.whatsappConfig.verifyToken;
      }
      if (settings.aiConfig) {
        delete settings.aiConfig.apiKey;
      }

      tenant.settings = {
        ...(tenant.settings || {}),
        ...settings,
      };
      tenant.markModified("settings");
    }

    await tenant.save();

    res.json({ message: "Informations du cabinet mises à jour avec succès", tenant: toTenantPublicDTO(tenant) });
  } catch (error: any) {
    console.error("updateCurrentTenant error:", error);
    res.status(500).json({ error: error.message || "Erreur interne" });
  }
};

export const updateTenantSettings = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: "Contexte de cabinet manquant (NO_TENANT_CONTEXT)" });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant || tenant.status !== "active") {
      return res.status(403).json({ error: "Cabinet introuvable ou inactif (TENANT_NOT_AVAILABLE)" });
    }

    const incomingSettings = req.body.settings || req.body;
    if (!incomingSettings || typeof incomingSettings !== "object") {
      return res.status(400).json({ error: "Paramètres invalides" });
    }

    // Prevent overwriting secrets directly
    if (incomingSettings.whatsappConfig) {
      delete incomingSettings.whatsappConfig.accessToken;
      delete incomingSettings.whatsappConfig.verifyToken;
    }
    if (incomingSettings.aiConfig) {
      delete incomingSettings.aiConfig.apiKey;
    }

    tenant.settings = {
      ...(tenant.settings || {}),
      ...incomingSettings,
    };
    tenant.markModified("settings");
    await tenant.save();

    const publicTenant = toTenantPublicDTO(tenant);
    res.json({ message: "Paramètres mis à jour avec succès", settings: publicTenant.settings });
  } catch (error: any) {
    console.error("updateTenantSettings error:", error);
    res.status(500).json({ error: error.message || "Erreur interne" });
  }
};

export const testAIKey = async (req: AuthRequest, res: Response) => {
  try {
    const { apiKey, provider, model } = req.body;

    if (!apiKey || typeof apiKey !== "string") {
      return res.status(400).json({ error: "Clé API manquante" });
    }

    const ALLOWED_AI_PROVIDERS: Record<string, string> = {
      openai: "https://api.openai.com/v1",
      groq: "https://api.groq.com/openai/v1",
      mistral: "https://api.mistral.ai/v1",
    };

    const targetProvider = typeof provider === "string" ? provider : "";
    const baseUrl = ALLOWED_AI_PROVIDERS[targetProvider];

    if (!baseUrl) {
      return res.status(400).json({
        error: "Unsupported AI provider",
        code: "INVALID_PROVIDER",
      });
    }

    const targetUrl = baseUrl + "/chat/completions";
    const targetModel = model || "gpt-4o-mini";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

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
      signal: controller.signal as any,
    });
    
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData?.error?.message || `HTTP ${response.status}`;
      return res.status(400).json({
        success: false,
        error: "Impossible de valider la clé avec ce provider",
      });
    }

    const data: any = await response.json();
    const reply = data?.choices?.[0]?.message?.content || "OK";

    return res.json({
      success: true,
      model: targetModel,
      latencyMs,
      reply: reply.trim(),
    });
  } catch (error: any) {
    if (error.name === "AbortError") {
      return res.status(400).json({
        success: false,
        error: "Timeout lors de la connexion au provider",
      });
    }
    return res.status(500).json({
      success: false,
      error: "Impossible de contacter l'API",
    });
  }
};
/**
 * GET /tenants/plan-usage
 * Returns real-time quota consumption vs plan limits for the current tenant.
 */
export const getPlanUsage = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "NO_TENANT_CONTEXT" });

    const tenant = await Tenant.findById(tenantId).select("plan status name");
    if (!tenant || tenant.status !== "active") {
      return res.status(403).json({ error: "TENANT_SUSPENDED" });
    }

    const limits = getPlanLimits(tenant.plan);

    // First day of current month for monthly quotas
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [patientCount, userCount, appointmentCount] = await Promise.all([
      Patient.countDocuments({ tenantId }),
      User.countDocuments({ tenantId }),
      Appointment.countDocuments({ tenantId, createdAt: { $gte: monthStart } }),
    ]);

    const quotas = {
      patients: {
        current: patientCount,
        max: limits.maxPatients,
        percent: getQuotaPercent(patientCount, limits.maxPatients),
        exceeded: limits.maxPatients !== -1 && patientCount >= limits.maxPatients,
      },
      users: {
        current: userCount,
        max: limits.maxUsers,
        percent: getQuotaPercent(userCount, limits.maxUsers),
        exceeded: limits.maxUsers !== -1 && userCount >= limits.maxUsers,
      },
      appointmentsThisMonth: {
        current: appointmentCount,
        max: limits.maxAppointmentsPerMonth,
        percent: getQuotaPercent(appointmentCount, limits.maxAppointmentsPerMonth),
        exceeded: limits.maxAppointmentsPerMonth !== -1 && appointmentCount >= limits.maxAppointmentsPerMonth,
      },
    };

    // Feature flags
    const featureKeys = [
      "aiEnabled", "aiAutoBooking", "waitlistEnabled", "recoveryEnabled",
      "analyticsEnabled", "multiDoctorEnabled", "customBrandingEnabled",
      "exportEnabled", "noShowPolicyEnabled", "whatsappEnabled", "prioritySupport",
    ] as PlanFeatureKey[];

    const features = featureKeys.map((key) => ({
      key,
      label: FEATURE_LABELS[key],
      enabled: !!(limits[key as keyof typeof limits]),
    }));

    res.json({
      plan: tenant.plan || "pro",
      limits,
      quotas,
      features,
    });
  } catch (error) {
    console.error("getPlanUsage error:", error);
    res.status(500).json({ error: "Erreur interne" });
  }
};

/**
 * GET /tenants/:id/plan-usage  (super_admin only)
 * Returns quota consumption for any tenant.
 */
export const getTenantPlanUsage = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "super_admin") {
      return res.status(403).json({ error: "Acces reserve au Super Admin" });
    }

    const { id } = req.params;
    const tenant = await Tenant.findById(id).select("plan status name");
    if (!tenant) return res.status(404).json({ error: "Cabinet introuvable" });

    const limits = getPlanLimits(tenant.plan);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [patientCount, userCount, appointmentCount] = await Promise.all([
      Patient.countDocuments({ tenantId: id }),
      User.countDocuments({ tenantId: id }),
      Appointment.countDocuments({ tenantId: id, createdAt: { $gte: monthStart } }),
    ]);

    res.json({
      tenantId: id,
      tenantName: tenant.name,
      plan: tenant.plan || "pro",
      limits,
      usage: {
        patients: { current: patientCount, max: limits.maxPatients, percent: getQuotaPercent(patientCount, limits.maxPatients) },
        users: { current: userCount, max: limits.maxUsers, percent: getQuotaPercent(userCount, limits.maxUsers) },
        appointmentsThisMonth: { current: appointmentCount, max: limits.maxAppointmentsPerMonth, percent: getQuotaPercent(appointmentCount, limits.maxAppointmentsPerMonth) },
      },
    });
  } catch (error) {
    console.error("getTenantPlanUsage error:", error);
    res.status(500).json({ error: "Erreur interne" });
  }
};

