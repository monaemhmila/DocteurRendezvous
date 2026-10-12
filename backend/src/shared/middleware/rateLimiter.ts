/**
 * Rate Limiters — DocteurRendezvous
 *
 * One limiter per threat surface to avoid collateral damage:
 *   - loginLimiter        : brute-force on credentials
 *   - refreshTokenLimiter : token-replay / enumeration
 *   - aiLimiter           : costly LLM calls
 *   - apiLimiter          : general authenticated API abuse
 *   - webhookLimiter      : Meta WhatsApp webhook (permissive — Meta retries on 429)
 *
 * ⚠️  Production / multi-instance note:
 *   The default MemoryStore is per-process. In a multi-instance deployment
 *   (PM2 cluster, Docker replicas, k8s) counters are NOT shared across pods.
 *   Replace the store with a shared backend before going to production:
 *
 *     import RedisStore from 'rate-limit-redis';
 *     import { createClient } from 'redis';
 *     const redisClient = createClient({ url: process.env.REDIS_URL });
 *     const store = new RedisStore({ sendCommand: (...args) => redisClient.sendCommand(args) });
 *
 *   Then pass `store` to each limiter options object below.
 */

import { rateLimit, Options } from 'express-rate-limit';

// ── Shared defaults ────────────────────────────────────────────────────────

const defaults: Partial<Options> = {
  standardHeaders: 'draft-7', // RFC-compliant RateLimit-* headers
  legacyHeaders: false,        // No deprecated X-RateLimit-* headers
};

// ── Auth limiters ──────────────────────────────────────────────────────────

/**
 * Login brute-force protection.
 * 10 attempts / 15 min per IP.
 * skipSuccessfulRequests: only failed logins count toward the limit.
 */
export const loginLimiter = rateLimit({
  ...defaults,
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
});

/**
 * Refresh-token replay / enumeration protection.
 * 30 refreshes / 15 min per IP covers normal SPA rotation.
 */
export const refreshTokenLimiter = rateLimit({
  ...defaults,
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Trop de tentatives de renouvellement de token.' },
});

// ── AI endpoints ───────────────────────────────────────────────────────────

/**
 * AI suggestion / action endpoints.
 * LLM calls are expensive. 60 req / 15 min per IP prevents runaway costs
 * while comfortably covering normal clinical usage (~4 req/min).
 */
export const aiLimiter = rateLimit({
  ...defaults,
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Limite des appels IA atteinte. Réessayez dans quelques minutes.' },
});

// ── General authenticated API ──────────────────────────────────────────────

/**
 * Default protection for all /api/v1/* routes.
 * 200 req / 15 min per IP. Mounted in server.ts AFTER auth and webhook routes
 * so stricter / more permissive per-route limits take precedence.
 */
export const apiLimiter = rateLimit({
  ...defaults,
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Trop de requêtes. Réessayez dans quelques minutes.' },
});

// ── Webhook (Meta WhatsApp) ────────────────────────────────────────────────

/**
 * Meta webhook receiver — intentionally permissive.
 *
 * Meta retries deliveries when it receives a 429, which creates a
 * positive-feedback loop. This limiter is a last-resort circuit-breaker,
 * not a business limiter. 600 events/min ≈ 10 events/s.
 */
export const webhookLimiter = rateLimit({
  ...defaults,
  windowMs: 60 * 1000,
  max: 600,
  message: { error: 'Webhook rate limit exceeded.' },
});

