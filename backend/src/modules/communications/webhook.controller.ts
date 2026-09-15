import { Request, Response } from "express";
import { communicationService } from "./communication.service";

export const verifyWebhook = (req: Request, res: Response) => {
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
  } else {
    return res.sendStatus(403);
  }
};

export const handleWebhookEvent = async (req: Request, res: Response) => {
  const payload = req.body;

  // Meta requires a 200 OK response immediately to acknowledge receipt.
  // If we take longer than ~5 seconds (e.g. AI processing), Meta will retry.
  res.status(200).send("EVENT_RECEIVED");

  // Process the event asynchronously (fire-and-forget).
  // Note: This is an in-process async execution. It does NOT provide durable 
  // job queue resilience. If the Node process crashes right after this line,
  // the event is lost. For true resilience, a queue (e.g. BullMQ) should be used.
  communicationService.handleWebhook(payload).catch((error) => {
    console.error("[Webhook] Error processing event asynchronously:", error);
  });
};
