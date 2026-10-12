export interface MedicalFileStorage {
  save(input: {
    tenantId: string;
    patientId: string;
    file: Express.Multer.File;
  }): Promise<{
    storageKey: string;
    size: number;
    mimeType: string;
    checksum: string;
  }>;

  read(storageKey: string): Promise<NodeJS.ReadableStream>;

  delete(storageKey: string): Promise<void>;

  exists(storageKey: string): Promise<boolean>;
}
