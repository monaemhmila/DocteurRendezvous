"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitlistController = void 0;
const waitlist_service_1 = require("./waitlist.service");
const waitlist_model_1 = require("./waitlist.model");
const followup_model_1 = require("../followups/followup.model");
const appointment_model_1 = require("../appointments/appointment.model");
const mongoose_1 = __importDefault(require("mongoose"));
exports.waitlistController = {
    getEntries: async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "No tenant context" });
            const { patientId } = req.query;
            const query = { tenantId, status: "active" };
            if (patientId) {
                query.patientId = patientId;
            }
            const entries = await waitlist_model_1.WaitlistEntry.find(query)
                .sort({ priority: -1, createdAt: 1 })
                .populate("patientId", "firstName lastName phone");
            res.json(entries);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    createEntry: async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "No tenant context" });
            const { patientId, treatment, priority, notes, preferredDays, preferredTimeRanges } = req.body;
            if (!patientId || !mongoose_1.default.Types.ObjectId.isValid(patientId)) {
                return res.status(400).json({ error: "Patient invalide" });
            }
            if (!treatment || typeof treatment !== "string" || !treatment.trim()) {
                return res.status(400).json({ error: "Le soin souhaité est requis" });
            }
            // Validate patient ownership
            const { Patient } = await import("../patients/patient.model");
            const patient = await Patient.findOne({ _id: patientId, tenantId });
            if (!patient)
                return res.status(404).json({ error: "Patient introuvable pour ce cabinet" });
            const entry = await waitlist_service_1.waitlistService.createEntry({
                patientId,
                treatment: treatment.trim(),
                priority: priority || "medium",
                notes: notes || "",
                preferredDays: preferredDays || [],
                preferredTimeRanges: preferredTimeRanges || [],
            }, tenantId);
            const populatedEntry = await waitlist_model_1.WaitlistEntry.findById(entry._id).populate("patientId", "firstName lastName phone email");
            res.status(201).json(populatedEntry || entry);
        }
        catch (error) {
            if (error.code === 11000) {
                return res.status(400).json({
                    error: "Ce patient est déjà inscrit sur la liste d'attente pour ce traitement.",
                });
            }
            res.status(400).json({ error: error.message || "Erreur lors de l'ajout" });
        }
    },
    cancelEntry: async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "No tenant context" });
            const { id } = req.params;
            const entry = await waitlist_service_1.waitlistService.cancelEntry(id, tenantId);
            res.json(entry);
        }
        catch (error) {
            if (error.message.includes("WaitlistEntry not found")) {
                return res.status(404).json({ error: error.message });
            }
            res.status(400).json({ error: error.message });
        }
    },
    fulfillEntry: async (req, res) => {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(403).json({ error: "No tenant context" });
            const { id: waitlistEntryId } = req.params;
            const { taskId } = req.body;
            if (!taskId)
                return res.status(400).json({ error: "taskId is required" });
            // 1. WaitlistEntry existence and ownership
            const entry = await waitlist_model_1.WaitlistEntry.findOne({ _id: waitlistEntryId, tenantId });
            if (!entry)
                return res.status(404).json({ error: "WaitlistEntry not found" });
            // Idempotency check: if already fulfilled, return existing appointment and ensure task is completed
            if (entry.fulfilledByAppointmentId) {
                const existingAppt = await appointment_model_1.Appointment.findOne({ _id: entry.fulfilledByAppointmentId, tenantId });
                // ensure task is completed
                await followup_model_1.FollowUpTask.findOneAndUpdate({ _id: taskId, tenantId, status: { $in: ["pending", "in_progress"] } }, { $set: { status: "completed", completedAt: new Date() } });
                return res.status(201).json(existingAppt);
            }
            // 2. WaitlistEntry status
            if (entry.status !== "active") {
                return res.status(400).json({ error: "Waitlist entry is not active" });
            }
            // 3. FollowUpTask validation
            const task = await followup_model_1.FollowUpTask.findOne({
                _id: taskId,
                tenantId,
                waitlistEntryId: entry._id
            });
            if (!task)
                return res.status(400).json({ error: "Task not found for this waitlist entry" });
            if (!["pending", "in_progress"].includes(task.status))
                return res.status(400).json({ error: "Task is not actionable" });
            if (task.type !== "slot_fill_offer")
                return res.status(400).json({ error: "Task is not a slot_fill_offer" });
            // 4. Task has sourceAppointmentId
            if (!task.sourceAppointmentId) {
                return res.status(400).json({ error: "Task is missing sourceAppointmentId" });
            }
            // 5. Source appointment exists and belongs to tenant
            const sourceAppt = await appointment_model_1.Appointment.findOne({ _id: task.sourceAppointmentId, tenantId });
            if (!sourceAppt)
                return res.status(404).json({ error: "Source appointment not found" });
            // 6. Booking slot derived exactly from source appointment
            // Write 1: Create Appointment
            let newAppointment;
            try {
                newAppointment = new appointment_model_1.Appointment({
                    tenantId,
                    patientId: entry.patientId,
                    doctorId: sourceAppt.doctorId,
                    date: sourceAppt.date,
                    startTime: sourceAppt.startTime,
                    endTime: sourceAppt.endTime,
                    durationMin: sourceAppt.durationMin,
                    treatment: entry.treatment,
                    status: "scheduled"
                });
                await newAppointment.save();
            }
            catch (err) {
                if (err.code === 11000) {
                    return res.status(409).json({ error: "Ce créneau vient d'être réservé par quelqu'un d'autre." });
                }
                throw err;
            }
            // Write 2: Update WaitlistEntry (Conditional update)
            const updatedEntry = await waitlist_model_1.WaitlistEntry.findOneAndUpdate({ _id: entry._id, status: "active" }, {
                $set: {
                    status: "fulfilled",
                    fulfilledByAppointmentId: newAppointment._id
                }
            }, { returnDocument: 'after' });
            if (!updatedEntry) {
                // Edge case: it was fulfilled by someone else in the millisecond between read and write
                // The appointment is created but might be orphaned or considered a separate booking.
                // It's a valid booking. We return 500 to signal partial failure.
                return res.status(500).json({ error: "Partial failure: Appointment created but WaitlistEntry could not be updated." });
            }
            // Write 3: Update FollowUpTask
            const updatedTask = await followup_model_1.FollowUpTask.findOneAndUpdate({ _id: task._id, status: { $in: ["pending", "in_progress"] } }, {
                $set: {
                    status: "completed",
                    completedAt: new Date()
                }
            });
            if (!updatedTask) {
                // Task update failed (perhaps someone else completed it), but appointment is valid and waitlist is fulfilled.
                return res.status(500).json({ error: "Partial failure: Waitlist fulfilled but FollowUpTask could not be completed." });
            }
            return res.status(201).json(newAppointment);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};
//# sourceMappingURL=waitlist.controller.js.map