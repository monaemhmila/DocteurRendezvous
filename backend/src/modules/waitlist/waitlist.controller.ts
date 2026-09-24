import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/requireAuth";
import { waitlistService } from "./waitlist.service";
import { WaitlistEntry } from "./waitlist.model";
import { FollowUpTask } from "../followups/followup.model";
import { Appointment } from "../appointments/appointment.model";
import mongoose from "mongoose";
import { parsePagination, buildPaginationMeta } from "../../shared/utils/pagination";

export const waitlistController = {
  getEntries: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });
      
      const { patientId, status, page, limit } = req.query;
      const pagination = parsePagination(page, limit);

      const { data, total } = await waitlistService.listEntriesPaginated(
        tenantId,
        status as string | undefined,
        patientId as string | undefined,
        pagination.skip,
        pagination.limit
      );

      const meta = buildPaginationMeta(total, pagination.page, pagination.limit);
      res.json({ data, meta });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  createEntry: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });

      const { patientId, treatment, priority, notes, preferredDays, preferredTimeRanges } = req.body;

      if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
        return res.status(400).json({ error: "Patient invalide" });
      }
      if (!treatment || typeof treatment !== "string" || !treatment.trim()) {
        return res.status(400).json({ error: "Le soin souhaité est requis" });
      }

      // Validate patient ownership
      const { Patient } = await import("../patients/patient.model");
      const patient = await Patient.findOne({ _id: patientId, tenantId });
      if (!patient) return res.status(404).json({ error: "Patient introuvable pour ce cabinet" });

      const entry = await waitlistService.createEntry(
        {
          patientId,
          treatment: treatment.trim(),
          priority: priority || "medium",
          notes: notes || "",
          preferredDays: preferredDays || [],
          preferredTimeRanges: preferredTimeRanges || [],
        },
        tenantId
      );

      const populatedEntry = await WaitlistEntry.findById(entry._id).populate(
        "patientId",
        "firstName lastName phone email"
      );

      res.status(201).json(populatedEntry || entry);
    } catch (error: any) {
      if (error.code === 11000) {
        return res.status(400).json({
          error: "Ce patient est déjà inscrit sur la liste d'attente pour ce traitement.",
        });
      }
      res.status(400).json({ error: error.message || "Erreur lors de l'ajout" });
    }
  },

  cancelEntry: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });

      const { id } = req.params;
      if (!id) return res.status(400).json({ error: "ID is required" });
      const entry = await waitlistService.cancelEntry(id as string, tenantId);
      res.json(entry);
    } catch (error: any) {
      if (error.message.includes("WaitlistEntry not found")) {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  },

  fulfillEntry: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });

      const waitlistEntryId = req.params.id as string;
      if (!waitlistEntryId) return res.status(400).json({ error: "waitlistEntryId is required" });
      const taskId = req.body.taskId as string;

      if (!taskId) return res.status(400).json({ error: "taskId is required" });

      try {
        const appointment = await waitlistService.fulfillWaitlistEntry({ waitlistEntryId, taskId, tenantId: tenantId as string });
        return res.status(201).json(appointment);
      } catch (error: any) {
        if (error.message === "SLOT_UNAVAILABLE" || error.message === "WAITLIST_CONFLICT") {
          return res.status(409).json({ error: "Ce créneau n'est plus disponible." });
        }
        if (error.message.includes("WAITLIST_NOT_FOUND") || error.message.includes("SOURCE_NOT_FOUND") || error.message.includes("TASK_NOT_FOUND")) {
          return res.status(404).json({ error: "Resource not found" });
        }
        return res.status(400).json({ error: error.message });
      }

    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
