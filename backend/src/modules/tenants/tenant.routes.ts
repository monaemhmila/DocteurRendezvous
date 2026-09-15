import { Router } from "express";
import { createTenant, getTenants, getCurrentTenant } from "./tenant.controller";
import { requireAuth } from "../../shared/middleware/requireAuth";

const router = Router();

// Toutes les routes tenant requièrent d'être connecté
router.use(requireAuth as any);

router.get("/current", getCurrentTenant as any);

// Routes réservées au super_admin
router.post("/", createTenant as any);
router.get("/", getTenants as any);

export default router;
