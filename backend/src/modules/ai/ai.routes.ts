/**
 * AI Module — Routes
 *
 * POST /api/v1/ai/conversations/:conversationId/suggestion
 * Requires JWT authentication (requireAuth middleware).
 *
 * No webhook routes — AI is not triggered automatically.
 * No write routes — AI only reads and suggests.
 */

import { Router } from "express";
import { requireAuth, requireRole } from "../../shared/middleware/requireAuth";
import { getAISuggestion, executeAIActionHandler } from "./ai.controller";

const router = Router();

router.use(requireAuth as any);

router.post("/conversations/:conversationId/suggestion", requireRole("clinic_owner", "dentist", "receptionist") as any, getAISuggestion as any);
router.post("/conversations/:conversationId/actions/execute", requireRole("clinic_owner", "dentist", "receptionist") as any, executeAIActionHandler as any);

export default router;
