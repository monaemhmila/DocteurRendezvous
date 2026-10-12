import mongoose, { Schema } from "mongoose";
const PatientSchema = new Schema({
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true, index: true },
    email: { type: String, index: true },
    language: { type: String, default: "fr" },
    status: {
        type: String,
        enum: ["active", "inactive", "lead", "at_risk"],
        default: "active",
    },
    tags: [{ type: String }],
    dateOfBirth: { type: Date },
    gender: { type: String },
    notes: { type: String },
    nextAppointmentAt: { type: Date },
    metrics: {
        totalVisits: { type: Number, default: 0 },
        noShowCount: { type: Number, default: 0 },
        lastVisit: { type: Date },
        revenue: { type: Number, default: 0 },
    },
    dentalChart: [
        {
            toothId: { type: Number, required: true },
            status: { type: String, required: true },
            surfaces: { type: Schema.Types.Mixed },
            notes: { type: String },
            updatedAt: { type: Date, default: Date.now },
        }
    ],
    specialtyData: { type: Schema.Types.Mixed, default: {} },
    files: [
        {
            id: { type: String, required: true },
            url: { type: String, required: true },
            title: { type: String, required: true },
            type: { type: String, required: true },
            size: { type: Number, required: true },
            uploadedAt: { type: Date, default: Date.now },
        },
    ],
}, { timestamps: true });
export const Patient = mongoose.model("Patient", PatientSchema);
