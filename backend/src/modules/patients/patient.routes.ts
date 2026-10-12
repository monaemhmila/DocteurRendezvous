import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { getPatients, getPatientById, createPatient, updatePatient, deletePatient, uploadPatientFile, downloadPatientFile } from "./patient.controller";
import { requireAuth } from "../../shared/middleware/requireAuth";
import { checkQuota } from "../../shared/require-plan.middleware";
import { Patient } from "./patient.model";

// Setup multer for local file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ 
  storage,
  limits: { fileSize: 250 * 1024 * 1024 } // Strict 250 MB limit
});

const router = Router();

router.use(requireAuth as any);

router.get("/", getPatients as any);
router.post("/", checkQuota("maxPatients", Patient) as any, createPatient as any);
router.get("/:id", getPatientById as any);
router.put("/:id", updatePatient as any);
router.delete("/:id", deletePatient as any);
router.post("/:id/files", upload.single("file") as any, uploadPatientFile as any);
router.get("/:id/files/:fileId/download", downloadPatientFile as any);

export default router;
