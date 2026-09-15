"use strict";
/**
 * AI Module — Controller
 *
 * Handles HTTP requests for AI suggestion generation.
 * Enforces that tenantId comes from req.user (set by requireAuth middleware).
 *
 * Route: POST /api/v1/ai/conversations/:conversationId/suggestion
 *
 * Error mapping:
 *   ConversationNotFoundError   → 404
 *   ProviderNotConfiguredError  → 503
 *   ProviderUnavailableError    → 503
 *   Any other error             → 500
 *
 * SECURITY:
 *   - tenantId is NEVER read from req.body, req.query, or req.params
 *   - AI credentials are NEVER included in any HTTP response
 *   - conversationId is the only external identifier accepted from params
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAISuggestion = getAISuggestion;
exports.executeAIActionHandler = executeAIActionHandler;
const ai_service_1 = require("./ai.service");
const openai_compatible_provider_1 = require("./openai-compatible.provider");
const ai_errors_1 = require("./ai.errors");
const ai_action_executor_1 = require("./ai.action.executor");
// Singleton service — provider is injected here and can be swapped for tests
const defaultProvider = new openai_compatible_provider_1.OpenAICompatibleProvider();
const defaultAIService = new ai_service_1.AIService(defaultProvider);
async function getAISuggestion(req, res) {
    // tenantId MUST come from the auth middleware — never from request input
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
        res.status(403).json({ error: "Forbidden: authentication required" });
        return;
    }
    const rawConversationId = req.params["conversationId"];
    const conversationId = Array.isArray(rawConversationId) ? rawConversationId[0] : rawConversationId;
    if (!conversationId) {
        res.status(404).json({ error: "Conversation not found" });
        return;
    }
    try {
        const result = await defaultAIService.getSuggestion(tenantId, conversationId);
        res.status(200).json({ suggestion: result.suggestion, action: result.action ?? null });
    }
    catch (err) {
        if (err instanceof ai_errors_1.ConversationNotFoundError) {
            res.status(404).json({ error: err.message });
            return;
        }
        if (err instanceof ai_errors_1.ProviderNotConfiguredError) {
            res.status(503).json({ error: err.message });
            return;
        }
        if (err instanceof ai_errors_1.ProviderUnavailableError) {
            res.status(503).json({ error: err.message });
            return;
        }
        // Unexpected error — log it but never expose internals
        console.error("[AI] Unexpected error in getAISuggestion:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
}
/**
 * POST /api/v1/ai/conversations/:conversationId/actions/execute
 *
 * Executes an AI-proposed action ONLY after explicit human approval.
 *
 * SECURITY:
 *   - tenantId from JWT only
 *   - conversation must belong to tenant
 *   - target (recovery/appointment) must belong to same patient as conversation
 *   - action type validated against allowlist
 *   - confidence is NEVER used as authorization criteria
 */
async function executeAIActionHandler(req, res) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
        res.status(403).json({ error: "Forbidden: authentication required" });
        return;
    }
    const rawConversationId = req.params["conversationId"];
    const conversationId = Array.isArray(rawConversationId) ? rawConversationId[0] : rawConversationId;
    if (!conversationId) {
        res.status(404).json({ error: "Conversation not found" });
        return;
    }
    const { type, targetId, booking } = req.body;
    if (!type || !targetId) {
        res.status(400).json({ error: "Missing required fields: type, targetId" });
        return;
    }
    try {
        const result = await (0, ai_action_executor_1.executeAIAction)(tenantId, conversationId, { type, targetId, booking });
        res.status(200).json(result);
    }
    catch (err) {
        if (err instanceof ai_action_executor_1.InvalidActionTypeError) {
            res.status(400).json({ error: err.message });
            return;
        }
        if (err instanceof ai_action_executor_1.ActionTargetNotFoundError) {
            res.status(404).json({ error: err.message });
            return;
        }
        if (err instanceof ai_action_executor_1.ActionConversationMismatchError) {
            res.status(400).json({ error: err.message });
            return;
        }
        if (err instanceof ai_action_executor_1.ActionTransitionError) {
            res.status(409).json({ error: err.message });
            return;
        }
        console.error("[AI] Unexpected error in executeAIActionHandler:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
}
//# sourceMappingURL=ai.controller.js.map