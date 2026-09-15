import { Router } from "express";
import { getDashboardStats } from "./stats.controller";
import { getAnalyticsOverview } from "./analytics.controller";
import { requireAuth } from "../../shared/middleware/requireAuth";

const router = Router();

router.use(requireAuth as any);

router.get("/dashboard", getDashboardStats as any);
router.get("/analytics/overview", getAnalyticsOverview as any);

export default router;
