"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalyticsOverview = void 0;
const recovery_model_1 = require("../recovery/recovery.model");
const waitlist_model_1 = require("../waitlist/waitlist.model");
const getAnalyticsOverview = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "No tenant context" });
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        // 1. Recovery Rate
        const totalRecoveries30d = await recovery_model_1.Recovery.countDocuments({
            tenantId,
            createdAt: { $gte: thirtyDaysAgo }
        });
        const visitedRecoveries30d = await recovery_model_1.Recovery.countDocuments({
            tenantId,
            status: "visited",
            createdAt: { $gte: thirtyDaysAgo }
        });
        const recoveryRate = totalRecoveries30d > 0 ? (visitedRecoveries30d / totalRecoveries30d) * 100 : 0;
        // 2. No-Show Recovery Rate
        const totalNoShowRecoveries30d = await recovery_model_1.Recovery.countDocuments({
            tenantId,
            type: "no_show",
            createdAt: { $gte: thirtyDaysAgo }
        });
        const visitedNoShowRecoveries30d = await recovery_model_1.Recovery.countDocuments({
            tenantId,
            type: "no_show",
            status: "visited",
            createdAt: { $gte: thirtyDaysAgo }
        });
        const noShowRecoveryRate = totalNoShowRecoveries30d > 0 ? (visitedNoShowRecoveries30d / totalNoShowRecoveries30d) * 100 : 0;
        // 3. Cancellation Recovery Rate
        const totalCancellationRecoveries30d = await recovery_model_1.Recovery.countDocuments({
            tenantId,
            type: "cancellation",
            createdAt: { $gte: thirtyDaysAgo }
        });
        const visitedCancellationRecoveries30d = await recovery_model_1.Recovery.countDocuments({
            tenantId,
            type: "cancellation",
            status: "visited",
            createdAt: { $gte: thirtyDaysAgo }
        });
        const cancellationRecoveryRate = totalCancellationRecoveries30d > 0 ? (visitedCancellationRecoveries30d / totalCancellationRecoveries30d) * 100 : 0;
        // 4. Waitlist Conversion Rate (Waitlist Fill Rate)
        const terminalWaitlist30d = await waitlist_model_1.WaitlistEntry.countDocuments({
            tenantId,
            status: { $in: ["fulfilled", "cancelled", "expired"] },
            updatedAt: { $gte: thirtyDaysAgo }
        });
        const fulfilledWaitlist30d = await waitlist_model_1.WaitlistEntry.countDocuments({
            tenantId,
            status: "fulfilled",
            updatedAt: { $gte: thirtyDaysAgo }
        });
        const waitlistConversionRate = terminalWaitlist30d > 0 ? (fulfilledWaitlist30d / terminalWaitlist30d) * 100 : 0;
        // Additional metric useful for the UI: total recovered revenue
        const allRecoveries = await recovery_model_1.Recovery.find({ tenantId, status: "visited" });
        const recoveredRevenue = allRecoveries.reduce((sum, r) => sum + (r.recoveredValue || r.bookedValue || 0), 0);
        const estimatedValuePending = (await recovery_model_1.Recovery.find({ tenantId, status: { $nin: ["visited", "no_response", "dismissed"] } }))
            .reduce((sum, r) => sum + (r.estimatedValue || 0), 0);
        res.json({
            recoveryRate,
            noShowRecoveryRate,
            cancellationRecoveryRate,
            waitlistConversionRate,
            recoveredRevenue,
            estimatedValuePending
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getAnalyticsOverview = getAnalyticsOverview;
//# sourceMappingURL=analytics.controller.js.map