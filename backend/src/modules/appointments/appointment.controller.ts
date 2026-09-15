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
      id: a._id.toString(),
      patientId: a.patientId ? a.patientId._id.toString() : "",
      patientName: a.patientId ? `${a.patientId.firstName} ${a.patientId.lastName}` : "Patient inconnu",
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

    // Make sure we default the doctorId to the logged in user if not provided
    const body = {
      ...req.body,
      doctorId: req.body.doctorId || req.user?.id
    };

    const saved = await appointmentService.createAppointment(body, tenantId);
    res.status(201).json({ id: saved._id, ...saved.toObject() });
  } catch (error: any) {
    if (error.message === "Double_Booking_Error") {
      return res.status(409).json({ error: "Time slot is not available" });
    }
    res.status(500).json({ error: "Failed to create appointment" });
  }
};

export const updateAppointment = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    const updated = await appointmentService.updateAppointment(id, req.body, tenantId as string);
    if (!updated) return res.status(404).json({ error: "Appointment not found" });
    res.json({ id: updated._id, ...updated.toObject() });
  } catch (error) {
    res.status(500).json({ error: "Failed to update appointment" });
  }
};

export const deleteAppointment = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    const deleted = await appointmentService.deleteAppointment(id, tenantId as string);
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

    const updated = await appointmentService.updateStatus(id, status, tenantId);
    if (!updated) return res.status(404).json({ error: "Appointment not found" });
    res.json({ id: updated._id, ...updated.toObject() });
  } catch (error) {
    res.status(500).json({ error: "Failed to update appointment status" });
  }
};

export const getNoShows = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "No tenant context" });

    const { Appointment } = await import("./appointment.model");
    const noShows = await Appointment.find({ tenantId, status: "no_show" })
      .populate("patientId", "firstName lastName phone")
      .sort({ date: -1, startTime: -1 });

    const formatted = noShows.map((a: any) => ({
      id: a._id.toString(),
      patientId: a.patientId ? a.patientId._id.toString() : "",
      patientName: a.patientId ? `${a.patientId.firstName} ${a.patientId.lastName}` : "Patient inconnu",
      doctorId: a.doctorId,
      date: a.date,
      startTime: a.startTime || "00:00",
      endTime: a.endTime || "00:00",
      treatment: a.treatment,
      status: a.status
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch no-shows" });
  }
};
