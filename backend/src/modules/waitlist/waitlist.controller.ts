import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/requireAuth";
import { waitlistService } from "./waitlist.service";
import { WaitlistEntry } from "./waitlist.model";
import { FollowUpTask } from "../followups/followup.model";
import { Appointment } from "../appointments/appointment.model";
import mongoose from "mongoose";

export const waitlistController = {
  getEntries: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });
      
      const { patientId } = req.query;
      const query: any = { tenantId, status: "active" };
      if (patientId) {
        query.patientId = patientId;
      }

      const entries = await WaitlistEntry.find(query)
        .sort({ priority: -1, createdAt: 1 })
        .populate("patientId", "firstName lastName phone");
      
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  createEntry: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });

      // Validate patient ownership
      const { Patient } = await import("../patients/patient.model");
      const patient = await Patient.findOne({ _id: req.body.patientId, tenantId });
      if (!patient) return res.status(404).json({ error: "Patient not found or does not belong to tenant" });

      const entry = await waitlistService.createEntry(req.body, tenantId);
      res.status(201).json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  cancelEntry: async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "No tenant context" });

      const { id } = req.params;
      const entry = await waitlistService.cancelEntry(id, tenantId);
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

      const { id: waitlistEntryId } = req.params;
      const { taskId } = req.body;

      if (!taskId) return res.status(400).json({ error: "taskId is required" });

      // 1. WaitlistEntry existence and ownership
      const entry = await WaitlistEntry.findOne({ _id: waitlistEntryId, tenantId });
      if (!entry) return res.status(404).json({ error: "WaitlistEntry not found" });

      // Idempotency check: if already fulfilled, return existing appointment and ensure task is completed
      if (entry.fulfilledByAppointmentId) {
        const existingAppt = await Appointment.findOne({ _id: entry.fulfilledByAppointmentId, tenantId });
        
        // ensure task is completed
        await FollowUpTask.findOneAndUpdate(
          { _id: taskId, tenantId, status: { $in: ["pending", "in_progress"] } },
          { $set: { status: "completed", completedAt: new Date() } }
        );
        
        return res.status(201).json(existingAppt);
      }

      // 2. WaitlistEntry status
      if (entry.status !== "active") {
        return res.status(400).json({ error: "Waitlist entry is not active" });
      }

      // 3. FollowUpTask validation
      const task = await FollowUpTask.findOne({ 
        _id: taskId, 
        tenantId, 
        waitlistEntryId: entry._id 
      });
      if (!task) return res.status(400).json({ error: "Task not found for this waitlist entry" });
      if (!["pending", "in_progress"].includes(task.status)) return res.status(400).json({ error: "Task is not actionable" });
      if (task.type !== "slot_fill_offer") return res.status(400).json({ error: "Task is not a slot_fill_offer" });

      // 4. Task has sourceAppointmentId
      if (!task.sourceAppointmentId) {
        return res.status(400).json({ error: "Task is missing sourceAppointmentId" });
      }

      // 5. Source appointment exists and belongs to tenant
      const sourceAppt = await Appointment.findOne({ _id: task.sourceAppointmentId, tenantId });
      if (!sourceAppt) return res.status(404).json({ error: "Source appointment not found" });

      // 6. Booking slot derived exactly from source appointment
      // Write 1: Create Appointment
      let newAppointment;
      try {
        newAppointment = new Appointment({
          tenantId,
          patientId: entry.patientId,
          doctorId: sourceAppt.doctorId,
          date: sourceAppt.date,
          startTime: sourceAppt.startTime,
          endTime: sourceAppt.endTime,
          durationMin: sourceAppt.durationMin,
          treatment: entry.treatment,
          status: "scheduled"
        });
        await newAppointment.save();
      } catch (err: any) {
        if (err.code === 11000) {
          return res.status(409).json({ error: "Ce créneau vient d'être réservé par quelqu'un d'autre." });
        }
        throw err;
      }

      // Write 2: Update WaitlistEntry (Conditional update)
      const updatedEntry = await WaitlistEntry.findOneAndUpdate(
        { _id: entry._id, status: "active" },
        { 
          $set: { 
            status: "fulfilled", 
            fulfilledByAppointmentId: newAppointment._id 
          } 
        },
        { new: true }
      );

      if (!updatedEntry) {
        // Edge case: it was fulfilled by someone else in the millisecond between read and write
        // The appointment is created but might be orphaned or considered a separate booking.
        // It's a valid booking. We return 500 to signal partial failure.
        return res.status(500).json({ error: "Partial failure: Appointment created but WaitlistEntry could not be updated." });
      }

      // Write 3: Update FollowUpTask
      const updatedTask = await FollowUpTask.findOneAndUpdate(
        { _id: task._id, status: { $in: ["pending", "in_progress"] } },
        { 
          $set: { 
            status: "completed", 
            completedAt: new Date() 
          } 
        }
      );

      if (!updatedTask) {
         // Task update failed (perhaps someone else completed it), but appointment is valid and waitlist is fulfilled.
         return res.status(500).json({ error: "Partial failure: Waitlist fulfilled but FollowUpTask could not be completed." });
      }

      return res.status(201).json(newAppointment);

    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
