import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/requireAuth";
import { Recovery } from "../recovery/recovery.model";
import { WaitlistEntry } from "../waitlist/waitlist.model";
import { Appointment } from "../appointments/appointment.model";

export const getAnalyticsOverview = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "No tenant context" });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Recovery Rate
    const totalRecoveries30d = await Recovery.countDocuments({
      tenantId,
      createdAt: { $gte: thirtyDaysAgo }
    });
    const visitedRecoveries30d = await Recovery.countDocuments({
      tenantId,
      status: "visited",
      createdAt: { $gte: thirtyDaysAgo }
    });
    const recoveryRate = totalRecoveries30d > 0 ? (visitedRecoveries30d / totalRecoveries30d) * 100 : 0;

    // 2. No-Show Recovery Rate
    const totalNoShowRecoveries30d = await Recovery.countDocuments({
      tenantId,
      type: "no_show",
      createdAt: { $gte: thirtyDaysAgo }
    });
    const visitedNoShowRecoveries30d = await Recovery.countDocuments({
      tenantId,
      type: "no_show",
      status: "visited",
      createdAt: { $gte: thirtyDaysAgo }
    });
    const noShowRecoveryRate = totalNoShowRecoveries30d > 0 ? (visitedNoShowRecoveries30d / totalNoShowRecoveries30d) * 100 : 0;

    // 3. Cancellation Recovery Rate
    const totalCancellationRecoveries30d = await Recovery.countDocuments({
      tenantId,
      type: "cancellation",
      createdAt: { $gte: thirtyDaysAgo }
    });
    const visitedCancellationRecoveries30d = await Recovery.countDocuments({
      tenantId,
      type: "cancellation",
      status: "visited",
      createdAt: { $gte: thirtyDaysAgo }
    });
    const cancellationRecoveryRate = totalCancellationRecoveries30d > 0 ? (visitedCancellationRecoveries30d / totalCancellationRecoveries30d) * 100 : 0;

    // 4. Waitlist Conversion Rate (Waitlist Fill Rate)
    const terminalWaitlist30d = await WaitlistEntry.countDocuments({
      tenantId,
      status: { $in: ["fulfilled", "cancelled", "expired"] },
      updatedAt: { $gte: thirtyDaysAgo }
    });
    const fulfilledWaitlist30d = await WaitlistEntry.countDocuments({
      tenantId,
      status: "fulfilled",
      updatedAt: { $gte: thirtyDaysAgo }
    });
    const waitlistConversionRate = terminalWaitlist30d > 0 ? (fulfilledWaitlist30d / terminalWaitlist30d) * 100 : 0;

    // Additional metric useful for the UI: total recovered revenue
    const allRecoveries = await Recovery.find({ tenantId, status: "visited" });
    const recoveredRevenue = allRecoveries.reduce((sum, r) => sum + (r.recoveredValue || r.bookedValue || 0), 0);
    const estimatedValuePending = (await Recovery.find({ tenantId, status: { $nin: ["visited", "no_response", "dismissed"] } }))
      .reduce((sum, r) => sum + (r.estimatedValue || 0), 0);

    res.json({
      recoveryRate,
      noShowRecoveryRate,
      cancellationRecoveryRate,
      waitlistConversionRate,
      recoveredRevenue,
      estimatedValuePending
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
