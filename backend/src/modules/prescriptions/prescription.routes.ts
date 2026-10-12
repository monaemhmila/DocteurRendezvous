import { Router } from "express";
import { getPrescriptions, createPrescription, deletePrescription } from "./prescription.controller";
import { requireAuth } from "../../shared/middleware/requireAuth";

const router = Router();

router.use(requireAuth as any);

router.get("/", getPrescriptions as any);
router.post("/", createPrescription as any);
router.delete("/:id", deletePrescription as any);

export default router;
