import { Router } from "express";
import { requestSubscription } from "./subscription.controller";
import { apiLimiter } from "../../shared/middleware/rateLimiter";

const router = Router();

// Apply a generic limiter to avoid spam
router.post("/request", apiLimiter, requestSubscription);

export default router;
