"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recoveryService = void 0;
const recovery_model_1 = require("./recovery.model");
const patient_model_1 = require("../patients/patient.model");
const followup_service_1 = require("../followups/followup.service");
// Define a list of active non-terminal statuses to prevent duplicate active opportunities
const ACTIVE_STATUSES = ["identified", "queued", "contacted", "responded", "booked"];
// Centralized Lifecycle State Machine Transition Matrix
const ALLOWED_TRANSITIONS = {
    identified: ["queued", "contacted", "dismissed"],
    queued: ["contacted", "dismissed"],
    contacted: ["responded", "no_response", "dismissed"],
    responded: ["booked", "no_response", "dismissed"],
    booked: ["visited", "dismissed"],
    visited: [],
    no_response: [],
    dismissed: [],
};
function validateTransition(currentStatus, nextStatus) {
    if (currentStatus === nextStatus)
        return; // Idempotent same-state update allowed
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
        throw new Error(`Invalid recovery lifecycle transition from '${currentStatus}' to '${nextStatus}'`);
    }
}
async function validateTenantAndPatientOwnership(tenantId, patientId, sourceAppointmentId, recoveryAppointmentId) {
    // 1. Patient must exist and belong to tenantId
    const patient = await patient_model_1.Patient.findOne({ _id: patientId, tenantId });
    if (!patient) {
        throw new Error("Patient not found or does not belong to authenticated tenant");
    }
    // 2. If sourceAppointmentId is provided, validate it exists and belongs to tenantId + patientId
    if (sourceAppointmentId) {
        const { Appointment } = await import("../appointments/appointment.model");
        const sourceAppt = await Appointment.findOne({ _id: sourceAppointmentId, tenantId, patientId });
        if (!sourceAppt) {
            throw new Error("Source appointment not found or does not match patient/tenant");
        }
    }
    // 3. If recoveryAppointmentId is provided, validate it exists and belongs to tenantId + patientId
    if (recoveryAppointmentId) {
        const { Appointment } = await import("../appointments/appointment.model");
        const recoveryAppt = await Appointment.findOne({ _id: recoveryAppointmentId, tenantId, patientId });
        if (!recoveryAppt) {
            throw new Error("Recovery appointment not found or does not match patient/tenant");
        }
    }
}
exports.recoveryService = {
    createOpportunity: async (data, tenantId) => {
        if (!data.patientId) {
            throw new Error("patientId is required to create a recovery opportunity");
        }
        const patientIdStr = data.patientId.toString();
        const sourceAppointmentIdStr = (data.sourceAppointmentId || data.appointmentId)?.toString();
        const recoveryAppointmentIdStr = data.recoveryAppointmentId?.toString();
        // Tenant & Patient ownership validation
        await validateTenantAndPatientOwnership(tenantId, patientIdStr, sourceAppointmentIdStr, recoveryAppointmentIdStr);
        const sourceApptId = sourceAppointmentIdStr ? data.sourceAppointmentId || data.appointmentId : undefined;
        // Check duplicate active opportunity for event-based or patient-level
        let existing;
        if (sourceApptId) {
            existing = await recovery_model_1.Recovery.findOne({
                tenantId,
                patientId: data.patientId,
                type: data.type,
                sourceAppointmentId: sourceApptId,
            });
        }
        else {
            existing = await recovery_model_1.Recovery.findOne({
                tenantId,
                patientId: data.patientId,
                type: data.type,
                status: { $in: ACTIVE_STATUSES },
            });
        }
        if (existing) {
            return existing;
        }
        const opportunityData = {
            ...data,
            tenantId,
            sourceAppointmentId: sourceApptId,
            appointmentId: sourceApptId || data.appointmentId, // Backward compatibility
        };
        try {
            const opportunity = new recovery_model_1.Recovery(opportunityData);
            return await opportunity.save();
        }
        catch (err) {
            // Handle MongoDB duplicate key error gracefully
            if (err.code === 11000) {
                const fallback = await recovery_model_1.Recovery.findOne({
                    tenantId,
                    patientId: data.patientId,
                    type: data.type,
                    ...(sourceApptId ? { sourceAppointmentId: sourceApptId } : { status: { $in: ACTIVE_STATUSES } }),
                });
                if (fallback)
                    return fallback;
            }
            throw err;
        }
    },
    getOpportunities: async (tenantId, patientId) => {
        const query = { tenantId };
        if (patientId)
            query.patientId = patientId;
        return recovery_model_1.Recovery.find(query)
            .populate("patientId", "firstName lastName phone email")
            .populate("appointmentId", "date startTime endTime treatment")
            .populate("sourceAppointmentId", "date startTime endTime treatment status")
            .populate("recoveryAppointmentId", "date startTime endTime treatment status")
            .sort({ detectedAt: -1 });
    },
    getOpportunityById: async (id, tenantId) => {
        return recovery_model_1.Recovery.findOne({ _id: id, tenantId })
            .populate("patientId")
            .populate("appointmentId")
            .populate("sourceAppointmentId")
            .populate("recoveryAppointmentId");
    },
    updateOpportunity: async (id, data, tenantId) => {
        const opportunity = await recovery_model_1.Recovery.findOne({ _id: id, tenantId });
        if (!opportunity) {
            return null;
        }
        if (data.status && data.status !== opportunity.status) {
            validateTransition(opportunity.status, data.status);
        }
        const { tenantId: _ignoredTenantId, createdAt: _ignoredCreatedAt, updatedAt: _ignoredUpdatedAt, ...safeData } = data;
        return recovery_model_1.Recovery.findOneAndUpdate({ _id: id, tenantId }, { $set: safeData }, { returnDocument: 'after', runValidators: true });
    },
    dismissOpportunity: async (id, tenantId) => {
        const opportunity = await recovery_model_1.Recovery.findOne({ _id: id, tenantId });
        if (!opportunity)
            throw new Error("Opportunity not found");
        validateTransition(opportunity.status, "dismissed");
        opportunity.status = "dismissed";
        return opportunity.save();
    },
    markContacted: async (id, tenantId) => {
        const opportunity = await recovery_model_1.Recovery.findOne({ _id: id, tenantId });
        if (!opportunity)
            throw new Error("Opportunity not found");
        validateTransition(opportunity.status, "contacted");
        opportunity.status = "contacted";
        opportunity.lastContactedAt = new Date();
        return opportunity.save();
    },
    markResponded: async (id, tenantId) => {
        const opportunity = await recovery_model_1.Recovery.findOne({ _id: id, tenantId });
        if (!opportunity)
            throw new Error("Opportunity not found");
        validateTransition(opportunity.status, "responded");
        opportunity.status = "responded";
        return opportunity.save();
    },
    markBooked: async (id, recoveryAppointmentId, bookedValue, tenantId) => {
        const opportunity = await recovery_model_1.Recovery.findOne({ _id: id, tenantId });
        if (!opportunity)
            throw new Error("Opportunity not found");
        if (!recoveryAppointmentId) {
            throw new Error("recoveryAppointmentId is required when marking an opportunity as booked");
        }
        // Idempotency: already booked with the same appointment → return as-is
        if (opportunity.status === "booked" &&
            opportunity.recoveryAppointmentId?.toString() === recoveryAppointmentId) {
            return opportunity;
        }
        // Strict state machine: responded -> booked
        validateTransition(opportunity.status, "booked");
        // Validate ownership of recoveryAppointmentId
        await validateTenantAndPatientOwnership(tenantId, opportunity.patientId.toString(), undefined, recoveryAppointmentId);
        opportunity.status = "booked";
        opportunity.recoveryAppointmentId = recoveryAppointmentId;
        opportunity.bookedValue = bookedValue;
        await opportunity.save();
        // Re-use the existing FollowUpTask — complete it rather than creating a new one.
        const { followupService } = await import("../followups/followup.service");
        await followupService.completeTaskForRecovery(opportunity._id.toString(), tenantId, "Recovery successfully booked via markBooked");
        return opportunity;
    },
    markVisited: async (id, recoveredValue, tenantId) => {
        const opportunity = await recovery_model_1.Recovery.findOne({ _id: id, tenantId });
        if (!opportunity)
            throw new Error("Opportunity not found");
        // Idempotency: if already visited, return without re-adding value or failing
        if (opportunity.status === "visited") {
            return opportunity;
        }
        validateTransition(opportunity.status, "visited");
        opportunity.status = "visited";
        opportunity.recoveredValue = recoveredValue || opportunity.bookedValue || 0;
        await opportunity.save();
        // Ensure any still-active FollowUpTask is completed (defensive, idempotent)
        const { followupService } = await import("../followups/followup.service");
        await followupService.completeTaskForRecovery(opportunity._id.toString(), tenantId, "Recovery reached visited status");
        return opportunity;
    },
    detectRecoveryOpportunities: async (tenantId) => {
        const { followupService } = await import("../followups/followup.service");
        const { Appointment } = await import("../appointments/appointment.model");
        // Detection types subject to the 30-day cooldown
        const DETECTION_TYPES = ["inactive_patient", "overdue_checkup"];
        const COOLDOWN_DAYS = followup_service_1.FOLLOWUP_CONFIG.RECOVERY_REDETECTION_COOLDOWN_DAYS;
        let createdCount = 0;
        const now = new Date();
        const todayIso = now.toISOString().split("T")[0];
        const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        // Thresholds from centralized config
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - followup_service_1.FOLLOWUP_CONFIG.INACTIVE_MONTHS_DEFAULT);
        const twelveMonthsAgo = new Date(now);
        twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1); // 12 months
        const patients = await patient_model_1.Patient.find({ tenantId });
        for (const patient of patients) {
            // Exclusion Rule 1: Skip if patient has an upcoming scheduled or confirmed appointment
            const upcomingAppts = await Appointment.find({
                tenantId,
                patientId: patient._id,
                status: { $in: ["scheduled", "confirmed"] },
            });
            const hasUpcoming = upcomingAppts.some((appt) => {
                if (appt.date > todayIso)
                    return true;
                if (appt.date === todayIso && appt.startTime >= currentHHMM)
                    return true;
                return false;
            });
            if (hasUpcoming)
                continue;
            // Exclusion Rule 2: Skip if patient already has an active recovery opportunity
            const activeRecovery = await recovery_model_1.Recovery.findOne({
                tenantId,
                patientId: patient._id,
                status: { $in: ACTIVE_STATUSES },
            });
            if (activeRecovery)
                continue;
            // Determine last completed visit date: Primary source = actual completed appointments
            let lastVisitDate = null;
            const lastCompletedAppt = await Appointment.findOne({
                tenantId,
                patientId: patient._id,
                status: "completed",
            }).sort({ date: -1, startTime: -1 });
            if (lastCompletedAppt?.date) {
                lastVisitDate = new Date(lastCompletedAppt.date);
            }
            else if (patient.metrics?.lastVisit) {
                lastVisitDate = new Date(patient.metrics.lastVisit);
            }
            // If patient has no completed visit history at all, skip detection
            if (!lastVisitDate)
                continue;
            // Determine candidate detection type
            let candidateType = null;
            if (lastVisitDate <= twelveMonthsAgo) {
                candidateType = "overdue_checkup";
            }
            else if (lastVisitDate <= sixMonthsAgo) {
                candidateType = "inactive_patient";
            }
            if (!candidateType)
                continue;
            // ---------------------------------------------------------------
            // 30-day cooldown: check most recent terminal Recovery of the same
            // detection type for this patient.
            // Appointment-driven types (no_show, cancellation) are NOT subject to this check.
            // ---------------------------------------------------------------
            const cooldownCutoff = new Date(now);
            cooldownCutoff.setDate(cooldownCutoff.getDate() - COOLDOWN_DAYS);
            const recentTerminal = await recovery_model_1.Recovery.findOne({
                tenantId,
                patientId: patient._id,
                type: candidateType,
                status: { $in: ["no_response", "dismissed", "visited"] },
                updatedAt: { $gt: cooldownCutoff },
            }).sort({ updatedAt: -1 });
            if (recentTerminal) {
                // Terminal recovery is within the cooldown window — skip
                continue;
            }
            if (candidateType === "overdue_checkup") {
                const opportunity = await exports.recoveryService.createOpportunity({
                    patientId: patient._id,
                    type: "overdue_checkup",
                    priority: "medium",
                    reason: "Patient n'a pas fait de contrôle depuis plus de 12 mois.",
                    estimatedValue: 120,
                }, tenantId);
                if (opportunity) {
                    await followupService.createTask({
                        patientId: patient._id,
                        recoveryId: opportunity._id,
                        type: "checkup_reminder",
                        priority: "medium",
                        status: "pending",
                    }, tenantId);
                    if (opportunity.isNew || opportunity.createdAt === opportunity.updatedAt)
                        createdCount++;
                }
            }
            else if (candidateType === "inactive_patient") {
                const opportunity = await exports.recoveryService.createOpportunity({
                    patientId: patient._id,
                    type: "inactive_patient",
                    priority: "medium",
                    reason: "Patient inactif depuis plus de 6 mois.",
                    estimatedValue: 100,
                }, tenantId);
                if (opportunity) {
                    await followupService.createTask({
                        patientId: patient._id,
                        recoveryId: opportunity._id,
                        type: "inactive_reengagement",
                        priority: "medium",
                        status: "pending",
                    }, tenantId);
                    if (opportunity.isNew || opportunity.createdAt === opportunity.updatedAt)
                        createdCount++;
                }
            }
        }
        return { success: true, createdCount };
    },
    getStats: async (tenantId) => {
        const opportunities = await recovery_model_1.Recovery.find({ tenantId });
        const analyzed = await patient_model_1.Patient.countDocuments({ tenantId });
        const toRecover = opportunities.length;
        const contacted = opportunities.filter((o) => ["contacted", "responded", "booked", "visited"].includes(o.status)).length;
        const replied = opportunities.filter((o) => ["responded", "booked", "visited"].includes(o.status)).length;
        const booked = opportunities.filter((o) => ["booked", "visited"].includes(o.status)).length;
        const completed = opportunities.filter((o) => o.status === "visited").length;
        let estimatedValue = 0;
        let bookedValue = 0;
        let recoveredValue = 0;
        opportunities.forEach((o) => {
            if (["identified", "queued", "contacted", "responded"].includes(o.status)) {
                estimatedValue += o.estimatedValue || 0;
            }
            else if (o.status === "booked") {
                bookedValue += o.bookedValue || 0;
            }
            else if (o.status === "visited") {
                recoveredValue += o.recoveredValue || 0;
            }
        });
        return {
            analyzed,
            toRecover,
            contacted,
            replied,
            booked,
            completed,
            financials: {
                estimatedValue,
                bookedValue,
                recoveredValue,
            },
        };
    },
};
//# sourceMappingURL=recovery.service.js.map