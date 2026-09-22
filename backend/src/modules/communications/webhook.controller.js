"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebhookEvent = exports.verifyWebhook = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const communication_service_1 = require("./communication.service");
function isValidMetaSignature(req) {
    const appSecret = process.env.META_APP_SECRET?.trim();
    // If META_APP_SECRET is not set in .env, permit incoming webhook in dev/sandbox mode
    if (!appSecret)
        return true;
    if (!req.rawBody)
        return false;
    const signature = req.header("x-hub-signature-256");
    if (!signature?.startsWith("sha256="))
        return false;
    const expected = node_crypto_1.default
        .createHmac("sha256", appSecret)
        .update(req.rawBody)
        .digest("hex");
    const received = signature.slice("sha256=".length);
    const expectedBuffer = Buffer.from(expected, "hex");
    const receivedBuffer = Buffer.from(received, "hex");
    return (expectedBuffer.length === receivedBuffer.length &&
        node_crypto_1.default.timingSafeEqual(expectedBuffer, receivedBuffer));
}
const verifyWebhook = (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
    // Fail closed: never accept a built-in/default verification token.
    if (!verifyToken) {
        return res.status(503).json({ error: "Webhook verification is not configured" });
    }
    if (mode === "subscribe" && token === verifyToken && typeof challenge === "string") {
        console.log("[Webhook] WEBHOOK_VERIFIED");
        return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
};
exports.verifyWebhook = verifyWebhook;
const handleWebhookEvent = async (req, res) => {
    if (!isValidMetaSignature(req)) {
        return res.status(403).json({ error: "Invalid webhook signature" });
    }
    const payload = req.body;
    console.log("[Webhook] Incoming Webhook Event:", JSON.stringify(payload, null, 2));
    if (!payload ||
        payload.object !== "whatsapp_business_account" ||
        !Array.isArray(payload.entry)) {
        console.warn("[Webhook] Non-WhatsApp or invalid payload format:", payload);
        return res.status(400).json({ error: "Invalid webhook payload" });
    }
    // Meta requires a 200 OK response immediately to acknowledge receipt.
    res.status(200).send("EVENT_RECEIVED");
    communication_service_1.communicationService.handleWebhook(payload).catch((error) => {
        console.error("[Webhook] Error processing event asynchronously:", error);
    });
};
exports.handleWebhookEvent = handleWebhookEvent;
//# sourceMappingURL=webhook.controller.js.map