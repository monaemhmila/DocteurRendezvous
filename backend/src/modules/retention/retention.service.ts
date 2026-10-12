import { Message } from "../communications/communication.model";
import { WebhookEvent } from "../communications/webhook-event.model";

const RETENTION_DAYS = Number(process.env.DATA_RETENTION_DAYS ?? 180); // Default to 6 months (180 days)

export class RetentionService {
  /**
   * Deletes WhatsApp messages and webhook events older than RETENTION_DAYS.
   * This ensures GDPR/HIPAA compliance by not keeping plain-text medical
   * conversations indefinitely. The patient's actual medical file (Patient, 
   * Appointment, dentalChart) is NOT deleted.
   */
  public async cleanOldData(): Promise<void> {
    try {
      console.log(`[Retention] Starting data retention cleanup (older than ${RETENTION_DAYS} days)...`);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

      // 1. Delete old Messages
      const msgResult = await Message.deleteMany({ createdAt: { $lt: cutoffDate } });
      
      // 2. Delete old Webhook Events (raw payloads)
      const whResult = await WebhookEvent.deleteMany({ createdAt: { $lt: cutoffDate } });

      console.log(`[Retention] Cleanup complete. Deleted ${msgResult.deletedCount} messages and ${whResult.deletedCount} webhook events.`);
    } catch (err) {
      console.error("[Retention] Cleanup failed:", err);
    }
  }

  public startDailyCron(): void {
    // Run cleanup immediately on startup if it's a worker/server, 
    // then every 24 hours.
    this.cleanOldData();
    setInterval(() => {
      this.cleanOldData();
    }, 24 * 60 * 60 * 1000); // 24 hours
  }
}

export const retentionService = new RetentionService();
