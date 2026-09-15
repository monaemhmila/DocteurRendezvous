"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebhookEvent = exports.verifyWebhook = void 0;
const communication_service_1 = require("./communication.service");
const verifyWebhook = (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    // Security: The verify_token should match the one configured in Meta.
    // In a real multi-tenant architecture, if we use a single Meta App for all tenants,
    // there is only one verify_token globally. We check against the environment variable.
    const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "super_secret_verify_token";
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("[Webhook] WEBHOOK_VERIFIED");
        return res.status(200).send(challenge);
    }
    else {
        return res.sendStatus(403);
    }
};
exports.verifyWebhook = verifyWebhook;
const handleWebhookEvent = async (req, res) => {
    const payload = req.body;
    try {
        // Process the event asynchronously.
        // We await it here so tests can assert on the DB state immediately,
        // but in production we could respond 200 first and process in background if needed.
        await communication_service_1.communicationService.handleWebhook(payload);
        // Meta requires a 200 OK response immediately to acknowledge receipt.
        return res.status(200).send("EVENT_RECEIVED");
    }
    catch (error) {
        console.error("[Webhook] Error processing event:", error);
        // Don't leak details to external service. Return 200 to stop Meta from retrying forever,
        // or 500 if we want Meta to retry. Standard practice for unexpected internal errors is 500 or 200.
        // We return 500 so tests can catch it, or 200 in prod. Let's return 200 and log.
        return res.status(200).send("EVENT_RECEIVED");
    }
};
exports.handleWebhookEvent = handleWebhookEvent;
//# sourceMappingURL=webhook.controller.js.map