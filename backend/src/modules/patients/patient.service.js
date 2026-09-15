"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patientService = void 0;
const patient_model_1 = require("./patient.model");
exports.patientService = {
    getPatients: async (tenantId) => {
        return patient_model_1.Patient.find({ tenantId }).sort({ lastName: 1, firstName: 1 });
    },
    getPatientById: async (id, tenantId) => {
        return patient_model_1.Patient.findOne({ _id: id, tenantId });
    },
    createPatient: async (data, tenantId) => {
        const patient = new patient_model_1.Patient({ ...data, tenantId });
        return patient.save();
    },
    updatePatient: async (id, data, tenantId) => {
        return patient_model_1.Patient.findOneAndUpdate({ _id: id, tenantId }, { $set: data }, { new: true });
    },
    deletePatient: async (id, tenantId) => {
        return patient_model_1.Patient.findOneAndDelete({ _id: id, tenantId });
    },
    searchPatients: async (tenantId, query) => {
        const regex = new RegExp(query, "i");
        return patient_model_1.Patient.find({
            tenantId,
            $or: [{ firstName: regex }, { lastName: regex }, { phone: regex }, { email: regex }],
        }).sort({ lastName: 1, firstName: 1 });
    }
};
//# sourceMappingURL=patient.service.js.map