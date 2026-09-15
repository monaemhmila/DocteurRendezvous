"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Recovery = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const RecoverySchema = new mongoose_1.Schema({
    tenantId: { type: String, required: true },
    patientId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Patient", required: true },
    appointmentId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Appointment" },
    sourceAppointmentId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Appointment" },
    recoveryAppointmentId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Appointment" },
    type: {
        type: String,
        enum: [
            "inactive_patient",
            "interrupted_treatment",
            "pending_quote",
            "no_show",
            "cancellation",
            "overdue_checkup",
            "follow_up_required",
        ],
        required: true,
    },
    status: {
        type: String,
        enum: [
            "identified",
            "queued",
            "contacted",
            "responded",
            "booked",
            "visited",
            "no_response",
            "dismissed",
        ],
        default: "identified",
    },
    priority: {
        type: String,
        enum: ["high", "medium", "low"],
        default: "medium",
    },
    reason: { type: String },
    detectedAt: { type: Date, default: Date.now },
    lastContactedAt: { type: Date },
    nextActionAt: { type: Date },
    estimatedValue: { type: Number, default: 0 },
    bookedValue: { type: Number, default: 0 },
    recoveredValue: { type: Number, default: 0 },
    notes: { type: String },
}, { timestamps: true });
RecoverySchema.index({ tenantId: 1, patientId: 1 });
RecoverySchema.index({ tenantId: 1, type: 1, status: 1 });
RecoverySchema.index({ tenantId: 1, status: 1, detectedAt: -1 });
// Database-level duplicate prevention:
// 1. Event-based recovery (no_show, cancellation): unique per (tenantId, patientId, type, sourceAppointmentId)
RecoverySchema.index({ tenantId: 1, patientId: 1, type: 1, sourceAppointmentId: 1 }, { unique: true, partialFilterExpression: { sourceAppointmentId: { $exists: true } } });
// 2. Patient-level recovery (inactive_patient, overdue_checkup): unique per (tenantId, patientId, type) when status is ACTIVE
RecoverySchema.index({ tenantId: 1, patientId: 1, type: 1 }, {
    unique: true,
    partialFilterExpression: {
        sourceAppointmentId: { $exists: false },
        status: { $in: ["identified", "queued", "contacted", "responded", "booked"] },
    },
});
RecoverySchema.index({ tenantId: 1, recoveryAppointmentId: 1 });
// Index to support 30-day cooldown lookups for automatic detection types.
// Allows fast query: find most recent terminal Recovery of a given type for a patient.
RecoverySchema.index({ tenantId: 1, patientId: 1, type: 1, status: 1, updatedAt: -1 }, {
    partialFilterExpression: {
        type: { $in: ["inactive_patient", "overdue_checkup"] },
        status: { $in: ["no_response", "dismissed", "visited"] },
    },
});
exports.Recovery = mongoose_1.default.model("Recovery", RecoverySchema);
//# sourceMappingURL=recovery.model.js.map