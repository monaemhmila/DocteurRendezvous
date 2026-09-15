"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const waitlist_controller_1 = require("./waitlist.controller");
const requireAuth_1 = require("../../shared/middleware/requireAuth");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
router.get("/", waitlist_controller_1.waitlistController.getEntries);
router.post("/", waitlist_controller_1.waitlistController.createEntry);
router.delete("/:id", waitlist_controller_1.waitlistController.cancelEntry);
router.post("/:id/fulfill", waitlist_controller_1.waitlistController.fulfillEntry);
exports.default = router;
//# sourceMappingURL=waitlist.routes.js.map