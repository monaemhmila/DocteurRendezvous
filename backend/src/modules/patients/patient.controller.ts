import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/requireAuth";
import { patientService } from "./patient.service";

export const getPatients = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "No tenant context" });

    let patients;
    const { search } = req.query;
    if (search && typeof search === "string") {
      patients = await patientService.searchPatients(tenantId, search);
    } else {
      patients = await patientService.getPatients(tenantId);
    }

    const formatted = patients.map((p) => ({
      _id: p._id.toString(),
      id: p._id.toString(),
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone,
      email: p.email,
      language: p.language,
      status: p.status,
      tags: p.tags,
      dateOfBirth: p.dateOfBirth,
      gender: p.gender,
      notes: p.notes,
      nextAppointmentAt: p.nextAppointmentAt,
      metrics: {
        totalVisits: p.metrics?.totalVisits ?? 0,
        noShowCount: p.metrics?.noShowCount ?? 0,
        lastVisit: p.metrics?.lastVisit,
        revenue: p.metrics?.revenue ?? 0,
      },
    }));

    res.json(formatted);
  } catch (error) {
    console.error("getPatients error:", error);
    res.status(500).json({ error: "Failed to fetch patients" });
  }
};

export const getPatientById = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    
    const patient = await patientService.getPatientById(id as string, tenantId as string);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    res.json({
      _id: patient._id.toString(),
      id: patient._id.toString(),
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone,
      email: patient.email,
      language: patient.language,
      status: patient.status,
      tags: patient.tags,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      notes: patient.notes,
      nextAppointmentAt: patient.nextAppointmentAt,
      metrics: patient.metrics,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch patient" });
  }
};

export const createPatient = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "No tenant context" });

    const saved = await patientService.createPatient(req.body, tenantId);
    res.status(201).json({ id: saved._id, ...saved.toObject() });
  } catch (error) {
    res.status(500).json({ error: "Failed to create patient" });
  }
};

export const updatePatient = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    const updated = await patientService.updatePatient(id as string, req.body, tenantId as string);
    if (!updated) return res.status(404).json({ error: "Patient not found" });
    res.json({ id: updated._id, ...updated.toObject() });
  } catch (error) {
    res.status(500).json({ error: "Failed to update patient" });
  }
};

export const deletePatient = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    const deleted = await patientService.deletePatient(id as string, tenantId as string);
    if (!deleted) return res.status(404).json({ error: "Patient not found" });

    res.json({ message: "Patient deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete patient" });
  }
};
