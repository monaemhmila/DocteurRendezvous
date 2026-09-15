import { Router } from "express";
import { getAppointments, createAppointment, updateAppointment, deleteAppointment, checkAvailability, updateAppointmentStatus, getNoShows } from "./appointment.controller";
import { requireAuth } from "../../shared/middleware/requireAuth";

const router = Router();

router.use(requireAuth as any);

router.get("/availability", checkAvailability as any);
router.get("/no-shows", getNoShows as any);
router.get("/", getAppointments as any);
router.post("/", createAppointment as any);
router.put("/:id", updateAppointment as any);
router.patch("/:id/status", updateAppointmentStatus as any);
router.delete("/:id", deleteAppointment as any);

export default router;
