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
    return Patient.findOneAndUpdate({ _id: id, tenantId }, { $set: data }, { new: true });
  },
  deletePatient: async (id: string, tenantId: string) => {
    return Patient.findOneAndDelete({ _id: id, tenantId });
  },
  searchPatients: async (tenantId: string, query: string) => {
    const regex = new RegExp(query, "i");
    return Patient.find({
      tenantId,
      $or: [{ firstName: regex }, { lastName: regex }, { phone: regex }, { email: regex }],
    }).sort({ lastName: 1, firstName: 1 });
  }
};
