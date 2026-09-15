import { Router } from "express";
import { waitlistController } from "./waitlist.controller";
import { requireAuth } from "../../shared/middleware/requireAuth";

const router = Router();

router.use(requireAuth as any);

router.get("/", waitlistController.getEntries as any);
router.post("/", waitlistController.createEntry as any);
router.delete("/:id", waitlistController.cancelEntry as any);
router.post("/:id/fulfill", waitlistController.fulfillEntry as any);

export default router;
