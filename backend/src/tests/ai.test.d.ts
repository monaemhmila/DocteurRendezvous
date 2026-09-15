/**
 * Phase 6.3 — AI Foundation Tests
 *
 * Tests the AI suggestion module with a mock provider.
 * NO real AI API calls are made. NO real API keys are required.
 *
 * Test coverage:
 *   1.  No auth (req.user missing)                → 403
 *   2.  Invalid conversationId format             → 404
 *   3.  Conversation not found                    → 404
 *   4.  Cross-tenant access                       → 404 (not 403, to avoid leaking existence)
 *   5.  Provider not configured (env vars missing)→ 503
 *   6.  Provider available, no patient linked     → 200 with suggestion
 *   7.  Provider available, patient linked        → 200 with suggestion
 *   8.  Provider unavailable (network error)      → 503
 *   9.  Provider timeout                          → 503
 *  10.  AI credentials never in HTTP response     → verified
 *  11.  Cross-tenant patient not loaded           → verified
 *  12.  No Message or Conversation DB writes      → verified
 */
export {};
//# sourceMappingURL=ai.test.d.ts.map