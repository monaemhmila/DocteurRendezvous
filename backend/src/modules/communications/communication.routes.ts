import { Router } from "express";
import { requireAuth } from "../../shared/middleware/requireAuth";
import { getConversations, getConversationMessages, sendMessage, simulateInboundMessage } from "./communication.controller";
import { verifyWebhook, handleWebhookEvent } from "./webhook.controller";

const router = Router();

// ==========================================
// PUBLIC WEBHOOK ROUTES (External / Meta)
// ==========================================
router.get("/webhook", verifyWebhook as any);
router.post("/webhook", handleWebhookEvent as any);
router.get("/webhook/whatsapp", verifyWebhook as any);
router.post("/webhook/whatsapp", handleWebhookEvent as any);

// ==========================================
// INTERNAL PROTECTED ROUTES (Frontend API)
// ==========================================
router.get("/conversations", requireAuth as any, getConversations as any);
router.get("/conversations/:id/messages", requireAuth as any, getConversationMessages as any);
router.post("/conversations/:id/messages", requireAuth as any, sendMessage as any);
router.post("/simulate-inbound", requireAuth as any, simulateInboundMessage as any);

export default router;
