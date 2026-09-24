import mongoose from "mongoose";
import { Appointment, IAppointment, computeOccupiedSlots } from "./appointment.model";
import { availabilityService } from "./availability.service";
import { recoveryService } from "../recovery/recovery.service";
import { followupService } from "../followups/followup.service";
import { waitlistService } from "../waitlist/waitlist.service";
import { Recovery } from "../recovery/recovery.model";
import { Patient } from "../patients/patient.model";
import { User } from "../users/user.model";
import { Tenant } from "../tenants/tenant.model";
import { Conversation, Message } from "../communications/communication.model";
import { MetaWhatsAppProvider } from "../communications/providers/messaging.provider";
import { nowInTimezone, toIsoDate, DEFAULT_TIMEZONE } from "../ai/temporal.utils";

function assertAppointmentTransition(currentStatus: string, nextStatus: string): void {
  if (currentStatus === nextStatus) return;

  const transitions: Record<string, string[]> = {
    scheduled: ["confirmed", "cancelled", "no_show"],
    confirmed: ["completed", "cancelled", "no_show"],
    completed: [],
    cancelled: [],
    no_show: [],
  };

  const allowed = transitions[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new Error("INVALID_APPOINTMENT_TRANSITION");
  }
}

let reminderWorkerTimer: NodeJS.Timeout | null = null;
let isReminderRunning = false;

