"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stats_controller_1 = require("./stats.controller");
const analytics_controller_1 = require("./analytics.controller");
const requireAuth_1 = require("../../shared/middleware/requireAuth");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
router.get("/dashboard", stats_controller_1.getDashboardStats);
router.get("/analytics/overview", analytics_controller_1.getAnalyticsOverview);
exports.default = router;
//# sourceMappingURL=stats.routes.js.map