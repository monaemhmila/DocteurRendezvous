import { Router } from "express";
import { recoveryController } from "./recovery.controller";
import { requireAuth } from "../../shared/middleware/requireAuth";

const router = Router();

router.use(requireAuth as any);

router.get("/", recoveryController.getOpportunities as any);
router.get("/stats", recoveryController.getStats as any);
router.post("/detect", recoveryController.detectOpportunities as any);
router.get("/:id", recoveryController.getOpportunityById as any);
router.post("/", recoveryController.createOpportunity as any);
router.patch("/:id", recoveryController.updateOpportunity as any);

// Lifecycle actions
router.post("/:id/contacted", recoveryController.markContacted as any);
router.post("/:id/responded", recoveryController.markResponded as any);
router.post("/:id/booked", recoveryController.markBooked as any);
router.post("/:id/visited", recoveryController.markVisited as any);
router.post("/:id/dismiss", recoveryController.dismissOpportunity as any);

export default router;
