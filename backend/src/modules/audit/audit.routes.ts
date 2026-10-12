import { Router } from "express";
import { getAuditLogs, createAuditLog } from "./audit.controller";
import { requireAuth } from "../../shared/middleware/requireAuth";

const router = Router();

router.use(requireAuth);

router.get("/", getAuditLogs);
router.post("/", createAuditLog);

export default router;
