"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentService = exports.reminderService = void 0;
const appointment_model_1 = require("./appointment.model");
const availability_service_1 = require("./availability.service");
const recovery_service_1 = require("../recovery/recovery.service");
const patient_model_1 = require("../patients/patient.model");
const user_model_1 = require("../users/user.model");
const tenant_model_1 = require("../tenants/tenant.model");
const communication_model_1 = require("../communications/communication.model");
const messaging_provider_1 = require("../communications/providers/messaging.provider");
let reminderWorkerTimer = null;
let isReminderRunning = false;
exports.reminderService = {
    /**
     * Process automated 24h reminders (Rappel J-1) for appointments scheduled for tomorrow.
     */
    processUpcomingReminders: async () => {
        if (isReminderRunning)
            return { sentCount: 0 };
        isReminderRunning = true;
        let sentCount = 0;
        try {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowIso = tomorrow.toISOString().slice(0, 10);
            // Find all appointments scheduled for tomorrow without a reminder
            const pendingAppointments = await appointment_model_1.Appointment.find({
                date: tomorrowIso,
                status: { $in: ["scheduled", "confirmed"] },
                reminderSentAt: { $exists: false },
            }).lean();
            const messagingProvider = new messaging_provider_1.MetaWhatsAppProvider();
            for (const appt of pendingAppointments) {
                try {
                    const tenant = await tenant_model_1.Tenant.findById(appt.tenantId).lean();
                    if (!tenant)
                        continue;
                    // Check if reminders capability is active for this tenant
                    if (tenant.settings?.aiConfig?.capabilities?.reminders === false)
                        continue;
                    const patient = await patient_model_1.Patient.findOne({
                        _id: appt.patientId,
                        tenantId: appt.tenantId,
                    }).lean();
                    if (!patient?.phone)
                        continue;
                    const cleanPhone = patient.phone.replace(/[^0-9]/g, "");
                    const patientName = patient.firstName && patient.firstName.toLowerCase() !== "patient"
                        ? `${patient.firstName} ${patient.lastName || ""}`.trim()
                        : "Cher patient";
                    const clinicName = tenant.name || "notre cabinet dentaire";
                    const treatment = appt.treatment || "Consultation dentaire";
                    const isArabic = patient.language === "ar";
                    const reminderText = isArabic
                        ? `عسلامة ${patientName} 👋\nنذكروك بموعدك غدوة *${appt.date}* مع *${appt.startTime}* في ${clinicName} (${treatment}).\n\n✅ لتأكيد حضورك، الرجاء الرد بـ *نعم* أو *نأكد*. وإذا عندك التزام وتحب تبدل الموعد، تنجم تطلب تأجيله مباشرة من هنا.`
                        : `Bonjour ${patientName} 👋\nNous vous rappelons votre rendez-vous demain *${appt.date}* à *${appt.startTime}* au ${clinicName} (${treatment}).\n\n✅ Répondez *OUI* pour confirmer votre présence, ou écrivez-nous pour modifier votre créneau si vous avez un empêchement.`;
                    let conv = await communication_model_1.Conversation.findOne({
                        tenantId: appt.tenantId,
                        contactWaId: cleanPhone,
                    });
                    if (!conv) {
                        conv = await communication_model_1.Conversation.create({
                            tenantId: appt.tenantId,
                            patientId: patient._id,
                            contactWaId: cleanPhone,
                            channel: "whatsapp",
                            status: "active",
                            lastMessageAt: new Date(),
                        });
                    }
                    const sendResult = await messagingProvider.sendMessage({
                        to: cleanPhone,
                        type: "text",
                        content: reminderText,
                    }, tenant);
                    await communication_model_1.Message.create({
                        tenantId: appt.tenantId,
                        conversationId: conv._id,
                        patientId: patient._id,
                        direction: "outbound",
                        status: "sent",
                        content: reminderText,
                        providerMessageId: sendResult.providerMessageId || `reminder_${appt._id}_${Date.now()}`,
                    });
                    await appointment_model_1.Appointment.findByIdAndUpdate(appt._id, {
                        $set: { reminderSentAt: new Date() },
                    });
                    sentCount++;
                    console.log(`[Reminder Service] 24h Reminder sent to ${cleanPhone} for appointment on ${appt.date} at ${appt.startTime}`);
                }
                catch (err) {
                    console.error(`[Reminder Service] Error sending reminder for appointment ${appt._id}:`, err.message);
                }
            }
        }
        catch (err) {
            console.error("[Reminder Service] Error in processUpcomingReminders:", err.message);
        }
        finally {
            isReminderRunning = false;
        }
        return { sentCount };
    },
    /**
     * Start background reminder interval (runs every 30 minutes).
     */
    startBackgroundWorker: (intervalMs = 30 * 60 * 1000) => {
        if (reminderWorkerTimer)
            return;
        console.log("⏰ [Reminder Service] Automated 24h appointment reminder worker started (30m interval)");
        setTimeout(() => {
            exports.reminderService.processUpcomingReminders().catch((err) => console.error("[Reminder Service] Initial run error:", err.message));
        }, 15_000);
        reminderWorkerTimer = setInterval(() => {
            exports.reminderService.processUpcomingReminders().catch((err) => console.error("[Reminder Service] Scheduled run error:", err.message));
        }, intervalMs);
    }
};
exports.appointmentService = {
    getAppointments: async (tenantId, patientId) => {
        const query = { tenantId };
        if (patientId)
            query.patientId = patientId;
        return appointment_model_1.Appointment.find(query)
            .populate("patientId", "firstName lastName phone")
            .sort({ date: -1, startTime: -1 });
    },
    getAppointmentById: async (id, tenantId) => {
        return appointment_model_1.Appointment.findOne({ _id: id, tenantId }).populate("patientId", "firstName lastName phone");
    },
    createAppointment: async (data, tenantId) => {
        if (!data.patientId) {
            throw new Error("Patient is required");
        }
        // Cross-tenant reference protection: both patient and doctor must belong to
        // the authenticated tenant. The frontend never supplies tenantId.
        const patient = await patient_model_1.Patient.findOne({ _id: data.patientId, tenantId }).select("_id").lean();
        if (!patient) {
            throw new Error("Patient not found or does not belong to authenticated tenant");
        }
        let doctorId = data.doctorId?.toString();
        if (!doctorId) {
            const owners = await user_model_1.User.find({ tenantId, role: "clinic_owner" }).select("_id").lean();
            if (owners.length === 1) {
                doctorId = owners[0]._id.toString();
            }
            else if (owners.length > 1) {
                throw new Error("Multiple clinic owners configured; cannot determine the treating doctor");
            }
            else {
                const dentists = await user_model_1.User.find({ tenantId, role: "dentist" }).select("_id").lean();
                if (dentists.length === 1) {
                    doctorId = dentists[0]._id.toString();
                }
                else {
                    throw new Error("No unique treating doctor configured");
                }
            }
        }
        const doctor = await user_model_1.User.findOne({
            _id: doctorId,
            tenantId,
            role: { $in: ["clinic_owner", "dentist"] },
        }).select("_id").lean();
        if (!doctor) {
            throw new Error("Doctor not found or does not belong to authenticated tenant");
        }
        const appointmentData = { ...data, doctorId };
        // Compute occupied atomic slots
        if (appointmentData.startTime && appointmentData.endTime) {
            const { computeOccupiedSlots } = await import("./appointment.model");
            appointmentData.occupiedSlots = computeOccupiedSlots(appointmentData.startTime, appointmentData.endTime);
        }
        // Check availability first to prevent double-booking
        if (appointmentData.date && appointmentData.startTime && appointmentData.endTime && appointmentData.doctorId) {
            const isAvailable = await availability_service_1.availabilityService.checkAvailability({
                tenantId,
                doctorId: appointmentData.doctorId,
                date: appointmentData.date,
                startTime: appointmentData.startTime,
                endTime: appointmentData.endTime,
            });
            if (!isAvailable) {
                throw new Error("Double_Booking_Error");
            }
        }
        const appointment = new appointment_model_1.Appointment({ ...appointmentData, tenantId });
        try {
            return await appointment.save();
        }
        catch (err) {
            // Catch MongoDB Duplicate Key Error (11000)
            if (err.code === 11000) {
                throw new Error("Double_Booking_Error");
            }
            throw err;
        }
    },
    updateAppointment: async (id, data, tenantId) => {
        const existing = await appointment_model_1.Appointment.findOne({ _id: id, tenantId });
        if (!existing)
            return null;
        const { tenantId: _ignoredTenantId, createdAt: _ignoredCreatedAt, updatedAt: _ignoredUpdatedAt, status: _ignoredStatus, ...safeData } = data;
        const nextDate = safeData.date ?? existing.date;
        const nextStartTime = safeData.startTime ?? existing.startTime;
        const nextEndTime = safeData.endTime ?? existing.endTime;
        const nextDoctorId = safeData.doctorId ?? existing.doctorId;
        if (safeData.patientId) {
            const patient = await patient_model_1.Patient.findOne({ _id: safeData.patientId, tenantId }).select("_id").lean();
            if (!patient)
                throw new Error("Patient not found or does not belong to authenticated tenant");
        }
        if (safeData.doctorId) {
            const doctor = await user_model_1.User.findOne({
                _id: safeData.doctorId,
                tenantId,
                role: { $in: ["clinic_owner", "dentist"] },
            }).select("_id").lean();
            if (!doctor)
                throw new Error("Doctor not found or does not belong to authenticated tenant");
        }
        if (nextDate !== existing.date ||
            nextStartTime !== existing.startTime ||
            nextEndTime !== existing.endTime ||
            String(nextDoctorId) !== String(existing.doctorId)) {
            const isAvailable = await availability_service_1.availabilityService.checkAvailability({
                tenantId,
                doctorId: String(nextDoctorId),
                date: String(nextDate),
                startTime: String(nextStartTime),
                endTime: String(nextEndTime),
            });
            if (!isAvailable) {
                throw new Error("Double_Booking_Error");
            }
            const { computeOccupiedSlots } = await import("./appointment.model");
            safeData.occupiedSlots = computeOccupiedSlots(String(nextStartTime), String(nextEndTime));
        }
        try {
            return await appointment_model_1.Appointment.findOneAndUpdate({ _id: id, tenantId }, { $set: safeData }, { returnDocument: 'after', runValidators: true });
        }
        catch (err) {
            if (err.code === 11000) {
                throw new Error("Double_Booking_Error");
            }
            throw err;
        }
    },
    deleteAppointment: async (id, tenantId) => {
        return appointment_model_1.Appointment.findOneAndDelete({ _id: id, tenantId });
    },
    updateStatus: async (id, status, tenantId) => {
        const updated = await appointment_model_1.Appointment.findOneAndUpdate({ _id: id, tenantId }, { $set: { status } }, { returnDocument: 'after' });
        if (updated) {
            await handleStatusChange(updated, tenantId);
        }
        return updated;
    }
};
/**
 * Handle recovery opportunity creation when appointment status changes.
 * no_show -> create no_show recovery opportunity
 * cancelled -> create cancellation recovery opportunity
 * completed -> mark any related booked recovery opportunity as visited
 */
