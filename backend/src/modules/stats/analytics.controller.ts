import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/requireAuth";
import { Recovery } from "../recovery/recovery.model";
import { WaitlistEntry } from "../waitlist/waitlist.model";
import { Appointment } from "../appointments/appointment.model";
import { Patient } from "../patients/patient.model";

export const getAnalyticsOverview = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "No tenant context" });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Filter out dummy patient used for doctor reservations (phone: 00000000)
    const dummyPatient = await Patient.findOne({ tenantId, phone: "00000000" }).select('_id');
    const dummyPatientId = dummyPatient ? dummyPatient._id : null;

    const baseQuery: any = { tenantId };
    if (dummyPatientId) {
      baseQuery.patientId = { $ne: dummyPatientId };
    }

    // 1. Recovery Rate
    const totalRecoveries30d = await Recovery.countDocuments({
      ...baseQuery,
      createdAt: { $gte: thirtyDaysAgo }
    });
    const visitedRecoveries30d = await Recovery.countDocuments({
      ...baseQuery,
      status: "visited",
      createdAt: { $gte: thirtyDaysAgo }
    });
    const recoveryRate = totalRecoveries30d > 0 ? (visitedRecoveries30d / totalRecoveries30d) * 100 : 0;

    // 2. No-Show Recovery Rate
    const totalNoShowRecoveries30d = await Recovery.countDocuments({
      ...baseQuery,
      type: "no_show",
      createdAt: { $gte: thirtyDaysAgo }
    });
    const visitedNoShowRecoveries30d = await Recovery.countDocuments({
      ...baseQuery,
      type: "no_show",
      status: "visited",
      createdAt: { $gte: thirtyDaysAgo }
    });
    const noShowRecoveryRate = totalNoShowRecoveries30d > 0 ? (visitedNoShowRecoveries30d / totalNoShowRecoveries30d) * 100 : 0;

    // 3. Cancellation Recovery Rate
    const totalCancellationRecoveries30d = await Recovery.countDocuments({
      ...baseQuery,
      type: "cancellation",
      createdAt: { $gte: thirtyDaysAgo }
    });
    const visitedCancellationRecoveries30d = await Recovery.countDocuments({
      ...baseQuery,
      type: "cancellation",
      status: "visited",
      createdAt: { $gte: thirtyDaysAgo }
    });
    const cancellationRecoveryRate = totalCancellationRecoveries30d > 0 ? (visitedCancellationRecoveries30d / totalCancellationRecoveries30d) * 100 : 0;

    // 4. Waitlist Conversion Rate (Waitlist Fill Rate)
    const terminalWaitlist30d = await WaitlistEntry.countDocuments({
      ...baseQuery,
      status: { $in: ["fulfilled", "cancelled", "expired"] },
      updatedAt: { $gte: thirtyDaysAgo }
    });
    const fulfilledWaitlist30d = await WaitlistEntry.countDocuments({
      ...baseQuery,
      status: "fulfilled",
      updatedAt: { $gte: thirtyDaysAgo }
    });
    const waitlistConversionRate = terminalWaitlist30d > 0 ? (fulfilledWaitlist30d / terminalWaitlist30d) * 100 : 0;

    // Additional metric useful for the UI: total recovered revenue
    const allRecoveries = await Recovery.find({ ...baseQuery, status: "visited" });
    const recoveredRevenue = allRecoveries.reduce((sum, r) => sum + (r.recoveredValue || r.bookedValue || 0), 0);
    const estimatedValuePending = (await Recovery.find({ ...baseQuery, status: { $nin: ["visited", "no_response", "dismissed"] } }))
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
