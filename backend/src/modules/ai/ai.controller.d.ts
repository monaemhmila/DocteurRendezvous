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
import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/requireAuth";
export declare function getAISuggestion(req: AuthRequest, res: Response): Promise<void>;
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
export declare function executeAIActionHandler(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=ai.controller.d.ts.map