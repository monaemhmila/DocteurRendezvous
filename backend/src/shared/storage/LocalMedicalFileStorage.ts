import { MedicalFileStorage } from "./MedicalFileStorage";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export class LocalMedicalFileStorage implements MedicalFileStorage {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), "uploads");
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async save(input: { tenantId: string; patientId: string; file: Express.Multer.File }) {
    // Generate secure storage key
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const storageKey = path.posix.join(input.tenantId, input.patientId, `${uniqueSuffix}${path.extname(input.file.originalname)}`);
    const fullPath = path.resolve(this.baseDir, storageKey);

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Move file from Multer temp path to final path
    fs.renameSync(input.file.path, fullPath);

    // Calculate checksum
    const fileBuffer = fs.readFileSync(fullPath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const checksum = hashSum.digest('hex');

    return {
      storageKey,
      size: input.file.size,
      mimeType: input.file.mimetype,
      checksum
    };
  }

  async read(storageKey: string): Promise<NodeJS.ReadableStream> {
    const fullPath = path.resolve(this.baseDir, storageKey);
    const relative = path.relative(this.baseDir, fullPath);
    if (path.isAbsolute(relative) || relative.startsWith("..")) {
      throw new Error("Invalid storage key");
    }
    if (!fs.existsSync(fullPath)) {
      throw new Error("File not found");
    }
    return fs.createReadStream(fullPath);
  }

  async delete(storageKey: string): Promise<void> {
    const fullPath = path.resolve(this.baseDir, storageKey);
    const relative = path.relative(this.baseDir, fullPath);
    if (path.isAbsolute(relative) || relative.startsWith("..")) {
      throw new Error("Invalid storage key");
    }
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  async exists(storageKey: string): Promise<boolean> {
    const fullPath = path.resolve(this.baseDir, storageKey);
    const relative = path.relative(this.baseDir, fullPath);
    if (path.isAbsolute(relative) || relative.startsWith("..")) {
      return false;
    }
    return fs.existsSync(fullPath);
  }
}
