import { Job, IJob } from "./job.model";
import { WebhookEvent } from "../communications/webhook-event.model";
import { communicationService } from "../communications/communication.service";
import crypto from "node:crypto";

export class WorkerService {
  private isRunning: boolean = false;
  private workerId: string;
  private timer: NodeJS.Timeout | null = null;
  private pollIntervalMs = 1000;
  private leaseTimeMs = 10000; // 10 seconds for tests

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
    console.log(`[Worker] Started worker ${this.workerId}`);
    this.poll();
  }

  public stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log(`[Worker] Stopped worker ${this.workerId}`);
  }

  public async pollOnce() {
    try {
      const job = await this.reserveJob();
      if (job) {
        await this.processJob(job);
        return true;
      }
    } catch (error) {
      console.error(`[Worker] Error polling jobs:`, error);
    }
    return false;
  }

  private async poll() {
    if (!this.isRunning) return;

    try {
      const job = await this.reserveJob();
      if (job) {
        await this.processJob(job);
        // Process another job immediately if one was found
        setImmediate(() => this.poll());
        return;
      }
    } catch (error) {
      console.error(`[Worker] Error polling jobs:`, error);
    }

    // Schedule next poll
    if (this.isRunning) {
      this.timer = setTimeout(() => this.poll(), this.pollIntervalMs);
    }
  }

  public async reserveJob(): Promise<IJob | null> {
    const now = new Date();
    const leaseThreshold = new Date(now.getTime() - this.leaseTimeMs);

    // Find pending jobs OR jobs that are stuck in processing (lease expired)
    return await Job.findOneAndUpdate(
      {
        $or: [
          { status: "pending", availableAt: { $lte: now } },
          { status: "processing", lockedAt: { $lte: leaseThreshold } },
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

  public async processJob(job: IJob) {
    try {
      // console.log(`[Worker] Processing Job ${job._id} (type: ${job.type})`);
      
      if (job.type === "webhook_event") {
        await this.handleWebhookJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.type}`);
      }

      // Mark as completed
      await Job.updateOne(
        { _id: job._id },
        { 
          $set: { 
            status: "completed", 
            processedAt: new Date() 
          } 
        }
      );
      // console.log(`[Worker] Job ${job._id} completed successfully`);

    } catch (error: any) {
      console.error(`[Worker] Job ${job._id} failed:`, error.message);
      const attempts = job.attempts + 1;
      
      if (attempts >= job.maxAttempts) {
        // Dead letter
        await Job.updateOne(
          { _id: job._id },
          { 
            $set: { 
              status: "dead_letter", 
              attempts,
              lastError: error.message || String(error)
            } 
          }
        );
        console.warn(`[Worker] Job ${job._id} moved to dead_letter after ${attempts} attempts`);
      } else {
        // Retry with exponential backoff
        const backoffMs = Math.pow(2, attempts) * 1000;
        await Job.updateOne(
          { _id: job._id },
          { 
            $set: { 
              status: "pending",
              attempts,
              availableAt: new Date(Date.now() + backoffMs),
              lastError: error.message || String(error)
            },
            $unset: { lockedAt: "", lockedBy: "" }
          }
        );
        console.log(`[Worker] Job retry scheduled in ${backoffMs}ms`);
      }
    }
  }

  private async handleWebhookJob(job: IJob) {
    if (!job.webhookEventId) {
      throw new Error("Missing webhookEventId for webhook_event job");
    }

    const event = await WebhookEvent.findById(job.webhookEventId);
    if (!event) {
      throw new Error(`WebhookEvent not found: ${job.webhookEventId}`);
    }

    // Only process if it wasn't already processed
    if (event.status === "processed") {
      console.log(`[Worker] Webhook event already processed`);
      return;
    }

    event.status = "processing";
    await event.save();

    try {
      if (event.eventType === "message") {
        await communicationService.handleIncomingMessage(
          event.tenantId!.toString(), 
          event.payload, 
          { contacts: [{ profile: { name: "Patient" } }] }
        );
      } else if (event.eventType === "status") {
        await communicationService.handleMessageStatus(
          event.tenantId!.toString(), 
          event.payload
        );
      }

      event.status = "processed";
      event.processedAt = new Date();
      await event.save();
    } catch (err: any) {
      event.status = "failed";
      event.lastError = err.message || String(err);
      await event.save();
      throw err;
    }
  }
}

export const workerService = new WorkerService();