export const reminderService = {
  /**
   * Process automated 24h reminders (Rappel J-1) for appointments scheduled for tomorrow.
   */
  processUpcomingReminders: async (): Promise<{ sentCount: number }> => {
    if (isReminderRunning) return { sentCount: 0 };
    isReminderRunning = true;

    let sentCount = 0;
    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowIso = tomorrow.toISOString().slice(0, 10);

      // Find all appointments scheduled for tomorrow without a reminder
      const pendingAppointments = await Appointment.find({
        date: tomorrowIso,
        status: { $in: ["scheduled", "confirmed"] },
        reminderSentAt: { $exists: false },
      }).lean();

      const messagingProvider = new MetaWhatsAppProvider();

      for (const appt of pendingAppointments) {
        try {
          const tenant = await Tenant.findById(appt.tenantId).lean();
          if (!tenant) continue;

          // Check if reminders capability is active for this tenant
          if (tenant.settings?.aiConfig?.capabilities?.reminders === false) continue;

          const patient = await Patient.findOne({
            _id: appt.patientId,
            tenantId: appt.tenantId,
          }).lean();

          if (!patient?.phone) continue;

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

          let conv = await Conversation.findOne({
            tenantId: appt.tenantId,
            contactWaId: cleanPhone,
          });

          if (!conv) {
            conv = await Conversation.create({
              tenantId: appt.tenantId,
              patientId: patient._id,
              contactWaId: cleanPhone,
              channel: "whatsapp",
              status: "active",
              lastMessageAt: new Date(),
            });
          }

          const sendResult = await messagingProvider.sendMessage(
            {
              to: cleanPhone,
              type: "text",
              content: reminderText,
            },
            tenant as any
          );

          await Message.create({
            tenantId: appt.tenantId,
            conversationId: conv._id,
            patientId: patient._id,
            direction: "outbound",
            status: "sent",
            content: reminderText,
            providerMessageId: sendResult.providerMessageId || `reminder_${appt._id}_${Date.now()}`,
          });

          await Appointment.findByIdAndUpdate(appt._id, {
            $set: { reminderSentAt: new Date() },
          });

          sentCount++;
          console.log(`[Reminder Service] 24h Reminder sent to ${cleanPhone} for appointment on ${appt.date} at ${appt.startTime}`);
        } catch (err: any) {
          console.error(`[Reminder Service] Error sending reminder for appointment ${appt._id}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error("[Reminder Service] Error in processUpcomingReminders:", err.message);
    } finally {
      isReminderRunning = false;
    }

    return { sentCount };
  },

  /**
   * Start background reminder interval (runs every 30 minutes).
   */
  startBackgroundWorker: (intervalMs = 30 * 60 * 1000): void => {
    if (reminderWorkerTimer) return;
    console.log("⏰ [Reminder Service] Automated 24h appointment reminder worker started (30m interval)");

    setTimeout(() => {
      reminderService.processUpcomingReminders().catch((err) => console.error("[Reminder Service] Initial run error:", err.message));
    }, 15_000);

    reminderWorkerTimer = setInterval(() => {
      reminderService.processUpcomingReminders().catch((err) => console.error("[Reminder Service] Scheduled run error:", err.message));
    }, intervalMs);
  }
};

export const appointmentService = {
  assertNoActiveUpcomingAppointment: async (tenantId: string, patientId: string, excludeAppointmentId?: string) => {
    const activeAppts = await Appointment.find({
      tenantId: new mongoose.Types.ObjectId(tenantId) as any,
      patientId: new mongoose.Types.ObjectId(patientId) as any,
      status: { $in: ["scheduled", "confirmed", "pending", "pending_confirmation"] }
    } as any).lean();

    const now = new Date();
    const tnFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
    const parts = tnFormatter.formatToParts(now);
    const tnDate = `${parts.find(p => p.type === "year")?.value}-${parts.find(p => p.type === "month")?.value}-${parts.find(p => p.type === "day")?.value}`;
    const tnTime = `${parts.find(p => p.type === "hour")?.value}:${parts.find(p => p.type === "minute")?.value}`;

    for (const appt of activeAppts) {
      if (excludeAppointmentId && appt._id.toString() === excludeAppointmentId) continue;
      
      const apptDate = appt.date;
      const apptEndTime = appt.endTime;
      
      if (apptDate > tnDate || (apptDate === tnDate && apptEndTime > tnTime)) {
        throw new Error(`Active_Appointment_Exists:${apptDate}:${appt.startTime}`);
      }
    }
  },

  getAppointments: async (tenantId: string, patientId?: string) => {
    const query: any = { tenantId };
    if (patientId) query.patientId = patientId;
    return Appointment.find(query)
      .populate("patientId", "firstName lastName phone")
      .sort({ date: -1, startTime: -1 });
  },
  getAppointmentById: async (id: string, tenantId: string) => {
    return Appointment.findOne({ _id: id, tenantId }).populate("patientId", "firstName lastName phone");
  },
  createAppointment: async (data: Partial<IAppointment>, tenantId: string) => {
    if (!data.patientId) {
      throw new Error("Patient is required");
    }

    // P0 — Reject past appointments (backend enforcement, independent of AI)
    if (data.date && data.startTime) {
      const tenant = await Tenant.findById(tenantId).lean();
      const tenantTimezone = (tenant as any)?.timezone || DEFAULT_TIMEZONE;
      const tzNow = nowInTimezone(tenantTimezone);
      const todayIso = toIsoDate(tenantTimezone, tzNow.date);

      if (data.date < todayIso) {
        throw new Error("Past_Date_Error: Cannot create an appointment in the past.");
      }
      if (data.date === todayIso) {
        const [rh, rm] = data.startTime.split(":").map(Number);
        const requestedMins = rh * 60 + rm;
        const currentMins = tzNow.hours * 60 + tzNow.minutes;
        if (requestedMins <= currentMins) {
          throw new Error("Past_Date_Error: Cannot create an appointment at a time that has already passed today.");
        }
      }
    }

    // Cross-tenant reference protection: both patient and doctor must belong to
    // the authenticated tenant. The frontend never supplies tenantId.
    const patient = await Patient.findOne({ _id: data.patientId, tenantId }).select("_id").lean();
    if (!patient) {
      throw new Error("Patient not found or does not belong to authenticated tenant");
    }

    let doctorId = data.doctorId?.toString();
    if (!doctorId) {
      const owners = await User.find({ tenantId, role: "clinic_owner" }).select("_id").lean();
      if (owners.length === 1) {
        doctorId = owners[0]._id.toString();
      } else if (owners.length > 1) {
        throw new Error("Multiple clinic owners configured; cannot determine the treating doctor");
      } else {
        const dentists = await User.find({ tenantId, role: "dentist" }).select("_id").lean();
        if (dentists.length === 1) {
          doctorId = dentists[0]._id.toString();
        } else {
          throw new Error("No unique treating doctor configured");
        }
      }
    }

    const doctor = await User.findOne({
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
      appointmentData.occupiedSlots = computeOccupiedSlots(appointmentData.startTime, appointmentData.endTime);
    }

    // Check availability first to prevent double-booking
    if (appointmentData.date && appointmentData.startTime && appointmentData.endTime && appointmentData.doctorId) {
      const isAvailable = await availabilityService.checkAvailability({
        tenantId,
        doctorId: appointmentData.doctorId,
        date: appointmentData.date,
        startTime: appointmentData.startTime,
        endTime: appointmentData.endTime,
      });
      if (!isAvailable) {
        throw new Error("SLOT_UNAVAILABLE");
      }
    }

    // P0 — Patient Single Active Upcoming Appointment Rule
    await appointmentService.assertNoActiveUpcomingAppointment(tenantId, data.patientId.toString());

    const appointment = new Appointment({ ...appointmentData, tenantId });
    try {
      return await appointment.save();
    } catch (err: any) {
      // Catch MongoDB Duplicate Key Error (11000)
      if (err.code === 11000) {
        throw new Error("SLOT_UNAVAILABLE");
      }
      throw err;
    }
  },
  updateAppointment: async (id: string, data: Partial<IAppointment>, tenantId: string) => {
    const existing = await Appointment.findOne({ _id: id, tenantId });
    if (!existing) return null;

    const {
      tenantId: _ignoredTenantId,
      createdAt: _ignoredCreatedAt,
      updatedAt: _ignoredUpdatedAt,
      status: _ignoredStatus,
      ...safeData
    } = data as any;

    const nextDate = safeData.date ?? existing.date;
    const nextStartTime = safeData.startTime ?? existing.startTime;

    // P0 — Reject past appointments on reschedule (backend enforcement)
    if (safeData.date || safeData.startTime) {
      const tenant = await Tenant.findById(tenantId).lean();
      const tenantTimezone = (tenant as any)?.timezone || DEFAULT_TIMEZONE;
      const tzNow = nowInTimezone(tenantTimezone);
      const todayIso = toIsoDate(tenantTimezone, tzNow.date);

      if (nextDate < todayIso) {
        throw new Error("Past_Date_Error: Cannot reschedule an appointment to a date in the past.");
      }
      if (nextDate === todayIso) {
        const [rh, rm] = nextStartTime.split(":").map(Number);
        const requestedMins = rh * 60 + rm;
        const currentMins = tzNow.hours * 60 + tzNow.minutes;
        if (requestedMins <= currentMins) {
          throw new Error("Past_Date_Error: Cannot reschedule to a time that has already passed today.");
        }
      }
    }
    const nextEndTime = safeData.endTime ?? existing.endTime;
    const nextDoctorId = safeData.doctorId ?? existing.doctorId;

    if (safeData.patientId) {
      const patient = await Patient.findOne({ _id: safeData.patientId, tenantId }).select("_id").lean();
      if (!patient) throw new Error("Patient not found or does not belong to authenticated tenant");
    }

    if (safeData.doctorId) {
      const doctor = await User.findOne({
        _id: safeData.doctorId,
        tenantId,
        role: { $in: ["clinic_owner", "dentist"] },
      }).select("_id").lean();
      if (!doctor) throw new Error("Doctor not found or does not belong to authenticated tenant");
    }

    if (
      nextDate !== existing.date ||
      nextStartTime !== existing.startTime ||
      nextEndTime !== existing.endTime ||
      String(nextDoctorId) !== String(existing.doctorId)
    ) {
      const isAvailable = await availabilityService.checkAvailability({
        tenantId,
        doctorId: String(nextDoctorId),
        date: String(nextDate),
        startTime: String(nextStartTime),
        endTime: String(nextEndTime),
      });

      if (!isAvailable) {
        throw new Error("SLOT_UNAVAILABLE");
      }

      safeData.occupiedSlots = computeOccupiedSlots(String(nextStartTime), String(nextEndTime));
    }

    // P0 — Patient Single Active Upcoming Appointment Rule (Reschedule mode)
    if (safeData.patientId || safeData.date || safeData.startTime || safeData.endTime) {
      const patientId = safeData.patientId ? String(safeData.patientId) : String(existing.patientId);
      await appointmentService.assertNoActiveUpcomingAppointment(tenantId, patientId, id);
    }

    try {
      return await Appointment.findOneAndUpdate(
        { _id: id, tenantId },
        { $set: safeData },
        { returnDocument: 'after', runValidators: true }
      );
    } catch (err: any) {
      if (err.code === 11000) {
        throw new Error("SLOT_UNAVAILABLE");
      }
      throw err;
    }
  },
  deleteAppointment: async (id: string, tenantId: string) => {
    return Appointment.findOneAndDelete({ _id: id, tenantId });
  },
  updateStatus: async (id: string, nextStatus: string, tenantId: string) => {
    const existing = await Appointment.findOne({ _id: id, tenantId });
    if (!existing) throw new Error("Appointment not found");

    const currentStatus = existing.status;
    assertAppointmentTransition(currentStatus, nextStatus);

    if (currentStatus === nextStatus) return existing;

    const updated = await Appointment.findOneAndUpdate(
      { _id: id, tenantId, status: currentStatus },
      { $set: { status: nextStatus } },
      { returnDocument: 'after' }
    );
    
    if (updated) {
      await handleStatusChange(updated, tenantId);
    }
    
    return updated || existing;
  }
};

/**
 * Handle recovery opportunity creation when appointment status changes.
 * no_show -> create no_show recovery opportunity
 * cancelled -> create cancellation recovery opportunity
 * completed -> mark any related booked recovery opportunity as visited
 */
async function handleStatusChange(appointment: any, tenantId: string) {
  const status = appointment.status;
  
  if (status === "no_show") {
    // 1. Increment patient metrics noShowCount
    if (appointment.patientId) {
      await Patient.findOneAndUpdate(
        { _id: appointment.patientId, tenantId },
        { $inc: { "metrics.noShowCount": 1 } }
      );
    }

    // 2. Create recovery opportunity
    const recovery = await recoveryService.createOpportunity({
      patientId: appointment.patientId,
      sourceAppointmentId: appointment._id,
      appointmentId: appointment._id,
      type: "no_show",
      priority: "high",
      reason: `Rendez-vous manqué : ${appointment.treatment || "—"} le ${appointment.date}`,
      estimatedValue: 0,
    }, tenantId);

    if (recovery) {
      const task = await followupService.createTask({
        patientId: appointment.patientId,
        recoveryId: recovery._id as any,
        type: "no_show_followup",
        priority: "high",
        status: "pending",
      }, tenantId);

      // 3. Automated WhatsApp outreach dispatch
      try {
        const tenant = await Tenant.findById(tenantId).lean();
        const patient = await Patient.findOne({ _id: appointment.patientId, tenantId }).lean();

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
          if (tenant) {
            try {
              const messagingProvider = new MetaWhatsAppProvider();
              await messagingProvider.sendMessage({
                to: cleanPhone,
                type: "text",
                content: messageText,
              }, tenant as any);
            } catch (sendErr) {
              console.warn("Meta WhatsApp API call skipped/failed:", (sendErr as any)?.message);
            }
          }

          // Save conversation & message
          let conv = await Conversation.findOne({
            tenantId,
            contactWaId: cleanPhone,
          });

          if (!conv) {
            conv = new Conversation({
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

          const msg = new Message({
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

          await recoveryService.markContacted(recovery._id.toString(), tenantId);
        }
      } catch (err) {
        console.error("Automated No-Show WhatsApp dispatch failed:", err);
      }
    }
  }
  
  if (status === "cancelled") {
    const recovery = await recoveryService.createOpportunity({
      patientId: appointment.patientId,
      sourceAppointmentId: appointment._id,
      appointmentId: appointment._id,
      type: "cancellation",
      priority: "medium",
      reason: `Rendez-vous annulé : ${appointment.treatment || "—"} le ${appointment.date}`,
      estimatedValue: 0,
    }, tenantId);

    if (recovery) {
      await followupService.createTask({
        patientId: appointment.patientId,
        recoveryId: recovery._id as any,
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
      try {
        await waitlistService.findCandidatesAndOfferSlot(tenantId, appointment);
      } catch (err) {
        console.error("Waitlist slot filling failed:", err);
      }
    }
  }

  
  // When an appointment is completed, search ONLY for the Recovery opportunity
  // explicitly linked via recoveryAppointmentId to this specific completed appointment.
  if (status === "completed") {
    const bookedOpp = await Recovery.findOne({
      tenantId,
      recoveryAppointmentId: appointment._id,
      status: "booked",
    });
    
    if (bookedOpp) {
      await recoveryService.markVisited(
        bookedOpp._id.toString(),
        bookedOpp.bookedValue || 0,
        tenantId
      );
    }
  }
}