async function handleStatusChange(appointment, tenantId) {
    const status = appointment.status;
    if (status === "no_show") {
        // 1. Increment patient metrics noShowCount
        if (appointment.patientId) {
            await patient_model_1.Patient.findOneAndUpdate({ _id: appointment.patientId, tenantId }, { $inc: { "metrics.noShowCount": 1 } });
        }
        // 2. Create recovery opportunity
        const recovery = await recovery_service_1.recoveryService.createOpportunity({
            patientId: appointment.patientId,
            sourceAppointmentId: appointment._id,
            appointmentId: appointment._id,
            type: "no_show",
            priority: "high",
            reason: `Rendez-vous manqué : ${appointment.treatment || "—"} le ${appointment.date}`,
            estimatedValue: 0,
        }, tenantId);
        if (recovery) {
            const { followupService } = await import("../followups/followup.service");
            const task = await followupService.createTask({
                patientId: appointment.patientId,
                recoveryId: recovery._id,
                type: "no_show_followup",
                priority: "high",
                status: "pending",
            }, tenantId);
            // 3. Automated WhatsApp outreach dispatch
            try {
                const tenant = await tenant_model_1.Tenant.findById(tenantId).lean();
                const patient = await patient_model_1.Patient.findOne({ _id: appointment.patientId, tenantId }).lean();
                if (patient?.phone) {
                    const cleanPhone = patient.phone.replace(/[^0-9]/g, "");
                    const patientName = patient.firstName && patient.firstName.toLowerCase() !== "patient"
                        ? `${patient.firstName} ${patient.lastName || ""}`.trim()
                        : "Cher patient";
                    const clinicName = tenant?.name || "notre cabinet dentaire";
                    const treatment = appointment.treatment || "Consultation dentaire";
                    const isArabic = patient.language === "ar";
                    const messageText = isArabic
                        ? `عسلامة ${patientName} 👋\nلاحظنا غيابك اليوم عن موعدك (${treatment}) في ${clinicName}.\nنتمنى أن المانع خير ! إذا تحب تبرمج موعد جديد، تنجم تجاوبنا مباشرة هنا ونقترحوا عليك أقرب أوقات شاغرة.`
                        : `Bonjour ${patientName} 👋\nNous avons constaté votre absence à votre rendez-vous (${treatment}) au ${clinicName}.\nNous espérons que tout va bien ! Souhaitez-vous reprogrammer votre consultation ? Vous pouvez nous répondre directement ici pour choisir un nouveau créneau.`;
                    // Send via Meta provider (best effort)
                    try {
                        const messagingProvider = new messaging_provider_1.MetaWhatsAppProvider();
                        await messagingProvider.sendMessage({
                            to: cleanPhone,
                            text: messageText,
                        }, tenant);
                    }
                    catch (sendErr) {
                        console.warn("Meta WhatsApp API call skipped/failed:", sendErr?.message);
                    }
                    // Save conversation & message
                    let conv = await communication_model_1.Conversation.findOne({
                        tenantId,
                        contactWaId: cleanPhone,
                    });
                    if (!conv) {
                        conv = new communication_model_1.Conversation({
                            tenantId,
                            patientId: patient._id,
                            contactWaId: cleanPhone,
                            contactName: patientName,
                            unreadCount: 0,
                            lastMessageAt: new Date(),
                            status: "active",
                        });
                    }
                    conv.lastMessageAt = new Date();
                    conv.patientId = patient._id;
                    await conv.save();
                    const msg = new communication_model_1.Message({
                        tenantId,
                        conversationId: conv._id,
                        sender: "assistant",
                        direction: "outbound",
                        content: messageText,
                        providerMessageId: `no-show-outreach-${appointment._id}-${Date.now()}`,
                        timestamp: new Date(),
                        status: "sent",
                    });
                    await msg.save();
                    // Log attempt and update recovery status to contacted
                    await followupService.logAttempt({
                        recoveryId: recovery._id.toString(),
                        taskId: task?._id?.toString(),
                        channel: "whatsapp",
                        outcome: "no_answer",
                        notes: "Relance automatique WhatsApp envoyée suite au No-Show",
                    }, tenantId);
                    await recovery_service_1.recoveryService.markContacted(recovery._id.toString(), tenantId);
                }
            }
            catch (err) {
                console.error("Automated No-Show WhatsApp dispatch failed:", err);
            }
        }
    }
    if (status === "cancelled") {
        const recovery = await recovery_service_1.recoveryService.createOpportunity({
            patientId: appointment.patientId,
            sourceAppointmentId: appointment._id,
            appointmentId: appointment._id,
            type: "cancellation",
            priority: "medium",
            reason: `Rendez-vous annulé : ${appointment.treatment || "—"} le ${appointment.date}`,
            estimatedValue: 0,
        }, tenantId);
        if (recovery) {
            const { followupService } = await import("../followups/followup.service");
            await followupService.createTask({
                patientId: appointment.patientId,
                recoveryId: recovery._id,
                type: "cancellation_followup",
                priority: "medium",
                status: "pending",
            }, tenantId);
        }
    }
    // Phase 3.5: Waitlist Slot-Filling Trigger
    if (status === "cancelled" || status === "no_show") {
        let isUsable = true;
        // For no_show, only attempt to fill if the slot hasn't passed
        if (status === "no_show") {
            const now = new Date();
            // Assume date format YYYY-MM-DD and endTime HH:MM
            const [year, month, day] = appointment.date.split("-").map(Number);
            const [hour, minute] = appointment.endTime.split(":").map(Number);
            const slotEndTime = new Date(year, month - 1, day, hour, minute);
            if (now > slotEndTime) {
                isUsable = false;
            }
        }
        if (isUsable) {
            const { waitlistService } = await import("../waitlist/waitlist.service");
            try {
                await waitlistService.findCandidatesAndOfferSlot(tenantId, appointment);
            }
            catch (err) {
                console.error("Waitlist slot filling failed:", err);
            }
        }
    }
    // When an appointment is completed, search ONLY for the Recovery opportunity
    // explicitly linked via recoveryAppointmentId to this specific completed appointment.
    if (status === "completed") {
        const { Recovery } = await import("../recovery/recovery.model");
        const bookedOpp = await Recovery.findOne({
            tenantId,
            recoveryAppointmentId: appointment._id,
            status: "booked",
        });
        if (bookedOpp) {
            await recovery_service_1.recoveryService.markVisited(bookedOpp._id.toString(), bookedOpp.bookedValue || 0, tenantId);
        }
    }
}
//# sourceMappingURL=appointment.service.js.map