/**
 * Phase 6.9 Integration Tests
 * Idempotence, Concurrency, and Resilience of the Auto-Booking system.
 *
 * Tests cover:
 * - Duplicate webhook handling (providerMessageId dedup)
 * - Race condition / double booking protection (MongoDB unique index)
 * - Booking idempotency (retry without creating duplicate appointments)
 * - WhatsApp failure & retry (appointment preserved, message retried)
 */
export {};
//# sourceMappingURL=phase6.9.test.d.ts.map