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

/**
 * Enforces the appointment lifecycle state machine.
 *
 * Allowed transitions:
 *   scheduled  → confirmed | cancelled | no_show
 *   confirmed  → completed | cancelled | no_show
 *   completed  → (terminal — no transitions)
 *   cancelled  → (terminal — no transitions)
 *   no_show    → (terminal — no transitions)
 *
 * The transition scheduled → completed is intentionally FORBIDDEN.
 * A confirmation step is required before an appointment can be marked as done.
 */
function assertAppointmentTransition(currentStatus: string, nextStatus: string): void {
  if (currentStatus === nextStatus) return;

  const transitions: Record<string, string[]> = {
    scheduled: ["confirmed", "cancelled", "no_show"],
    confirmed: ["completed", "cancelled", "no_show"],
    completed: [],
    cancelled: [],
    no_show: [],
  };

  if (!(currentStatus in transitions)) {
    throw new Error(`INVALID_APPOINTMENT_TRANSITION: unknown status '${currentStatus}'`);
  }

  const allowed = transitions[currentStatus]!;
  if (!allowed.includes(nextStatus)) {
    throw new Error(
      `INVALID_APPOINTMENT_TRANSITION: '${currentStatus}' → '${nextStatus}' is not allowed. ` +
      `Allowed: [${allowed.join(", ") || "none (terminal state)"}]`
    );
  }
}

