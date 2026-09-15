"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const patient_controller_1 = require("./patient.controller");
const requireAuth_1 = require("../../shared/middleware/requireAuth");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
router.get("/", patient_controller_1.getPatients);
router.post("/", patient_controller_1.createPatient);
router.get("/:id", patient_controller_1.getPatientById);
router.put("/:id", patient_controller_1.updatePatient);
router.delete("/:id", patient_controller_1.deletePatient);
exports.default = router;
//# sourceMappingURL=patient.routes.js.map