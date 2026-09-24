import { OutboxEvent, IOutboxEvent } from "./outbox-event.model";
import { MetaWhatsAppProvider } from "../communications/providers/messaging.provider";
import { Tenant } from "../tenants/tenant.model";
import crypto from "node:crypto";

const messagingProvider = new MetaWhatsAppProvider();

export class OutboxWorkerService {
  private isRunning: boolean = false;
  private workerId: string;
  private timer: NodeJS.Timeout | null = null;
  private pollIntervalMs = 1000;
  private leaseTimeMs = 30000;

  constructor() {
    this.workerId = crypto.randomUUID();
  }

  public setLeaseTime(ms: number) {
    this.leaseTimeMs = ms;
  }

  public getWorkerId() {
    return this.workerId;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[OutboxWorker] Started worker ${this.workerId}`);
    this.poll();
  }

  public stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public async pollOnce() {
    try {
      const event = await this.reserveEvent();
      if (event) {
        await this.processEvent(event);
        return true;
      }
    } catch (error) {
      console.error(`[OutboxWorker] Error polling events:`, error);
    }
    return false;
  }

  private async poll() {
    if (!this.isRunning) return;

    try {
      const event = await this.reserveEvent();
      if (event) {
        await this.processEvent(event);
        setImmediate(() => this.poll());
        return;
      }
    } catch (error) {
      console.error(`[OutboxWorker] Error polling events:`, error);
    }

    if (this.isRunning) {
      this.timer = setTimeout(() => this.poll(), this.pollIntervalMs);
    }
  }

  public async reserveEvent(): Promise<IOutboxEvent | null> {
    const now = new Date();
    const leaseThreshold = new Date(now.getTime() - this.leaseTimeMs);

    return await OutboxEvent.findOneAndUpdate(
      {
        $or: [
          { status: "pending", availableAt: { $lte: now } },
          { status: "processing", lockedAt: { $lte: leaseThreshold } },
          { status: "retry", availableAt: { $lte: now } },
        ],
      },
      {
        $set: {
          status: "processing",
          lockedAt: now,
          lockedBy: this.workerId,
        },
      },
      { returnDocument: 'after', sort: { createdAt: 1 } }
    );
  }

  public async processEvent(event: IOutboxEvent) {
    try {
      // Resolve Tenant to get proper credentials/status
      const tenant = await Tenant.findById(event.tenantId);
      if (!tenant || tenant.status !== "active") {
        throw new Error(`Tenant ${event.tenantId} not found or not active`);
      }

      if (tenant.settings?.whatsappConfig?.phoneNumberId !== event.phoneNumberId) {
        throw new Error(`phoneNumberId mismatch for tenant ${event.tenantId} (expected ${tenant.settings?.whatsappConfig?.phoneNumberId}, got ${event.phoneNumberId})`);
      }

      // Payload contains the minimal message parameters { to, type, content }
      const params = event.payload;

      const sendResult = await messagingProvider.sendMessage(params, tenant);

      await OutboxEvent.updateOne(
        { _id: event._id },
        { 
          $set: { 
            status: "sent", 
            sentAt: new Date(),
            providerMessageId: sendResult.providerMessageId
          } 
        }
      );
    } catch (error: any) {
      console.error(`[OutboxWorker] Event ${event._id} failed:`, error.message);
      const attempts = event.attempts + 1;
      
      if (attempts >= event.maxAttempts) {
        await OutboxEvent.updateOne(
          { _id: event._id },
          { 
            $set: { 
              status: "dead_letter", 
              attempts,
              lastError: error.message || String(error)
            } 
          }
        );
      } else {
        const backoffMs = Math.pow(2, attempts) * 1000;
        await OutboxEvent.updateOne(
          { _id: event._id },
          { 
            $set: { 
              status: "retry",
              attempts,
              availableAt: new Date(Date.now() + backoffMs),
              lastError: error.message || String(error)
            },
            $unset: { lockedAt: "", lockedBy: "" }
          }
        );
      }
    }
  }
}

export const outboxWorkerService = new OutboxWorkerService();
