"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("./user.controller");
const requireAuth_1 = require("../../shared/middleware/requireAuth");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
// Team routes for clinic owners and authenticated members
router.get("/team", user_controller_1.getTeamMembers);
router.post("/team", user_controller_1.createTeamMember);
router.put("/team/:id", user_controller_1.updateTeamMember);
router.patch("/team/:id/status", user_controller_1.updateTeamMemberStatus);
router.post("/team/:id/reset-password", user_controller_1.resetTeamMemberPassword);
router.delete("/team/:id", user_controller_1.deleteTeamMember);
// Super admin global user list
router.get("/all", user_controller_1.getAllUsers);
exports.default = router;
//# sourceMappingURL=user.routes.js.map