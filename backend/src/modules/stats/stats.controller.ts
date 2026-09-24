import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/requireAuth";
import { Patient } from "../patients/patient.model";
import { Appointment } from "../appointments/appointment.model";
import { FollowUpTask } from "../followups/followup.model";
import { WaitlistEntry } from "../waitlist/waitlist.model";
import { Conversation } from "../communications/communication.model";

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "No tenant context" });

    const today = req.query.date as string || new Date().toISOString().split('T')[0];

    const todayAppts = await Appointment.find({ tenantId, date: today });
    const todayApptsCount = todayAppts.length;
    const confirmedCount = todayAppts.filter(a => a.status === 'confirmed').length;

    const patientsToRecover = await Patient.countDocuments({
      tenantId,
      status: 'at_risk'
    });

    const [revenueResult] = await Patient.aggregate([
      { $match: { tenantId } },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ["$metrics.revenue", 0] } },
        },
      },
    ]);
    const recoveredValue = revenueResult?.total ?? 0;

    const activeConversationsCount = await Conversation.countDocuments({ tenantId, status: "active" });
    const needsHumanCount = await Conversation.countDocuments({ tenantId, needsHuman: true });

    // Phase 4.1.4 Additions
    const noShowsToday = await Appointment.countDocuments({ tenantId, date: today, status: 'no_show' });
    
    const weekAgoDate = new Date();
    weekAgoDate.setDate(weekAgoDate.getDate() - 7);
    const noShowsThisWeek = await Appointment.countDocuments({ 
      tenantId, 
      status: 'no_show',
      createdAt: { $gte: weekAgoDate }
    });

    const activeFollowUps = await FollowUpTask.countDocuments({
      tenantId,
      status: { $in: ['pending', 'in_progress'] }
    });

    const activeWaitlist = await WaitlistEntry.countDocuments({
      tenantId,
      status: 'active'
    });

    res.json({
      todayAppts: todayApptsCount,
      confirmedAppts: confirmedCount,
      patientsToRecover: patientsToRecover || 0,
      recoveredValue: recoveredValue || 0,
      activeConversations: activeConversationsCount,
      needsHuman: needsHumanCount,
      noShowsToday,
      noShowsThisWeek,
      activeFollowUps,
      activeWaitlist,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};
