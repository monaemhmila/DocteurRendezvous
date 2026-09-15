"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recoveryController = void 0;
const recovery_service_1 = require("./recovery.service");
exports.recoveryController = {
    getOpportunities: async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "No tenant context" });
            const { patientId } = req.query;
            const opportunities = await recovery_service_1.recoveryService.getOpportunities(tenantId, patientId);
            res.json(opportunities);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    getOpportunityById: async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "No tenant context" });
            const { id } = req.params;
            const opportunity = await recovery_service_1.recoveryService.getOpportunityById(id, tenantId);
            if (!opportunity) {
                return res.status(404).json({ error: "Opportunity not found" });
            }
            res.json(opportunity);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    createOpportunity: async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "No tenant context" });
            const opportunity = await recovery_service_1.recoveryService.createOpportunity(req.body, tenantId);
            res.status(201).json(opportunity);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    },
    updateOpportunity: async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "No tenant context" });
            const { id } = req.params;
            const opportunity = await recovery_service_1.recoveryService.updateOpportunity(id, req.body, tenantId);
            if (!opportunity) {
                return res.status(404).json({ error: "Opportunity not found" });
            }
            res.json(opportunity);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    },
    markContacted: async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "No tenant context" });
            const { id } = req.params;
            const opportunity = await recovery_service_1.recoveryService.markContacted(id, tenantId);
            res.json(opportunity);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    },
    markResponded: async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "No tenant context" });
            const { id } = req.params;
            const opportunity = await recovery_service_1.recoveryService.markResponded(id, tenantId);
            res.json(opportunity);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    },
    markBooked: async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "No tenant context" });
            const { id } = req.params;
            const { recoveryAppointmentId, bookedValue } = req.body;
            const opportunity = await recovery_service_1.recoveryService.markBooked(id, recoveryAppointmentId, bookedValue || 0, tenantId);
            res.json(opportunity);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    },
    markVisited: async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "No tenant context" });
            const { id } = req.params;
            const { recoveredValue } = req.body;
            const opportunity = await recovery_service_1.recoveryService.markVisited(id, recoveredValue || 0, tenantId);
            res.json(opportunity);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    },
    dismissOpportunity: async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "No tenant context" });
            const { id } = req.params;
            const opportunity = await recovery_service_1.recoveryService.dismissOpportunity(id, tenantId);
            res.json(opportunity);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    },
    detectOpportunities: async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "No tenant context" });
            const result = await recovery_service_1.recoveryService.detectRecoveryOpportunities(tenantId);
            res.json(result);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    getStats: async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "No tenant context" });
            const stats = await recovery_service_1.recoveryService.getStats(tenantId);
            res.json(stats);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};
//# sourceMappingURL=recovery.controller.js.map