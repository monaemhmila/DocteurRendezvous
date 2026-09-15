"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("./user.controller");
const requireAuth_1 = require("../../shared/middleware/requireAuth");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
router.get("/team", user_controller_1.getTeamMembers);
router.get("/all", user_controller_1.getAllUsers);
exports.default = router;
//# sourceMappingURL=user.routes.js.map