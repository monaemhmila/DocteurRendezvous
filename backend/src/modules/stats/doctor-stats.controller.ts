import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/requireAuth";
import { Appointment } from "../appointments/appointment.model";
import { Patient } from "../patients/patient.model";
import { User } from "../users/user.model";
import mongoose from "mongoose";

/**
 * GET /stats/doctors
 * Returns per-doctor stats for the current week:
 *   - patientsSeenThisWeek
 *   - appointmentsCount
 *   - noShowsCount
 *   - confirmedCount
 *   - retentionRate (confirmed / total)
 */
export const getDoctorStats = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "No tenant context" });

    // Week range
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const weekStartIso = weekStart.toISOString().slice(0, 10);
    const weekEndIso = weekEnd.toISOString().slice(0, 10);

    // Fetch all clinic staff (doctors)
    const doctors = await User.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      role: { $in: ["clinic_owner", "dentist", "assistant"] },
      status: "active",
    }).select("_id firstName lastName role specialty").lean();

    // Aggregate appointments per doctor for this week
    const apptAgg = await Appointment.aggregate([
      {
        $match: {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          date: { $gte: weekStartIso, $lt: weekEndIso },
        },
      },
      {
        $group: {
          _id: "$doctorId",
          total: { $sum: 1 },
          confirmed: { $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          noShows: { $sum: { $cond: [{ $eq: ["$status", "no_show"] }, 1, 0] } },
          patientIds: { $addToSet: "$patientId" },
        },
      },
    ]);

    const apptMap = new Map(apptAgg.map((a) => [a._id?.toString(), a]));

    const result = doctors.map((doc) => {
      const docId = doc._id.toString();
      const agg = apptMap.get(docId);
      const total = agg?.total ?? 0;
      const confirmed = (agg?.confirmed ?? 0) + (agg?.completed ?? 0);
      const noShows = agg?.noShows ?? 0;
      const patientsSeen = agg?.patientIds?.length ?? 0;
      const retentionRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;

      return {
        doctorId: docId,
        name: `${doc.firstName} ${doc.lastName}`,
        role: doc.role,
        specialty: doc.specialty || null,
        stats: {
          appointmentsThisWeek: total,
          patientsSeen,
          confirmedCount: confirmed,
          noShowsCount: noShows,
          retentionRate,
        },
      };
    });

    res.json({ doctors: result, weekStart: weekStartIso, weekEnd: weekEndIso });
  } catch (error) {
    console.error("getDoctorStats error:", error);
    res.status(500).json({ error: "Failed to fetch doctor stats" });
  }
};
