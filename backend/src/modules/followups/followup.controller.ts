import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/requireAuth";
import { followupService } from "./followup.service";

export const followupController = {
  getTasks: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });

      const { status, priority } = req.query;
      const tasks = await followupService.getTasks(tenantId, {
        status: status as string,
        priority: priority as string,
      });
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  getTaskById: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });

      const { id } = req.params;
      const task = await followupService.getTaskById(id, tenantId);
      if (!task) {
        return res.status(404).json({ error: "FollowUpTask not found" });
      }
      res.json(task);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  createTask: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });

      const task = await followupService.createTask(req.body, tenantId);
      res.status(201).json(task);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  completeTask: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });

      const { id } = req.params;
      const { notes } = req.body;
      const task = await followupService.completeTask(id, tenantId, notes);
      res.json(task);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  logAttempt: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });

      const attempt = await followupService.logAttempt(req.body, tenantId);
      res.status(201).json(attempt);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  getAttemptsForRecovery: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });

      const { recoveryId } = req.params;
      const attempts = await followupService.getAttemptsForRecovery(recoveryId, tenantId);
      res.json(attempts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  getAttemptsForWaitlistEntry: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });

      const { waitlistEntryId } = req.params;
      const attempts = await followupService.getAttemptsForWaitlistEntry(waitlistEntryId, tenantId);
      res.json(attempts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};
