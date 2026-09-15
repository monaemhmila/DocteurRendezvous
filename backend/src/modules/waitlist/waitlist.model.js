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
exports.WaitlistEntry = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const WaitlistEntrySchema = new mongoose_1.Schema({
    tenantId: { type: String, required: true, index: true },
    patientId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    treatment: { type: String, required: true },
    priority: { type: String, enum: ["high", "medium", "low"], default: "medium" },
    preferredDays: { type: [String], default: [] },
    preferredTimeRanges: { type: [String], default: [] },
    status: {
        type: String,
        enum: ["active", "fulfilled", "cancelled", "expired"],
        default: "active",
        index: true,
    },
    notes: { type: String },
    fulfilledByAppointmentId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Appointment" },
}, { timestamps: true });
// Unique constraint: A patient can only have one active waitlist entry per treatment per tenant
WaitlistEntrySchema.index({ tenantId: 1, patientId: 1, treatment: 1 }, { unique: true, partialFilterExpression: { status: "active" } });
exports.WaitlistEntry = mongoose_1.default.model("WaitlistEntry", WaitlistEntrySchema);
//# sourceMappingURL=waitlist.model.js.map