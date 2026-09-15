"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNoShows = exports.updateAppointmentStatus = exports.checkAvailability = exports.deleteAppointment = exports.updateAppointment = exports.createAppointment = exports.getAppointments = void 0;
const appointment_service_1 = require("./appointment.service");
const availability_service_1 = require("./availability.service");
const getAppointments = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "No tenant context" });
        const { patientId } = req.query;
        const appointments = await appointment_service_1.appointmentService.getAppointments(tenantId, patientId);
        const formatted = appointments.map((a) => ({
            id: a._id.toString(),
            patientId: a.patientId ? a.patientId._id.toString() : "",
            patientName: a.patientId ? `${a.patientId.firstName} ${a.patientId.lastName}` : "Patient inconnu",
            doctorId: a.doctorId,
            date: a.date,
            startTime: a.startTime || a.time || "00:00",
            endTime: a.endTime || "00:00",
            durationMin: a.durationMin,
            treatment: a.treatment,
            notes: a.notes,
            cancellationReason: a.cancellationReason,
            source: a.source,
            status: a.status
        }));
        res.json(formatted);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch appointments" });
    }
};
exports.getAppointments = getAppointments;
const createAppointment = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "No tenant context" });
        // Make sure we default the doctorId to the logged in user if not provided
        const body = {
            ...req.body,
            doctorId: req.body.doctorId || req.user?.id
        };
        const saved = await appointment_service_1.appointmentService.createAppointment(body, tenantId);
        res.status(201).json({ id: saved._id, ...saved.toObject() });
    }
    catch (error) {
        if (error.message === "Double_Booking_Error") {
            return res.status(409).json({ error: "Time slot is not available" });
        }
        res.status(500).json({ error: "Failed to create appointment" });
    }
};
exports.createAppointment = createAppointment;
const updateAppointment = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        const updated = await appointment_service_1.appointmentService.updateAppointment(id, req.body, tenantId);
        if (!updated)
            return res.status(404).json({ error: "Appointment not found" });
        res.json({ id: updated._id, ...updated.toObject() });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to update appointment" });
    }
};
exports.updateAppointment = updateAppointment;
const deleteAppointment = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        const deleted = await appointment_service_1.appointmentService.deleteAppointment(id, tenantId);
        if (!deleted)
            return res.status(404).json({ error: "Appointment not found" });
        res.json({ message: "Appointment deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to delete appointment" });
    }
};
exports.deleteAppointment = deleteAppointment;
const checkAvailability = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "No tenant context" });
        const { date, startTime, endTime, doctorId } = req.query;
        if (!date || !startTime || !endTime) {
            return res.status(400).json({ error: "Missing required query parameters: date, startTime, endTime" });
        }
        const docId = doctorId || req.user?.id;
        if (!docId) {
            return res.status(400).json({ error: "Missing doctorId" });
        }
        const isAvailable = await availability_service_1.availabilityService.checkAvailability({
            tenantId,
            doctorId: docId,
            date: date,
            startTime: startTime,
            endTime: endTime,
        });
        res.json({ available: isAvailable });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to check availability" });
    }
};
exports.checkAvailability = checkAvailability;
const updateAppointmentStatus = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "No tenant context" });
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ error: "Missing status field" });
        }
        const validStatuses = ["scheduled", "confirmed", "cancelled", "completed", "no_show"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
        }
        const updated = await appointment_service_1.appointmentService.updateStatus(id, status, tenantId);
        if (!updated)
            return res.status(404).json({ error: "Appointment not found" });
        res.json({ id: updated._id, ...updated.toObject() });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to update appointment status" });
    }
};
exports.updateAppointmentStatus = updateAppointmentStatus;
const getNoShows = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "No tenant context" });
        const { Appointment } = await import("./appointment.model");
        const noShows = await Appointment.find({ tenantId, status: "no_show" })
            .populate("patientId", "firstName lastName phone")
            .sort({ date: -1, startTime: -1 });
        const formatted = noShows.map((a) => ({
            id: a._id.toString(),
            patientId: a.patientId ? a.patientId._id.toString() : "",
            patientName: a.patientId ? `${a.patientId.firstName} ${a.patientId.lastName}` : "Patient inconnu",
            doctorId: a.doctorId,
            date: a.date,
            startTime: a.startTime || "00:00",
            endTime: a.endTime || "00:00",
            treatment: a.treatment,
            status: a.status
        }));
        res.json(formatted);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch no-shows" });
    }
};
exports.getNoShows = getNoShows;
//# sourceMappingURL=appointment.controller.js.map