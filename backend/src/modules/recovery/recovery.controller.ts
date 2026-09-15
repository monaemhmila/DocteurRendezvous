import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/requireAuth";
import { recoveryService } from "./recovery.service";

export const recoveryController = {
  getOpportunities: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });
      const { patientId } = req.query;
      const opportunities = await recoveryService.getOpportunities(tenantId, patientId as string);
      res.json(opportunities);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  getOpportunityById: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });
      const { id } = req.params;
      const opportunity = await recoveryService.getOpportunityById(id, tenantId);
      if (!opportunity) {
        return res.status(404).json({ error: "Opportunity not found" });
      }
      res.json(opportunity);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  createOpportunity: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });
      const opportunity = await recoveryService.createOpportunity(req.body, tenantId);
      res.status(201).json(opportunity);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  updateOpportunity: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });
      const { id } = req.params;
      const opportunity = await recoveryService.updateOpportunity(id, req.body, tenantId);
      if (!opportunity) {
        return res.status(404).json({ error: "Opportunity not found" });
      }
      res.json(opportunity);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  markContacted: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });
      const { id } = req.params;
      const opportunity = await recoveryService.markContacted(id, tenantId);
      res.json(opportunity);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  markResponded: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });
      const { id } = req.params;
      const opportunity = await recoveryService.markResponded(id, tenantId);
      res.json(opportunity);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  markBooked: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });
      const { id } = req.params;
      const { recoveryAppointmentId, bookedValue } = req.body;
      const opportunity = await recoveryService.markBooked(id, recoveryAppointmentId, bookedValue || 0, tenantId);
      res.json(opportunity);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  markVisited: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });
      const { id } = req.params;
      const { recoveredValue } = req.body;
      const opportunity = await recoveryService.markVisited(id, recoveredValue || 0, tenantId);
      res.json(opportunity);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  dismissOpportunity: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });
      const { id } = req.params;
      const opportunity = await recoveryService.dismissOpportunity(id, tenantId);
      res.json(opportunity);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  detectOpportunities: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });
      const result = await recoveryService.detectRecoveryOpportunities(tenantId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  getStats: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });
      const stats = await recoveryService.getStats(tenantId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
