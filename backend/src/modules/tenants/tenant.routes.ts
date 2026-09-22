import { Router } from "express";
import {
  createTenant,
  getTenants,
  getCurrentTenant,
  updateCurrentTenant,
  updateTenant,
  updateTenantStatus,
  resetTenantPassword,
  deleteTenant,
  updateTenantSettings,
  testAIKey,
} from "./tenant.controller";
import { requireAuth } from "../../shared/middleware/requireAuth";

const router = Router();

// All tenant routes require authentication
router.use(requireAuth as any);

router.get("/current", getCurrentTenant as any);
router.put("/current", updateCurrentTenant as any);
router.put("/settings", updateTenantSettings as any);
router.post("/test-ai-key", testAIKey as any);

// Routes reserved for super_admin
router.post("/", createTenant as any);
router.get("/", getTenants as any);
router.put("/:id", updateTenant as any);
router.patch("/:id/status", updateTenantStatus as any);
router.post("/:id/reset-password", resetTenantPassword as any);
router.delete("/:id", deleteTenant as any);

export default router;
