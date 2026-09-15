"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const recovery_controller_1 = require("./recovery.controller");
const requireAuth_1 = require("../../shared/middleware/requireAuth");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
router.get("/", recovery_controller_1.recoveryController.getOpportunities);
router.get("/stats", recovery_controller_1.recoveryController.getStats);
router.post("/detect", recovery_controller_1.recoveryController.detectOpportunities);
router.get("/:id", recovery_controller_1.recoveryController.getOpportunityById);
router.post("/", recovery_controller_1.recoveryController.createOpportunity);
router.patch("/:id", recovery_controller_1.recoveryController.updateOpportunity);
// Lifecycle actions
router.post("/:id/contacted", recovery_controller_1.recoveryController.markContacted);
router.post("/:id/responded", recovery_controller_1.recoveryController.markResponded);
router.post("/:id/booked", recovery_controller_1.recoveryController.markBooked);
router.post("/:id/visited", recovery_controller_1.recoveryController.markVisited);
router.post("/:id/dismiss", recovery_controller_1.recoveryController.dismissOpportunity);
exports.default = router;
//# sourceMappingURL=recovery.routes.js.map