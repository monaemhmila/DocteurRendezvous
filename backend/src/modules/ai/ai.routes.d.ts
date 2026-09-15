/**
 * AI Module — Routes
 *
 * POST /api/v1/ai/conversations/:conversationId/suggestion
 * Requires JWT authentication (requireAuth middleware).
 *
 * No webhook routes — AI is not triggered automatically.
 * No write routes — AI only reads and suggests.
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=ai.routes.d.ts.map