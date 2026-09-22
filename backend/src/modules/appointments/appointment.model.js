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
exports.Appointment = void 0;
exports.computeOccupiedSlots = computeOccupiedSlots;
const mongoose_1 = __importStar(require("mongoose"));
function computeOccupiedSlots(startTime, endTime, stepMins = 5) {
    if (!startTime || !endTime)
        return [];
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
        return [startTime];
    }
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;
    if (endTotal <= startTotal) {
        return [startTime];
    }
    const slots = [];
    for (let m = startTotal; m < endTotal; m += stepMins) {
        const h = Math.floor(m / 60).toString().padStart(2, "0");
        const min = (m % 60).toString().padStart(2, "0");
        slots.push(`${h}:${min}`);
    }
    return slots.length > 0 ? slots : [startTime];
}
const AppointmentSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    patientId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    doctorId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    durationMin: { type: Number, required: true, default: 30 },
    occupiedSlots: { type: [String], required: true, default: [] },
    treatment: { type: String, required: true },
    notes: { type: String },
    cancellationReason: { type: String },
    source: { type: String },
    reminderSentAt: { type: Date },
    status: {
        type: String,
        enum: ["scheduled", "confirmed", "completed", "cancelled", "no_show"],
        default: "scheduled",
    },
}, { timestamps: true });
// Automatically compute occupiedSlots before validate & save
AppointmentSchema.pre("validate", function () {
    if (this.startTime && this.endTime && (!this.occupiedSlots || this.occupiedSlots.length === 0)) {
        this.occupiedSlots = computeOccupiedSlots(this.startTime, this.endTime);
    }
});
AppointmentSchema.pre("save", function () {
    if (this.startTime && this.endTime && (this.isModified("startTime") || this.isModified("endTime") || !this.occupiedSlots || this.occupiedSlots.length === 0)) {
        this.occupiedSlots = computeOccupiedSlots(this.startTime, this.endTime);
    }
});
// DB Multikey Concurrency constraint: ensure NO overlapping slots exist for the same doctor/date
AppointmentSchema.index({ tenantId: 1, doctorId: 1, date: 1, occupiedSlots: 1 }, { unique: true, partialFilterExpression: { status: { $in: ["scheduled", "confirmed"] } } });
exports.Appointment = mongoose_1.default.model("Appointment", AppointmentSchema);
//# sourceMappingURL=appointment.model.js.map