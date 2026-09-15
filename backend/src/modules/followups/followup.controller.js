"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.followupController = void 0;
const followup_service_1 = require("./followup.service");
exports.followupController = {
    getTasks: async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "No tenant context" });
            const { status, priority } = req.query;
            const tasks = await followup_service_1.followupService.getTasks(tenantId, {
                status: status,
                priority: priority,
            });
            res.json(tasks);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    getTaskById: async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "No tenant context" });
            const { id } = req.params;
            const task = await followup_service_1.followupService.getTaskById(id, tenantId);
            if (!task) {
                return res.status(404).json({ error: "FollowUpTask not found" });
            }
            res.json(task);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    createTask: async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "No tenant context" });
            const task = await followup_service_1.followupService.createTask(req.body, tenantId);
            res.status(201).json(task);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    },
    completeTask: async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "No tenant context" });
            const { id } = req.params;
            const { notes } = req.body;
            const task = await followup_service_1.followupService.completeTask(id, tenantId, notes);
            res.json(task);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    },
    logAttempt: async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "No tenant context" });
            const attempt = await followup_service_1.followupService.logAttempt(req.body, tenantId);
            res.status(201).json(attempt);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    },
    getAttemptsForRecovery: async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "No tenant context" });
            const { recoveryId } = req.params;
            const attempts = await followup_service_1.followupService.getAttemptsForRecovery(recoveryId, tenantId);
            res.json(attempts);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    getAttemptsForWaitlistEntry: async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "No tenant context" });
            const { waitlistEntryId } = req.params;
            const attempts = await followup_service_1.followupService.getAttemptsForWaitlistEntry(waitlistEntryId, tenantId);
            res.json(attempts);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
};
//# sourceMappingURL=followup.controller.js.map