"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tenant_controller_1 = require("./tenant.controller");
const requireAuth_1 = require("../../shared/middleware/requireAuth");
const router = (0, express_1.Router)();
// Toutes les routes tenant requièrent d'être connecté
router.use(requireAuth_1.requireAuth);
router.get("/current", tenant_controller_1.getCurrentTenant);
// Routes réservées au super_admin
router.post("/", tenant_controller_1.createTenant);
router.get("/", tenant_controller_1.getTenants);
exports.default = router;
//# sourceMappingURL=tenant.routes.js.map