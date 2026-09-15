import { Router } from "express";
import { getPatients, getPatientById, createPatient, updatePatient, deletePatient } from "./patient.controller";
import { requireAuth } from "../../shared/middleware/requireAuth";

const router = Router();

router.use(requireAuth as any);

router.get("/", getPatients as any);
router.post("/", createPatient as any);
router.get("/:id", getPatientById as any);
router.put("/:id", updatePatient as any);
router.delete("/:id", deletePatient as any);

export default router;