let reminderWorkerTimer: NodeJS.Timeout | null = null;
let isReminderRunning = false;
let isSameDayRunning = false;

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

      // Find all appointments scheduled for tomorrow without a reminder.
      // Sentinel strategy (P1-05): we atomically claim each appointment
      // by writing a preliminary reminderSentAt value BEFORE sending.
      // This prevents any concurrent instance from double-sending.
      // The sentinel is overwritten with the real timestamp on success,
      // or cleared on failure so the slot can be retried next cycle.
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

          // ── P1-05 atomic reservation ─────────────────────────────────────
          // Claim the slot BEFORE sending. If another worker already claimed
          // it (reminderSentAt now exists), this update returns null → skip.
          const SENTINEL = new Date(0); // epoch = "claimed but not yet sent"
          const claimed = await Appointment.findOneAndUpdate(
            { _id: appt._id, reminderSentAt: { $exists: false } },
            { $set: { reminderSentAt: SENTINEL } },
            { returnDocument: 'after' }
          );
          if (!claimed) {
            // Another instance already claimed this appointment.
            continue;
          }
          // ─────────────────────────────────────────────────────────────────

          const cleanPhone = patient.phone.replace(/[^0-9]/g, "");
          const patientName = patient.firstName && patient.firstName.toLowerCase() !== "patient"
            ? `${patient.firstName} ${patient.lastName || ""}`.trim()
            : "Cher patient";

          const clinicName = tenant.name || "notre cabinet dentaire";
          const treatment = appt.treatment || "Consultation dentaire";

          const isArabic = patient.language === "ar";
          const isFrench = patient.language === "fr";
          const mainPatient = await Patient.findOne({ tenantId: appt.tenantId, phone: patient.phone }).sort({ createdAt: 1 }).lean();
          const isMainPatient = mainPatient ? mainPatient._id.toString() === patient._id.toString() : true;
          const greetingName = mainPatient && mainPatient.firstName && mainPatient.firstName.toLowerCase() !== "patient"
            ? `${mainPatient.firstName} ${mainPatient.lastName || ""}`.trim()
            : patientName;

          const rdvFr = isMainPatient ? "votre rendez-vous" : `le rendez-vous de ${patientName}`;
          const rdvAr = isMainPatient ? "بموعدك" : `بموعد ${patientName}`;
          const rdvTn = isMainPatient ? "b rendez-vous mte3ek" : `b rendez-vous mte3 ${patientName}`;

          let reminderTextBody = "";
          let btnYes = "";
          let btnNo = "";

          if (isArabic) {
            reminderTextBody = `عسلامة ${greetingName} 👋\nنذكروك ${rdvAr} غدوة *${appt.date}* مع *${appt.startTime}* في ${clinicName} (${treatment}).\n\nهل تؤكد حضورك؟`;
            btnYes = "نعم، أؤكد";
            btnNo = "لا، إلغاء";
          } else if (isFrench) {
            reminderTextBody = `Bonjour ${greetingName} 👋\nNous vous rappelons ${rdvFr} de demain le *${appt.date}* à *${appt.startTime}* au ${clinicName} (${treatment}).\n\nPouvez-vous nous confirmer votre présence ?`;
            btnYes = "OUI, je confirme";
            btnNo = "NON, annuler";
          } else {
            // Default to Tunisian Arabizi - polite and professional
            reminderTextBody = `Aslema ${greetingName} 👋\nNhebou nfakrouk ${rdvTn} ghodwa *${appt.date}* m3a *${appt.startTime}* fi ${clinicName} (${treatment}).\n\nTnajjem t'akkedli 7dhourek aman ?`;
            btnYes = "OUI, je confirme"; // We keep French buttons for Arabizi as they are widely understood and standard
            btnNo = "NON, annuler";
          }

          const interactivePayload = {
            type: "button",
            body: { text: reminderTextBody },
            action: {
              buttons: [
                {
                  type: "reply",
                  reply: { id: "confirm_yes", title: btnYes }
                },
                {
                  type: "reply",
                  reply: { id: "confirm_no", title: btnNo }
                }
              ]
            }
          };

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
              type: "interactive",
              interactive: interactivePayload,
            },
            tenant as any
          );

          await Message.create({
            tenantId: appt.tenantId,
            conversationId: conv._id,
            patientId: patient._id,
            direction: "outbound",
            status: "sent",
            content: reminderTextBody,
            providerMessageId: sendResult.providerMessageId || `reminder_${appt._id}_${Date.now()}`,
            appointmentId: appt._id,
          });

          // ── P1-05: stamp real timestamp (replace sentinel) on success ──
          await Appointment.findByIdAndUpdate(appt._id, {
            $set: { reminderSentAt: new Date() },
          });

          sentCount++;
          console.log(`[Reminder Service] 24h Reminder sent to ${cleanPhone} for appointment on ${appt.date} at ${appt.startTime}`);
        } catch (err: any) {
          console.error(`[Reminder Service] Error sending reminder for appointment ${appt._id}:`, err.message);

          // CRITICAL FIX: If it fails (e.g. Meta 24h window closed, parameter value invalid),
          // clear the sentinel so the next cycle can retry, but also add a note.
          // After repeated failures the reminder worker will eventually skip the appointment
          // on the next calendar day when it no longer matches `date: tomorrowIso`.
          await Appointment.findByIdAndUpdate(appt._id, {
            $unset: { reminderSentAt: "" },
            $set: { notes: (appt.notes || "") + "\n[Reminder failed to send]" },
          });
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
   * J-0: Send a same-day morning reminder to patients whose appointment TODAY
   * is still in "scheduled" status (not yet confirmed) and haven't received
   * the day-of reminder yet. Runs around 8:00 AM local time.
   */
  processSameDayReminders: async (): Promise<{ sentCount: number }> => {
    if (isSameDayRunning) return { sentCount: 0 };
    isSameDayRunning = true;

    // Only run between 07:30 and 10:00 to avoid spamming at other times
    const nowHour = new Date().getHours();
    if (nowHour < 7 || nowHour >= 10) {
      isSameDayRunning = false;
      return { sentCount: 0 };
    }

    let sentCount = 0;
    try {
      const todayIso = new Date().toISOString().slice(0, 10);
      const messagingProvider = new MetaWhatsAppProvider();

      // Target only UNCONFIRMED (still "scheduled") appointments today
      const pendingAppointments = await Appointment.find({
        date: todayIso,
        status: "scheduled", // not confirmed
        dayOfReminderSentAt: { $exists: false },
      }).lean();

      for (const appt of pendingAppointments) {
        try {
          const tenant = await Tenant.findById(appt.tenantId).lean();
          if (!tenant) continue;
          if (tenant.settings?.aiConfig?.capabilities?.reminders === false) continue;

          const patient = await Patient.findOne({ _id: appt.patientId, tenantId: appt.tenantId }).lean();
          if (!patient?.phone) continue;

          // Atomic claim
          const SENTINEL = new Date(0);
          const claimed = await Appointment.findOneAndUpdate(
            { _id: appt._id, dayOfReminderSentAt: { $exists: false } },
            { $set: { dayOfReminderSentAt: SENTINEL } },
            { returnDocument: 'after' }
          );
          if (!claimed) continue;

          const cleanPhone = patient.phone.replace(/[^0-9]/g, "");
          const patientName = patient.firstName && patient.firstName.toLowerCase() !== "patient"
            ? `${patient.firstName} ${patient.lastName || ""}`.trim()
            : "Cher patient";
          const clinicName = tenant.name || "notre cabinet";
          const treatment = appt.treatment || "Consultation";

          const isArabic = patient.language === "ar";
          const isFrench = patient.language === "fr";

          let msgBody = "";
          if (isArabic) {
            msgBody = `صباح الخير ${patientName} 🌅\nتذكير: لديك موعد اليوم *${appt.date}* في تمام الساعة *${appt.startTime}* في ${clinicName} (${treatment}).\n\nهل تؤكد حضورك؟`;
          } else if (isFrench) {
            msgBody = `Bonjour ${patientName} 🌅\nRappel de dernière minute : vous avez un rendez-vous *aujourd'hui* à *${appt.startTime}* au ${clinicName} (${treatment}).\n\nMerci de confirmer votre présence.`;
          } else {
            msgBody = `Sba7 el khir ${patientName} 🌅\nRappel: 3andek rendez-vous lyoum *${appt.date}* m3a *${appt.startTime}* fi ${clinicName} (${treatment}).\n\nAkkedli enty jey(a)?`;
          }

          const interactivePayload = {
            type: "button",
            body: { text: msgBody },
            action: {
              buttons: [
                { type: "reply", reply: { id: "confirm_yes", title: isArabic ? "نعم، أؤكد" : "OUI, je confirme" } },
                { type: "reply", reply: { id: "confirm_no", title: isArabic ? "لا، إلغاء" : "NON, annuler" } },
              ]
            }
          };

          let conv = await Conversation.findOne({ tenantId: appt.tenantId, contactWaId: cleanPhone });
          if (!conv) {
            conv = await Conversation.create({
              tenantId: appt.tenantId, patientId: patient._id,
              contactWaId: cleanPhone, channel: "whatsapp",
              status: "active", lastMessageAt: new Date(),
            });
          }

          const sendResult = await messagingProvider.sendMessage(
            { to: cleanPhone, type: "interactive", interactive: interactivePayload },
            tenant as any
          );

          await Message.create({
            tenantId: appt.tenantId, conversationId: conv._id,
            patientId: patient._id, direction: "outbound", status: "sent",
            content: msgBody,
            providerMessageId: sendResult.providerMessageId || `dayof_${appt._id}_${Date.now()}`,
            appointmentId: appt._id,
          });

          await Appointment.findByIdAndUpdate(appt._id, { $set: { dayOfReminderSentAt: new Date() } });
          sentCount++;
          console.log(`[Reminder Service] J-0 reminder sent to ${cleanPhone} for appointment at ${appt.startTime}`);
        } catch (err: any) {
          console.error(`[Reminder Service] J-0 error for appt ${appt._id}:`, err.message);
          await Appointment.findByIdAndUpdate(appt._id, { $unset: { dayOfReminderSentAt: "" } });
        }
      }
    } catch (err: any) {
      console.error("[Reminder Service] J-0 global error:", err.message);
    } finally {
      isSameDayRunning = false;
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
      reminderService.processSameDayReminders().catch((err) => console.error("[Reminder Service] J-0 Initial run error:", err.message));
    }, 15_000);

    reminderWorkerTimer = setInterval(() => {
      reminderService.processUpcomingReminders().catch((err) => console.error("[Reminder Service] Scheduled run error:", err.message));
      reminderService.processSameDayReminders().catch((err) => console.error("[Reminder Service] J-0 Scheduled run error:", err.message));
    }, intervalMs);
  }
};

