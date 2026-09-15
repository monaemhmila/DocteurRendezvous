import { Appointment, IAppointment } from "./appointment.model";
import { availabilityService } from "./availability.service";
import { recoveryService } from "../recovery/recovery.service";

export const appointmentService = {
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
    // Check availability first to prevent double-booking
    if (data.date && data.startTime && data.endTime && data.doctorId) {
      const isAvailable = await availabilityService.checkAvailability({
        tenantId,
        doctorId: data.doctorId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
      });
      if (!isAvailable) {
        throw new Error("Double_Booking_Error");
      }
    }
    const appointment = new Appointment({ ...data, tenantId });
    try {
      return await appointment.save();
    } catch (err: any) {
      // Catch MongoDB Duplicate Key Error (11000)
      if (err.code === 11000) {
        // Verify it's the unique slot index causing the collision
        // (tenantId_1_doctorId_1_date_1_startTime_1)
        const isSlotIndex = err.message.includes("tenantId_1_doctorId_1_date_1_startTime_1");
        if (isSlotIndex) {
          throw new Error("Double_Booking_Error");
        }
      }
      throw err;
    }
  },
  updateAppointment: async (id: string, data: Partial<IAppointment>, tenantId: string) => {
    const updated = await Appointment.findOneAndUpdate({ _id: id, tenantId }, { $set: data }, { new: true });
    
    // If the status was changed, trigger recovery hooks
    if (updated && data.status) {
      await handleStatusChange(updated, tenantId);
    }
    
    return updated;
  },
  deleteAppointment: async (id: string, tenantId: string) => {
    return Appointment.findOneAndDelete({ _id: id, tenantId });
  },
  updateStatus: async (id: string, status: string, tenantId: string) => {
    const updated = await Appointment.findOneAndUpdate({ _id: id, tenantId }, { $set: { status } }, { new: true });
    
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
async function handleStatusChange(appointment: any, tenantId: string) {
  const status = appointment.status;
  
  if (status === "no_show") {
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
      const { followupService } = await import("../followups/followup.service");
      await followupService.createTask({
        patientId: appointment.patientId,
        recoveryId: recovery._id as any,
        type: "no_show_followup",
        priority: "high",
        status: "pending",
      }, tenantId);
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
      const { followupService } = await import("../followups/followup.service");
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
      const { waitlistService } = await import("../waitlist/waitlist.service");
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
    const { Recovery } = await import("../recovery/recovery.model");
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
