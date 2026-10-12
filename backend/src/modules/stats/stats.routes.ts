import { Router } from "express";
import { getDashboardStats } from "./stats.controller";
import { getAnalyticsOverview } from "./analytics.controller";
import { getDoctorStats } from "./doctor-stats.controller";
import { requireAuth } from "../../shared/middleware/requireAuth";

const router = Router();

router.use(requireAuth as any);

router.get("/dashboard", getDashboardStats as any);
router.get("/analytics/overview", getAnalyticsOverview as any);
router.get("/doctors", getDoctorStats as any);

export default router;
