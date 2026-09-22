"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tenant_controller_1 = require("./tenant.controller");
const requireAuth_1 = require("../../shared/middleware/requireAuth");
const router = (0, express_1.Router)();
// All tenant routes require authentication
router.use(requireAuth_1.requireAuth);
router.get("/current", tenant_controller_1.getCurrentTenant);
router.put("/current", tenant_controller_1.updateCurrentTenant);
router.put("/settings", tenant_controller_1.updateTenantSettings);
router.post("/test-ai-key", tenant_controller_1.testAIKey);
// Routes reserved for super_admin
router.post("/", tenant_controller_1.createTenant);
router.get("/", tenant_controller_1.getTenants);
router.put("/:id", tenant_controller_1.updateTenant);
router.patch("/:id/status", tenant_controller_1.updateTenantStatus);
router.post("/:id/reset-password", tenant_controller_1.resetTenantPassword);
router.delete("/:id", tenant_controller_1.deleteTenant);
exports.default = router;
//# sourceMappingURL=tenant.routes.js.map