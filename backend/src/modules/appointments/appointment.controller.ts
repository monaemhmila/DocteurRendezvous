import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/requireAuth";
import { appointmentService } from "./appointment.service";
import { availabilityService } from "./availability.service";

export const getAppointments = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "No tenant context" });

    const { patientId } = req.query;
    const appointments = await appointmentService.getAppointments(tenantId, patientId as string);

    const formatted = appointments.map((a: any) => ({
      _id: a._id.toString(),
      id: a._id.toString(),
      patientId: a.patientId ? (a.patientId._id ? a.patientId._id.toString() : a.patientId.toString()) : "",
      patientName: a.patientId && a.patientId.firstName ? `${a.patientId.firstName} ${a.patientId.lastName}` : "Patient inconnu",
      doctorId: a.doctorId,
      date: a.date,
      startTime: a.startTime || a.time || "00:00",
      endTime: a.endTime || "00:00",
      durationMin: a.durationMin,
      treatment: a.treatment,
      notes: a.notes,
      cancellationReason: a.cancellationReason,
      source: a.source,
      status: a.status
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
};

export const createAppointment = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "No tenant context" });

    // Doctor resolution is backend-owned and deterministic; the frontend must
    // never choose or send doctorId.
    const saved = await appointmentService.createAppointment(req.body, tenantId);
    res.status(201).json({ id: saved._id, ...saved.toObject() });
  } catch (error: any) {
    if (error.message === "SLOT_UNAVAILABLE") {
      return res.status(409).json({ error: "SLOT_UNAVAILABLE" });
    }
    res.status(500).json({ error: "Failed to create appointment" });
  }
};

export const updateAppointment = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    const updated = await appointmentService.updateAppointment(id as string, req.body, tenantId as string);
    if (!updated) return res.status(404).json({ error: "Appointment not found" });
    res.json({ id: updated._id, ...updated.toObject() });
  } catch (error: any) {
    if (error.message === "SLOT_UNAVAILABLE") {
      return res.status(409).json({ error: "SLOT_UNAVAILABLE" });
    }
    res.status(500).json({ error: "Failed to update appointment" });
  }
};

export const deleteAppointment = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    const deleted = await appointmentService.deleteAppointment(id as string, tenantId as string);
    if (!deleted) return res.status(404).json({ error: "Appointment not found" });

    res.json({ message: "Appointment deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete appointment" });
  }
};

export const checkAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "No tenant context" });

    const { date, startTime, endTime, doctorId } = req.query;
    
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ error: "Missing required query parameters: date, startTime, endTime" });
    }

    const docId = (doctorId as string) || req.user?.id;
    if (!docId) {
      return res.status(400).json({ error: "Missing doctorId" });
    }

    const isAvailable = await availabilityService.checkAvailability({
      tenantId,
      doctorId: docId,
      date: date as string,
      startTime: startTime as string,
      endTime: endTime as string,
    });

    res.json({ available: isAvailable });
  } catch (error) {
    res.status(500).json({ error: "Failed to check availability" });
  }
};

export const updateAppointmentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "No tenant context" });
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Missing status field" });
    }

    const validStatuses = ["scheduled", "confirmed", "cancelled", "completed", "no_show"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    const updated = await appointmentService.updateStatus(id as string, status, tenantId);
    if (!updated) return res.status(404).json({ error: "Appointment not found" });
    res.json({ id: updated._id, ...updated.toObject() });
  } catch (error: any) {
    if (error.message === "INVALID_APPOINTMENT_TRANSITION") {
      return res.status(409).json({ error: "Transition de statut invalide" });
    }
    res.status(500).json({ error: "Failed to update appointment status" });
  }
};

export const getNoShows = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "No tenant context" });

    const { Appointment } = await import("./appointment.model");
    const { Recovery } = await import("../recovery/recovery.model");

    const noShows = await Appointment.find({ tenantId, status: "no_show" })
      .populate("patientId", "firstName lastName phone email metrics")
      .sort({ date: -1, startTime: -1 })
      .lean();

    const noShowIds = noShows.map((a: any) => a._id);
    const recoveries = await Recovery.find({
      tenantId,
      sourceAppointmentId: { $in: noShowIds },
    }).lean();

    const recoveryMap = new Map();
    recoveries.forEach((r: any) => {
      if (r.sourceAppointmentId) {
        recoveryMap.set(r.sourceAppointmentId.toString(), r);
      }
    });

    const formatted = noShows.map((a: any) => {
      const patient = a.patientId;
      const rec = recoveryMap.get(a._id.toString());
      return {
        id: a._id.toString(),
        _id: a._id.toString(),
        patientId: patient ? (patient._id ? patient._id.toString() : patient.toString()) : "",
        patientName: patient && patient.firstName ? `${patient.firstName} ${patient.lastName || ""}`.trim() : "Patient inconnu",
        phone: patient?.phone || "",
        noShowCount: patient?.metrics?.noShowCount ?? (patient?.metrics?.noShows ?? 1),
        doctorId: a.doctorId,
        date: a.date,
        startTime: a.startTime || "00:00",
        endTime: a.endTime || "00:00",
        treatment: a.treatment,
        status: a.status,
        recoveryStatus: rec ? rec.status : "identified",
        recoveryId: rec ? rec._id.toString() : null,
      };
    });

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch no-shows" });
  }
};