export async function validateBookableSlot(
  tenantId: string,
  date: string,
  startTime: string,
  endTime: string,
  doctorId: string,
  session?: any
): Promise<void> {
  const tenant = await Tenant.findById(tenantId).lean();
  const tenantTimezone = (tenant as any)?.timezone || DEFAULT_TIMEZONE;
  const tzNow = nowInTimezone(tenantTimezone);
  const todayIso = toIsoDate(tenantTimezone, tzNow.date);

  if (date < todayIso) {
    throw new Error("Past_Date_Error: Cannot create or reschedule an appointment to a date in the past.");
  }
  if (date === todayIso) {
    const [rh, rm] = startTime.split(":").map(Number);
    const requestedMins = rh * 60 + rm;
    const currentMins = tzNow.hours * 60 + tzNow.minutes;
    if (requestedMins <= currentMins) {
      throw new Error("Past_Date_Error: Cannot create or reschedule to a time that has already passed today.");
    }
  }

  const isAvailable = await availabilityService.checkAvailability({
    tenantId,
    doctorId,
    date,
    startTime,
    endTime,
    session,
  });

  if (!isAvailable) {
    throw new Error("SLOT_UNAVAILABLE");
  }
}

export const appointmentService = {
  assertNoActiveUpcomingAppointment: async (tenantId: string, patientId: string, excludeAppointmentId?: string, targetDate?: string) => {
    const query: any = {
      tenantId: new mongoose.Types.ObjectId(tenantId),
      patientId: new mongoose.Types.ObjectId(patientId),
      status: { $in: ["scheduled", "confirmed", "pending", "pending_confirmation"] }
    };

    if (targetDate) {
      query.date = targetDate;
    }

    const activeAppts = await Appointment.find(query).lean();

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

  getAppointments: async (
    tenantId: string,
    patientId?: string,
    status?: string,
    date?: string,
    dateFrom?: string,
    dateTo?: string,
    skip: number = 0,
    limit: number = 20
  ) => {
    const query: any = { tenantId };
    if (patientId) query.patientId = patientId;
    if (status) query.status = status;
    if (date) query.date = date;

    if (dateFrom || dateTo) {
      query.date = query.date || {};
      if (dateFrom) query.date.$gte = dateFrom;
      if (dateTo) query.date.$lte = dateTo;
    }

    const [data, total] = await Promise.all([
      Appointment.find(query)
        .populate("patientId", "firstName lastName phone")
        .sort({ date: -1, startTime: -1, _id: 1 })
        .skip(skip)
        .limit(limit),
      Appointment.countDocuments(query)
    ]);

    return { data, total };
  },
  getAppointmentById: async (id: string, tenantId: string) => {
    return Appointment.findOne({ _id: id, tenantId }).populate("patientId", "firstName lastName phone");
  },
  createAppointment: async (data: Partial<IAppointment>, tenantId: string) => {
    if (!data.patientId) {
      throw new Error("Patient is required");
    }

    // P0 — Reject past appointments (now handled by validateBookableSlot later after doctorId resolution)

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

    // Resolve price from tenant services if not explicitly provided
    if (appointmentData.price === undefined || appointmentData.price === null || isNaN(Number(appointmentData.price))) {
      const tenant = await Tenant.findById(tenantId).lean();
      const services = tenant?.settings?.services || [];
      const match = services.find((s: any) =>
        s.name?.toLowerCase().trim() === appointmentData.treatment?.toLowerCase().trim()
      );
      if (match?.price) {
        appointmentData.price = Number(match.price);
      }
    }

    // Compute occupied atomic slots
    if (appointmentData.startTime && appointmentData.endTime) {
      appointmentData.occupiedSlots = computeOccupiedSlots(appointmentData.startTime, appointmentData.endTime);
    }

    // Validate slot logic (past date + availability)
    if (appointmentData.date && appointmentData.startTime && appointmentData.endTime && appointmentData.doctorId) {
      await validateBookableSlot(
        tenantId,
        appointmentData.date,
        appointmentData.startTime,
        appointmentData.endTime,
        appointmentData.doctorId
      );
    }

    // P0 — Patient Single Active Upcoming Appointment Rule (Global)
    await appointmentService.assertNoActiveUpcomingAppointment(tenantId, data.patientId.toString(), undefined);

    const appointment = new Appointment({ ...appointmentData, tenantId });
    try {
      const savedAppt = await appointment.save();

      // Update patient lastVisit only for past or today's appointments (not future bookings)
      const todayStr = new Date().toISOString().slice(0, 10);
      if ((savedAppt.status === "confirmed" || savedAppt.status === "scheduled") && savedAppt.date <= todayStr) {
        await Patient.findOneAndUpdate(
          { _id: savedAppt.patientId, tenantId },
          { $set: { "metrics.lastVisit": new Date(savedAppt.date) } }
        );
      }

      return savedAppt;
    } catch (err: any) {
      // Catch MongoDB Duplicate Key Error (11000)
      if (err.code === 11000) {
        throw new Error("SLOT_UNAVAILABLE");
      }
      throw err;
    }
  },
  updateAppointment: async (id: string, data: Partial<IAppointment>, tenantId: string) => {
    let session: mongoose.ClientSession | undefined;

    try {
      session = await mongoose.startSession();
      session.startTransaction();
      // Dummy query to trigger the standalone error
      await Appointment.findOne({ _id: id }).select("_id").session(session);
    } catch (err: any) {
      if (err.message.includes("Transaction numbers are only allowed on a replica set member or mongos")) {
        console.warn("MongoDB Standalone detected. Bypassing transaction for updateAppointment.");
        if (session) {
          await session.endSession();
          session = undefined;
        }
      } else {
        if (session) await session.endSession();
        throw err;
      }
    }

    try {
      const existing = session
        ? await Appointment.findOne({ _id: id, tenantId }).session(session)
        : await Appointment.findOne({ _id: id, tenantId });

      if (!existing) {
        if (session) {
          await session.abortTransaction();
          session.endSession();
        }
        return null;
      }

      const {
        tenantId: _ignoredTenantId,
        createdAt: _ignoredCreatedAt,
        updatedAt: _ignoredUpdatedAt,
        status: _ignoredStatus,
        ...safeData
      } = data as any;

      const nextDate = safeData.date ?? existing.date;
      const nextStartTime = safeData.startTime ?? existing.startTime;

      // P0 — Reject past appointments on reschedule (now handled by validateBookableSlot)
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
        await validateBookableSlot(
          tenantId,
          String(nextDate),
          String(nextStartTime),
          String(nextEndTime),
          String(nextDoctorId),
          session
        );

        safeData.occupiedSlots = computeOccupiedSlots(String(nextStartTime), String(nextEndTime));
      }

      // P0 — Patient Single Active Upcoming Appointment Rule (Reschedule mode, 1 per day)
      if (safeData.patientId || safeData.date || safeData.startTime || safeData.endTime) {
        const patientId = safeData.patientId ? String(safeData.patientId) : String(existing.patientId);
        await appointmentService.assertNoActiveUpcomingAppointment(tenantId, patientId, id, String(nextDate));
      }

      let updated;
      if (session) {
        updated = await Appointment.findOneAndUpdate(
          { _id: id, tenantId },
          { $set: safeData },
          { returnDocument: 'after', runValidators: true, session }
        );
        await session.commitTransaction();
        session.endSession();
      } else {
        updated = await Appointment.findOneAndUpdate(
          { _id: id, tenantId },
          { $set: safeData },
          { returnDocument: 'after', runValidators: true }
        );
      }

      return updated;
    } catch (err: any) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
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

    // ── P1-04: Transactional status + OutboxEvent ──────────────────────────
    // On Replica Set / Atlas: both the status write and the OutboxEvent
    // insertion are covered by a single session transaction so they either
    // both commit or both roll back.
    //
    // On standalone MongoDB (MONGO_STANDALONE=true or startSession fails):
    // we fall back to the previous sequential writes and log a warning.
    // This degraded mode is acceptable for local development ONLY.
    // ──────────────────────────────────────────────────────────────────────
    let session: mongoose.ClientSession | null = null;
    const isStandalone = process.env.MONGO_STANDALONE === "true";

    if (!isStandalone) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
      } catch (err: any) {
        console.warn(
          "[updateStatus] Could not start MongoDB transaction (standalone mode?). " +
          "Falling back to non-transactional writes. DO NOT use this in production.\n" +
          err.message
        );
        session = null;
      }
    }

    try {
      // 1. Atomically update status (optimistic check on currentStatus)
      const updateOpts = session
        ? { returnDocument: 'after' as const, session }
        : { returnDocument: 'after' as const };

      const updated = await Appointment.findOneAndUpdate(
        { _id: id, tenantId, status: currentStatus },
        { $set: { status: nextStatus } },
        updateOpts
      );

      if (!updated) {
        const latest = await Appointment.findOne({ _id: id, tenantId });
        if (latest?.status === nextStatus) {
          if (session) { await session.abortTransaction(); session.endSession(); }
          return latest;
        }
        throw new Error("INVALID_APPOINTMENT_TRANSITION");
      }

      // 2. Create OutboxEvent for WhatsApp confirmation message (same transaction)
      if (nextStatus === "confirmed") {
        const tenant = await Tenant.findById(tenantId).lean();
        const patient = await Patient.findById(updated.patientId).lean();

        if (tenant && patient && patient.phone) {
          const cleanPhone = patient.phone.replace(/[^0-9]/g, "");
          const phoneNumberId = tenant.settings?.whatsappConfig?.phoneNumberId;

          if (phoneNumberId) {
            const patientName = patient.firstName && patient.firstName.toLowerCase() !== "patient"
              ? `${patient.firstName} ${patient.lastName || ""}`.trim()
              : "Cher patient";
            const clinicName = tenant.name || "notre cabinet dentaire";
            const treatment = updated.treatment || "Consultation dentaire";
            const isArabic = patient.language === "ar";
            const isFrench = patient.language === "fr";
            const isEnglish = patient.language === "en";

            let confirmationText = `Mrigel ${patientName}! 👋\nRendez-vous mte3ek m'akéd: nhar ${updated.date} men ${updated.startTime} l ${updated.endTime} fi ${clinicName}. Nestanew fik!`;
            if (isArabic) {
              confirmationText = `عسلامة ${patientName} 👋\nتم تأكيد موعدك بنجاح: ${updated.date} من ${updated.startTime} إلى ${updated.endTime} (${treatment}) في ${clinicName}. نراكم قريباً!`;
            } else if (isFrench) {
              confirmationText = `Parfait ${patientName} ! 👋\nVotre rendez-vous est confirmé pour le ${updated.date} de ${updated.startTime} à ${updated.endTime} (${treatment}) au ${clinicName}. À très bientôt !`;
            } else if (isEnglish) {
              confirmationText = `Hello ${patientName} 👋\nYour appointment is confirmed for ${updated.date} from ${updated.startTime} to ${updated.endTime} (${treatment}) at ${clinicName}. See you soon!`;
            }

            const { OutboxEvent } = await import("../jobs/outbox-event.model");
            const outboxDoc = [{
              eventType: "appointment.confirmed",
              aggregateType: "appointment",
              aggregateId: updated._id.toString(),
              tenantId: updated.tenantId,
              phoneNumberId,
              idempotencyKey: `appointment:${updated._id}:confirmed`,
              payload: { to: cleanPhone, type: "text", content: confirmationText },
            }];

            // insertMany with session (no-op if idempotencyKey already exists)
            try {
              await OutboxEvent.insertMany(outboxDoc, {
                ...(session ? { session } : {}),
                ordered: false,
              });
            } catch (insertErr: any) {
              // Duplicate key on idempotencyKey = already created, safe to ignore
              if (insertErr.code !== 11000 && !(insertErr.writeErrors?.every((e: any) => e.code === 11000))) {
                throw insertErr;
              }
            }
          }
        }
      }

      // 3. Commit
      if (session) {
        await session.commitTransaction();
        session.endSession();
        session = null;
      }

      // 4. Non-transactional side-effects (recovery, patient metrics) — after commit
      await handleStatusChange(updated, tenantId);

      return updated;
    } catch (err: any) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      throw err;
    }
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

  if (status === "confirmed" || status === "scheduled") {
    if (appointment.patientId) {
      // Update lastVisit only for past or today appointments
      const todayStr2 = new Date().toISOString().slice(0, 10);
      if (appointment.date <= todayStr2) {
        await Patient.findOneAndUpdate(
          { _id: appointment.patientId, tenantId },
          { $set: { "metrics.lastVisit": new Date(appointment.date) } }
        );
      }
    }
  }

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
            : `Lahi4na eli ma jit'ch l rendez-vous mte3ek fi ${clinicName}. Nchalah labes! T7eb t3awed te5ou rendez-vous e5er? Tnajem t9oulenna houni lwa9t li yse3dek.`;

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

    // ── Bot session reset (P2-bot) ────────────────────────────────────────────
    // The appointment is now honoré. When the patient contacts us next (hours
    // or days later), the bot must NOT continue the previous conversation thread.
    // We set sessionStartedAt = now and clear all pending booking / action state.
    // The AI will load only messages AFTER this timestamp → fresh greeting.
    // The full patient dossier (history, notes, family members) is still provided
    // via aiContext, so the bot knows who the patient is.
    if (appointment.patientId) {
      try {
        const patient = await Patient.findOne({ _id: appointment.patientId, tenantId }).lean();
        if (patient?.phone) {
          const cleanPhone = patient.phone.replace(/[^0-9]/g, "");
          const { Conversation } = await import("../communications/communication.model");
          await Conversation.findOneAndUpdate(
            { tenantId, contactWaId: cleanPhone },
            {
              $set: { sessionStartedAt: new Date() },
              $unset: {
                pendingBookingContext: "",
                pendingBookingIntent: "",
                pendingActionConfirmation: "",
                needsHuman: "",
              },
            }
          );
          console.log(`[handleStatusChange] Bot session reset for patient ${patient.firstName} (${cleanPhone}) after completed appointment.`);
        }
      } catch (sessionErr) {
        // Non-critical — log and continue. The session reset is best-effort.
        console.warn("[handleStatusChange] Could not reset bot session after completion:", (sessionErr as any)?.message);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────
  }
}

