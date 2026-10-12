import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/requireAuth";
import { patientService } from "./patient.service";
import { parsePagination } from "../../shared/utils/pagination";
import { auditService } from "../audit/audit.service";
import path from "path";
import fs from "fs";
import { LocalMedicalFileStorage } from "../../shared/storage/LocalMedicalFileStorage";
import dicomParser from "dicom-parser";

const storageService = new LocalMedicalFileStorage();

export const getPatients = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "No tenant context" });

    const pagination = parsePagination(req.query.page, req.query.limit);

    let result;
    const { search } = req.query;
    if (search && typeof search === "string") {
      result = await patientService.searchPatients(tenantId, search, pagination);
    } else {
      result = await patientService.getPatients(tenantId, pagination);
    }

    const formatted = result.data.map((p: any) => ({
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
      specialtyData: p.specialtyData || {},
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    res.json({
      data: formatted,
      meta: result.meta
    });
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

    // GDPR/HIPAA: Log sensitive PHI access
    await auditService.logAction({
      req,
      action: "VIEW_PATIENT",
      resourceType: "patient",
      resourceId: id as string,
    });

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
      dentalChart: patient.dentalChart || [],
      specialtyData: patient.specialtyData || {},
      files: patient.files || [],
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
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
    
    await auditService.logAction({
      req,
      action: "CREATE_PATIENT",
      resourceType: "patient",
      resourceId: saved._id.toString(),
    });

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

    await auditService.logAction({
      req,
      action: "UPDATE_PATIENT",
      resourceType: "patient",
      resourceId: id as string,
    });

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

    await auditService.logAction({
      req,
      action: "DELETE_PATIENT",
      resourceType: "patient",
      resourceId: id as string,
    });

    res.json({ message: "Patient deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete patient" });
  }
};

export const uploadPatientFile = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Server-side strict MIME validation
    const allowedMimes = ["image/jpeg", "image/png", "application/dicom", "application/pdf"];
    if (!allowedMimes.includes(req.file.mimetype) && !req.file.originalname.toLowerCase().endsWith(".dcm")) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Invalid file type. Only standard images and DICOM are allowed." });
    }

    // Basic Magic Byte Verification
    try {
      const buffer = Buffer.alloc(132);
      const fd = fs.openSync(req.file.path, 'r');
      fs.readSync(fd, buffer, 0, 132, 0);
      fs.closeSync(fd);
      
      const isDicom = buffer.toString('utf8', 128, 132) === 'DICM' || req.file.originalname.toLowerCase().endsWith(".dcm"); // Many valid DICOMs lack the 128-byte preamble.
      const hex = buffer.toString('hex', 0, 4).toUpperCase();
      const isJpeg = hex.startsWith('FFD8FF');
      const isPng = hex.startsWith('89504E47');
      const isPdf = hex.startsWith('25504446');
      
      if (!isDicom && !isJpeg && !isPng && !isPdf) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Fichier corrompu ou format non reconnu (Magic Bytes mismatch)." });
      }
    } catch (err) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Impossible de lire le fichier." });
    }

    // Hard limit size on top of multer (e.g., 250MB)
    const MAX_SIZE = 250 * 1024 * 1024;
    if (req.file.size > MAX_SIZE) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "File exceeds 250MB limit." });
    }

    const patient = await patientService.getPatientById(id as string, tenantId as string);
    if (!patient) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "Patient not found" });
    }

    // Attempt DICOM parsing if applicable
    let dicomMeta: any = {};
    if (req.file.originalname.toLowerCase().endsWith(".dcm")) {
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        const dataSet = dicomParser.parseDicom(fileBuffer);
        dicomMeta = {
          isDicom: true,
          studyInstanceUID: dataSet.string('x0020000d'),
          seriesInstanceUID: dataSet.string('x0020000e'),
          sopInstanceUID: dataSet.string('x00080018'),
          modality: dataSet.string('x00080060'),
          studyDate: dataSet.string('x00080020'),
          studyDescription: dataSet.string('x00081030'),
          seriesDescription: dataSet.string('x0008103e'),
          instanceNumber: dataSet.string('x00200013') ? parseInt(dataSet.string('x00200013')) : undefined,
          pixelSpacing: dataSet.string('x00280030'),
          windowCenter: dataSet.string('x00281050'),
          windowWidth: dataSet.string('x00281051'),
          metadataStatus: "valid"
        };
      } catch (e) {
        console.error("DICOM parse failed:", e);
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          error: "DICOM invalide ou corrompu. Le fichier n'a pas pu être analysé.",
          metadataStatus: "invalid"
        });
      }
    }

    // Save via Storage Abstraction
    const saved = await storageService.save({
      tenantId: tenantId as string,
      patientId: id as string,
      file: req.file
    });

    const newFile = {
      id: req.file.originalname, // safeDisplayName
      storageKey: saved.storageKey,
      title: req.file.originalname,
      type: saved.mimeType,
      size: saved.size,
      checksum: saved.checksum,
      uploadedAt: new Date(),
      ...dicomMeta
    };

    if (!patient.files) {
      patient.files = [];
    }
    patient.files.push(newFile as any);
    await patient.save();

    await auditService.logAction({
      req,
      action: "UPLOAD_FILE",
      resourceType: "patient",
      resourceId: id as string,
    });

    res.status(201).json(newFile);
  } catch (error) {
    console.error("Upload error:", error);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: "Failed to upload file" });
  }
};

export const downloadPatientFile = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const fileId = req.params.fileId as string;

    // Check if the patient exists and belongs to the current tenant
    const patient = await patientService.getPatientById(id as string, tenantId as string);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    // Verify if the file is part of this patient's records
    const fileRecord = patient.files?.find(f => f.id === fileId);
    if (!fileRecord) return res.status(404).json({ error: "File not found for this patient" });

    let storageKey = fileRecord.storageKey;
    if (!storageKey && fileRecord.url && fileRecord.url.startsWith("/uploads/")) {
      storageKey = fileRecord.url.replace(/^\/uploads\//, "");
    }

    if (!storageKey || !(await storageService.exists(storageKey))) {
      return res.status(404).json({ error: "File not found on server" });
    }

    // Log the download action securely
    await auditService.logAction({
      req,
      action: "DOWNLOAD_FILE",
      resourceType: "patient",
      resourceId: id as string,
    });

    res.setHeader('Content-Type', fileRecord.type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.title}"`);
    
    const stream = await storageService.read(storageKey);
    stream.pipe(res);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "Failed to download file" });
  }
};
