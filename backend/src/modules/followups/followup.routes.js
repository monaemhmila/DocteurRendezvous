"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const followup_controller_1 = require("./followup.controller");
const requireAuth_1 = require("../../shared/middleware/requireAuth");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
router.get("/", followup_controller_1.followupController.getTasks);
router.post("/", followup_controller_1.followupController.createTask);
router.get("/:id", followup_controller_1.followupController.getTaskById);
router.post("/:id/complete", followup_controller_1.followupController.completeTask);
// Attempts endpoints
router.post("/attempts", followup_controller_1.followupController.logAttempt);
router.get("/attempts/:recoveryId", followup_controller_1.followupController.getAttemptsForRecovery);
router.get("/attempts/waitlist/:waitlistEntryId", followup_controller_1.followupController.getAttemptsForWaitlistEntry);
exports.default = router;
//# sourceMappingURL=followup.routes.js.map