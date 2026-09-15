"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const appointment_controller_1 = require("./appointment.controller");
const requireAuth_1 = require("../../shared/middleware/requireAuth");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
router.get("/availability", appointment_controller_1.checkAvailability);
router.get("/no-shows", appointment_controller_1.getNoShows);
router.get("/", appointment_controller_1.getAppointments);
router.post("/", appointment_controller_1.createAppointment);
router.put("/:id", appointment_controller_1.updateAppointment);
router.patch("/:id/status", appointment_controller_1.updateAppointmentStatus);
router.delete("/:id", appointment_controller_1.deleteAppointment);
exports.default = router;
//# sourceMappingURL=appointment.routes.js.map