import { Patient, IPatient } from "./patient.model";

export const patientService = {
  getPatients: async (tenantId: string) => {
    return Patient.find({ tenantId }).sort({ lastName: 1, firstName: 1 });
  },
  getPatientById: async (id: string, tenantId: string) => {
    return Patient.findOne({ _id: id, tenantId });
  },
  createPatient: async (data: Partial<IPatient>, tenantId: string) => {
    const patient = new Patient({ ...data, tenantId });
    return patient.save();
  },
  updatePatient: async (id: string, data: Partial<IPatient>, tenantId: string) => {
    const { tenantId: _ignoredTenantId, createdAt: _ignoredCreatedAt, updatedAt: _ignoredUpdatedAt, ...safeData } =
      data as any;
    return Patient.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: safeData },
      { returnDocument: 'after', runValidators: true }
    );
  },
  deletePatient: async (id: string, tenantId: string) => {
    return Patient.findOneAndDelete({ _id: id, tenantId });
  },
  searchPatients: async (tenantId: string, query: string) => {
    const escaped = query.slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    return Patient.find({
      tenantId,
      $or: [{ firstName: regex }, { lastName: regex }, { phone: regex }, { email: regex }],
    }).sort({ lastName: 1, firstName: 1 });
  }
};
