"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const patient_model_1 = require("../patients/patient.model");
const appointment_model_1 = require("../appointments/appointment.model");
const followup_model_1 = require("../followups/followup.model");
const waitlist_model_1 = require("../waitlist/waitlist.model");
const getDashboardStats = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "No tenant context" });
        const today = req.query.date || new Date().toISOString().split('T')[0];
        const todayAppts = await appointment_model_1.Appointment.find({ tenantId, date: today });
        const todayApptsCount = todayAppts.length;
        const confirmedCount = todayAppts.filter(a => a.status === 'confirmed').length;
        const patientsToRecover = await patient_model_1.Patient.countDocuments({
            tenantId,
            status: 'at_risk'
        });
        const allPatients = await patient_model_1.Patient.find({ tenantId });
        const recoveredValue = allPatients.reduce((sum, p) => sum + (p.metrics?.revenue || 0), 0);
        const activeConversationsCount = 0;
        const needsHumanCount = 0;
        // Phase 4.1.4 Additions
        const noShowsToday = await appointment_model_1.Appointment.countDocuments({ tenantId, date: today, status: 'no_show' });
        const weekAgoDate = new Date();
        weekAgoDate.setDate(weekAgoDate.getDate() - 7);
        const noShowsThisWeek = await appointment_model_1.Appointment.countDocuments({
            tenantId,
            status: 'no_show',
            createdAt: { $gte: weekAgoDate }
        });
        const activeFollowUps = await followup_model_1.FollowUpTask.countDocuments({
            tenantId,
            status: { $in: ['pending', 'in_progress'] }
        });
        const activeWaitlist = await waitlist_model_1.WaitlistEntry.countDocuments({
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
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch stats" });
    }
};
exports.getDashboardStats = getDashboardStats;
//# sourceMappingURL=stats.controller.js.map