import { Router } from "express";
import { login, registerDemo, refreshToken } from "./auth.controller";
import { loginLimiter, refreshTokenLimiter } from "../../shared/middleware/rateLimiter";

const router = Router();

router.post("/login", loginLimiter, login as any);
router.post("/refresh-token", refreshTokenLimiter, refreshToken as any);
router.post("/register-demo", registerDemo as any);

export default router;

