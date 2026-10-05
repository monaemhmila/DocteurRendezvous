import { Router } from "express";
import { login, registerDemo, refreshToken } from "./auth.controller";

const router = Router();

router.post("/login", login as any);
router.post("/refresh-token", refreshToken as any);
router.post("/register-demo", registerDemo as any);

export default router;
