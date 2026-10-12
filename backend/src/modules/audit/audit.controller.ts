import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/requireAuth";
import { AuditLog } from "./audit.model";
import { parsePagination, buildPaginationMeta } from "../../shared/utils/pagination";
import { auditService } from "./audit.service";

import { Patient } from "../patients/patient.model";
import { Appointment } from "../appointments/appointment.model";
import { z } from "zod";

const auditSchema = z.object({
  action: z.string().min(1).max(100),
  resourceType: z.enum(["patient", "appointment", "system", "file"]),
  resourceId: z.string().optional(),
  details: z.any().optional(),
}).strict();

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "No tenant context" });

    const allowedRoles = ["super_admin", "clinic_owner", "receptionist"];
    if (!allowedRoles.includes(req.user?.role as string)) {
      return res.status(403).json({ error: "Insufficient permissions to view audit logs" });
    }

    const { page, limit, action, resourceType } = req.query;
    const pagination = parsePagination(page, limit);

    const query: any = { tenantId };
    
    if (action) query.action = action;
    if (resourceType) query.resourceType = resourceType;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate("userId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    // Gather IDs to fetch names (filter undefined, cast to mongoose ObjectId)
    const mongoose = (await import("mongoose")).default;
    const patientIds = logs
      .filter(l => l.resourceType === "patient" && l.resourceId)
      .map(l => new mongoose.Types.ObjectId(l.resourceId!));
    const appointmentIds = logs
      .filter(l => l.resourceType === "appointment" && l.resourceId)
      .map(l => new mongoose.Types.ObjectId(l.resourceId!));

    // Fetch related docs
    const [patients, appointments] = await Promise.all([
      patientIds.length ? Patient.find({ _id: { $in: patientIds } }).select("firstName lastName").lean() : [],
      appointmentIds.length ? Appointment.find({ _id: { $in: appointmentIds } }).populate("patientId", "firstName lastName").select("patientId").lean() : [],
    ]);

    const patientMap = new Map(patients.map(p => [p._id.toString(), `${p.firstName} ${p.lastName}`]));
    const appointmentMap = new Map(appointments.map(a => {
      const p = a.patientId as any;
      return [a._id.toString(), p ? `${p.firstName} ${p.lastName}` : "Patient Inconnu"];
    }));

    const formatted = logs.map(log => {
      let resourceName = log.resourceId;
      if (log.resourceType === "patient" && log.resourceId && patientMap.has(log.resourceId)) {
        resourceName = patientMap.get(log.resourceId);
      } else if (log.resourceType === "appointment" && log.resourceId && appointmentMap.has(log.resourceId)) {
        resourceName = `RDV de ${appointmentMap.get(log.resourceId)}`;
      }

      return {
        _id: log._id,
        id: log._id,
        user: log.userId ? `${(log.userId as any).firstName} ${(log.userId as any).lastName}`.trim() : "Unknown",
        userRole: log.userRole,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        resourceName, // Add resolved name here
        details: log.details,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt,
      };
    });

    res.json({
      data: formatted,
      meta: buildPaginationMeta(total, pagination.page, pagination.limit)
    });
  } catch (error) {
    console.error("getAuditLogs error:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
};

export const createAuditLog = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "No tenant context" });
    
    // Strict RBAC: only allow certain roles if necessary, though all auth users can generate audit logs for themselves
    
    // Validate body strictly
    const parsed = auditSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid audit format", details: parsed.error.issues });
    }
    
    const { action, resourceType, resourceId, details } = parsed.data;

    // Server-side verification for the resource
    if (resourceType === "patient" && resourceId) {
      const patientExists = await Patient.findOne({ _id: resourceId, tenantId }).lean();
      if (!patientExists) {
        return res.status(403).json({ error: "Unauthorized access to this resource" });
      }
      
      // If verifying a specific file, check if it's in the patient record
      if (details?.instanceId) {
        const fileExists = patientExists.files?.some((f: any) => f.id === details.instanceId);
        if (!fileExists) {
          return res.status(403).json({ error: "File not found in patient records" });
        }
      }
    }

    // Server constructs the log, ignoring any spoofed userId, tenantId, etc.
    await auditService.logAction({
      req, // Contains actorUserId, ipAddress, userAgent
      action: action,
      resourceType: resourceType,
      resourceId: resourceId || undefined,
      details: {
        ...(details || {}),
        verifiedAt: new Date().toISOString()
      },
    });

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("createAuditLog error:", error);
    res.status(500).json({ error: "Failed to create audit log" });
  }
};
