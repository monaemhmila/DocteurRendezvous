import { rateLimit } from 'express-rate-limit';

// Standard rate limiter for API endpoints (protects against general abuse)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: "Too many requests, please try again later." }
});

// Stricter rate limiter for Webhooks (WhatsApp will retry if it gets a 429)
export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // Limit each IP to 300 webhook events per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Webhook rate limit exceeded" }
});
