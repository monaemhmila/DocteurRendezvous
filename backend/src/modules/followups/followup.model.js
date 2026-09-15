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
exports.FollowUpAttempt = exports.FollowUpTask = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const FollowUpTaskSchema = new mongoose_1.Schema({
    tenantId: { type: String, required: true, index: true },
    patientId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    recoveryId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Recovery", index: true },
    waitlistEntryId: { type: mongoose_1.Schema.Types.ObjectId, ref: "WaitlistEntry", index: true },
    sourceAppointmentId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Appointment", index: true },
    type: {
        type: String,
        enum: [
            "no_show_followup",
            "cancellation_followup",
            "inactive_reengagement",
            "checkup_reminder",
            "slot_fill_offer",
        ],
        required: true,
    },
    status: {
        type: String,
        enum: ["pending", "in_progress", "completed", "cancelled", "expired"],
        default: "pending",
        index: true,
    },
    priority: {
        type: String,
        enum: ["high", "medium", "low"],
        default: "medium",
    },
    scheduledFor: { type: Date, default: Date.now, index: true },
    completedAt: { type: Date },
    attemptCount: { type: Number, default: 0 },
    notes: { type: String },
}, { timestamps: true });
FollowUpTaskSchema.pre("validate", function () {
    if (!this.recoveryId && !this.waitlistEntryId) {
        throw new Error("FollowUpTask must have either a recoveryId or a waitlistEntryId.");
    }
    else if (this.recoveryId && this.waitlistEntryId) {
        throw new Error("FollowUpTask cannot have both recoveryId and waitlistEntryId.");
    }
});
FollowUpTaskSchema.index({ tenantId: 1, status: 1, scheduledFor: 1 });
FollowUpTaskSchema.index({ tenantId: 1, recoveryId: 1 });
FollowUpTaskSchema.index({ tenantId: 1, waitlistEntryId: 1 });
FollowUpTaskSchema.index({ tenantId: 1, recoveryId: 1, type: 1 }, { unique: true, partialFilterExpression: { recoveryId: { $type: "objectId" } } });
// DB Concurrency constraint: ensure only ONE active slot offer exists for a freed slot
FollowUpTaskSchema.index({ tenantId: 1, sourceAppointmentId: 1 }, {
    unique: true,
    partialFilterExpression: {
        status: { $in: ["pending", "in_progress"] },
        type: "slot_fill_offer",
        sourceAppointmentId: { $exists: true }
    }
});
exports.FollowUpTask = mongoose_1.default.model("FollowUpTask", FollowUpTaskSchema);
const FollowUpAttemptSchema = new mongoose_1.Schema({
    tenantId: { type: String, required: true, index: true },
    recoveryId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Recovery", index: true },
    waitlistEntryId: { type: mongoose_1.Schema.Types.ObjectId, ref: "WaitlistEntry", index: true },
    taskId: { type: mongoose_1.Schema.Types.ObjectId, ref: "FollowUpTask" },
    attemptNumber: { type: Number, required: true },
    channel: {
        type: String,
        enum: ["phone", "whatsapp", "sms", "email", "in_person"],
        default: "phone",
    },
    outcome: {
        type: String,
        enum: ["no_answer", "left_voicemail", "spoken_agreed", "spoken_declined", "invalid_number"],
        default: "no_answer",
    },
    notes: { type: String },
    performedAt: { type: Date, default: Date.now },
}, { timestamps: true });
FollowUpAttemptSchema.pre("validate", function () {
    if (!this.recoveryId && !this.waitlistEntryId) {
        throw new Error("FollowUpAttempt must have either a recoveryId or a waitlistEntryId.");
    }
    else if (this.recoveryId && this.waitlistEntryId) {
        throw new Error("FollowUpAttempt cannot have both recoveryId and waitlistEntryId.");
    }
});
FollowUpAttemptSchema.index({ tenantId: 1, recoveryId: 1, attemptNumber: 1 });
exports.FollowUpAttempt = mongoose_1.default.model("FollowUpAttempt", FollowUpAttemptSchema);
//# sourceMappingURL=followup.model.js.map