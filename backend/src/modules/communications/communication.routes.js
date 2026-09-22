"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAuth_1 = require("../../shared/middleware/requireAuth");
const communication_controller_1 = require("./communication.controller");
const webhook_controller_1 = require("./webhook.controller");
const router = (0, express_1.Router)();
// ==========================================
// PUBLIC WEBHOOK ROUTES (External / Meta)
// ==========================================
router.get("/webhook", webhook_controller_1.verifyWebhook);
router.post("/webhook", webhook_controller_1.handleWebhookEvent);
router.get("/webhook/whatsapp", webhook_controller_1.verifyWebhook);
router.post("/webhook/whatsapp", webhook_controller_1.handleWebhookEvent);
// ==========================================
// INTERNAL PROTECTED ROUTES (Frontend API)
// ==========================================
router.get("/conversations", requireAuth_1.requireAuth, communication_controller_1.getConversations);
router.get("/conversations/:id/messages", requireAuth_1.requireAuth, communication_controller_1.getConversationMessages);
router.post("/conversations/:id/messages", requireAuth_1.requireAuth, communication_controller_1.sendMessage);
router.post("/simulate-inbound", requireAuth_1.requireAuth, communication_controller_1.simulateInboundMessage);
exports.default = router;
//# sourceMappingURL=communication.routes.js.map