/**
 * AI Module — Routes
 *
 * POST /api/v1/ai/conversations/:conversationId/suggestion
 * POST /api/v1/ai/conversations/:conversationId/actions/execute
 *
 * Both endpoints are:
 *   - Rate-limited (aiLimiter: 60 req / 15 min / IP)
 *   - JWT-authenticated (requireAuth)
 *   - Role-restricted (clinic_owner, dentist, receptionist)
 */

import { Router } from "express";
import { requireAuth, requireRole } from "../../shared/middleware/requireAuth";
import { aiLimiter } from "../../shared/middleware/rateLimiter";
import { getAISuggestion, executeAIActionHandler, analyzeMedicalImageHandler } from "./ai.controller";

const router = Router();

// Apply AI rate limit before auth to catch unauthenticated probing
router.use(aiLimiter);
router.use(requireAuth as any);

router.post("/conversations/:conversationId/suggestion", requireRole("clinic_owner", "dentist", "receptionist") as any, getAISuggestion as any);
router.post("/conversations/:conversationId/actions/execute", requireRole("clinic_owner", "dentist", "receptionist") as any, executeAIActionHandler as any);
router.post("/analyze-image", requireRole("clinic_owner", "dentist", "receptionist") as any, analyzeMedicalImageHandler as any);

export default router;

