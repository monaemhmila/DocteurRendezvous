import { Request, Response } from "express";
import { Prescription } from "./prescription.model";
import mongoose from "mongoose";

/** GET /api/v1/prescriptions?patientId=xxx&limit=20&page=1 */
export async function getPrescriptions(req: Request, res: Response) {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

    const { patientId, limit = "20", page = "1" } = req.query as Record<string, string>;
    const lim = Math.min(Number(limit) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * lim;

    const filter: Record<string, any> = { tenantId };
    if (patientId) filter.patientId = new mongoose.Types.ObjectId(patientId);

    const [data, total] = await Promise.all([
      Prescription.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
      Prescription.countDocuments(filter),
    ]);

    return res.json({ data, meta: { total, page: Number(page), limit: lim } });
  } catch (err) {
    console.error("[Prescriptions] GET error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

/** POST /api/v1/prescriptions */
export async function createPrescription(req: Request, res: Response) {
  try {
    const tenantId = (req as any).user?.tenantId;
    const doctorId = (req as any).user?._id;
    if (!tenantId || !doctorId) return res.status(401).json({ error: "Unauthorized" });

    const { patientId, items, diagnosis, doctorName, cabinetName, specialty, notes } = req.body;

    if (!patientId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "patientId and items[] are required" });
    }

    const prescription = await Prescription.create({
      tenantId,
      patientId,
      doctorId,
      diagnosis,
      doctorName,
      cabinetName,
      specialty,
      items,
      notes,
    });

    return res.status(201).json(prescription);
  } catch (err) {
    console.error("[Prescriptions] POST error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

/** DELETE /api/v1/prescriptions/:id */
export async function deletePrescription(req: Request, res: Response) {
  try {
    const tenantId = (req as any).user?.tenantId;
    const { id } = req.params;

    const rx = await Prescription.findOneAndDelete({ _id: id, tenantId });
    if (!rx) return res.status(404).json({ error: "Not Found" });

    return res.json({ success: true });
  } catch (err) {
    console.error("[Prescriptions] DELETE error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
