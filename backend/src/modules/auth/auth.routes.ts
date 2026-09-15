import { Router } from "express";
import { login, registerDemo } from "./auth.controller";

const router = Router();

router.post("/login", login as any);
router.post("/register-demo", registerDemo as any);

export default router;
