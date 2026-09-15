import { Router } from "express";
import { followupController } from "./followup.controller";
import { requireAuth } from "../../shared/middleware/requireAuth";

const router = Router();

router.use(requireAuth as any);

router.get("/", followupController.getTasks as any);
router.post("/", followupController.createTask as any);
router.get("/:id", followupController.getTaskById as any);
router.post("/:id/complete", followupController.completeTask as any);

// Attempts endpoints
router.post("/attempts", followupController.logAttempt as any);
router.get("/attempts/:recoveryId", followupController.getAttemptsForRecovery as any);
router.get("/attempts/waitlist/:waitlistEntryId", followupController.getAttemptsForWaitlistEntry as any);

export default router;
