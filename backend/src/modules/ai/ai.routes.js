"use strict";
/**
 * AI Module — Routes
 *
 * POST /api/v1/ai/conversations/:conversationId/suggestion
 * Requires JWT authentication (requireAuth middleware).
 *
 * No webhook routes — AI is not triggered automatically.
 * No write routes — AI only reads and suggests.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAuth_1 = require("../../shared/middleware/requireAuth");
const ai_controller_1 = require("./ai.controller");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
router.post("/conversations/:conversationId/suggestion", ai_controller_1.getAISuggestion);
router.post("/conversations/:conversationId/actions/execute", ai_controller_1.executeAIActionHandler);
exports.default = router;
//# sourceMappingURL=ai.routes.js.map