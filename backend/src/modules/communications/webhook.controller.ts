import crypto from "node:crypto";
import { Request, Response } from "express";
import { communicationService } from "./communication.service";
import { WebhookEvent } from "./webhook-event.model";
import { Tenant } from "../tenants/tenant.model";
import { Job } from "../jobs/job.model";

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

function isValidMetaSignature(req: RawBodyRequest): boolean {
  const appSecret = process.env.META_APP_SECRET?.trim();

  // Fail closed by default. Only permit unsigned webhooks if explicitly enabled for dev/sandbox.
  if (!appSecret) {
    if (process.env.WEBHOOK_ALLOW_UNSIGNED_DEV?.trim() === "true") {
      console.warn("[Webhook] Warning: Accepting unsigned webhook due to WEBHOOK_ALLOW_UNSIGNED_DEV=true");
      return true;
    }
    return false;
  }

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
  if (!res.headersSent) {
    res.status(200).send("EVENT_RECEIVED");
  }

  if (
    !payload ||
    payload.object !== "whatsapp_business_account" ||
    !Array.isArray(payload.entry)
  ) {
    console.warn("[Webhook] Non-WhatsApp or invalid payload format");
    return;
  }

  try {
    for (const entry of payload.entry) {
      if (!Array.isArray(entry.changes)) continue;
      
      for (const change of entry.changes) {
        if (change.field !== "messages") continue;
        
        const value = change.value;
        const phoneNumberId = value.metadata?.phone_number_id;
        
        if (!phoneNumberId) {
          console.warn("[Webhook] Missing phone_number_id. Ignoring.");
          continue;
        }

        // Strict Tenant Resolution
        const tenant = await Tenant.findOne({ 
          "settings.whatsappConfig.phoneNumberId": phoneNumberId,
          status: "active" 
        });

        if (!tenant) {
          console.warn(`[Webhook] No active tenant found for phone_number_id: ${phoneNumberId}. Ignoring.`);
          continue;
        }

        const tenantId = tenant._id;

        // Process Messages
        if (value.messages && Array.isArray(value.messages)) {
          for (const msg of value.messages) {
            const providerMessageId = msg.id;
            
            let event;
            try {
              event = new WebhookEvent({
                provider: "meta",
                phoneNumberId,
                eventType: "message",
                providerMessageId,
                tenantId,
                payload: msg
              });
              await event.save();
            } catch (err: any) {
              if (err.code === 11000) {
                console.log(`[Webhook] Duplicate message event ignored (wamid: ${providerMessageId})`);
                continue;
              }
              throw err;
            }

            // Process business logic ONLY if insertion succeeded
            if (process.env.ASYNC_WEBHOOK_PROCESSING === "true") {
              try {
                await Job.create({
                  type: "webhook_event",
                  tenantId,
                  webhookEventId: event._id,
                });
              } catch (jobErr: any) {
                if (jobErr.code === 11000) {
                  console.log(`[Webhook] Duplicate Job ignored (wamid: ${providerMessageId})`);
                } else {
                  throw jobErr;
                }
              }
            } else {
              await communicationService.handleIncomingMessage(tenantId.toString(), msg, value);
            }
          }
        }

        // Process Statuses
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const status of value.statuses) {
            const providerMessageId = status.id;
            
            let event;
            try {
              event = new WebhookEvent({
                provider: "meta",
                phoneNumberId,
                eventType: "status",
                providerMessageId,
                tenantId,
                payload: status
              });
              await event.save();
            } catch (err: any) {
              if (err.code === 11000) {
                console.log(`[Webhook] Duplicate status event ignored (wamid: ${providerMessageId})`);
                continue;
              }
              throw err;
            }

            // Process business logic ONLY if insertion succeeded
            if (process.env.ASYNC_WEBHOOK_PROCESSING === "true") {
              try {
                await Job.create({
                  type: "webhook_event",
                  tenantId,
                  webhookEventId: event._id,
                });
              } catch (jobErr: any) {
                if (jobErr.code === 11000) {
                  console.log(`[Webhook] Duplicate Job ignored (wamid: ${providerMessageId})`);
                } else {
                  throw jobErr;
                }
              }
            } else {
              await communicationService.handleMessageStatus(tenantId.toString(), status);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("[Webhook] Error processing event:", error);
  }
};
