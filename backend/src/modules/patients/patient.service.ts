import { Patient, IPatient } from "./patient.model";
import { PaginationParams, PaginatedResult, buildPaginationMeta } from "../../shared/utils/pagination";

export const patientService = {
  getPatients: async (tenantId: string, pagination: PaginationParams): Promise<PaginatedResult<any>> => {
    const filter = { tenantId };
    const [data, total] = await Promise.all([
      Patient.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Patient.countDocuments(filter)
    ]);
    return {
      data,
      meta: buildPaginationMeta(total, pagination.page, pagination.limit)
    };
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
  searchPatients: async (tenantId: string, query: string, pagination: PaginationParams): Promise<PaginatedResult<any>> => {
    const escaped = query.slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    const filter = {
      tenantId,
      $or: [{ firstName: regex }, { lastName: regex }, { phone: regex }, { email: regex }],
    };

    const [data, total] = await Promise.all([
      Patient.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Patient.countDocuments(filter)
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, pagination.page, pagination.limit)
    };
  }
};
