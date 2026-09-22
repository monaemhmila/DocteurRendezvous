import crypto from "node:crypto";
import { Request, Response } from "express";
import { communicationService } from "./communication.service";

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

function isValidMetaSignature(req: RawBodyRequest): boolean {
  const appSecret = process.env.META_APP_SECRET?.trim();

  // If META_APP_SECRET is not set in .env, permit incoming webhook in dev/sandbox mode
  if (!appSecret) return true;

  if (!req.rawBody) return false;

  const signature = req.header("x-hub-signature-256");
  if (!signature?.startsWith("sha256=")) return false;

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(req.rawBody)
    .digest("hex");

  const received = signature.slice("sha256=".length);
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export const verifyWebhook = (req: Request, res: Response) => {
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

export const handleWebhookEvent = async (req: RawBodyRequest, res: Response) => {
  if (!isValidMetaSignature(req)) {
    return res.status(403).json({ error: "Invalid webhook signature" });
  }

  const payload = req.body;
  console.log("[Webhook] Incoming Webhook Event:", JSON.stringify(payload, null, 2));

  if (
    !payload ||
    payload.object !== "whatsapp_business_account" ||
    !Array.isArray(payload.entry)
  ) {
    console.warn("[Webhook] Non-WhatsApp or invalid payload format:", payload);
    return res.status(400).json({ error: "Invalid webhook payload" });
  }

  try {
    await communicationService.handleWebhook(payload);
  } catch (error) {
    console.error("[Webhook] Error processing event:", error);
  }

  // Meta requires a 200 OK response to acknowledge receipt.
  if (!res.headersSent) {
    res.status(200).send("EVENT_RECEIVED");
  }
};
