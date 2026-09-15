import mongoose from "mongoose";
import { WaitlistEntry } from "./waitlist.model";
import { Appointment } from "../appointments/appointment.model";
import { FollowUpTask } from "../followups/followup.model";

export const waitlistService = {
  async createEntry(data: any, tenantId: string) {
    const entry = new WaitlistEntry({ ...data, tenantId });
    await entry.save();
    return entry;
  },

  async listEntries(tenantId: string) {
    return WaitlistEntry.find({ tenantId, status: "active" }).sort({ priority: -1, createdAt: 1 });
  },

  async cancelEntry(entryId: string, tenantId: string) {
    const entry = await WaitlistEntry.findOneAndUpdate(
      { _id: entryId, tenantId },
      { status: "cancelled" },
      { returnDocument: 'after' }
    );
    if (!entry) throw new Error("WaitlistEntry not found or does not belong to tenant");
    
    // Cancel any pending slot offers for this entry
    await FollowUpTask.updateMany(
      { waitlistEntryId: entry._id, tenantId, status: { $in: ["pending", "in_progress"] } },
      { status: "cancelled", notes: "Waitlist entry cancelled" }
    );

    return entry;
  },

  async findCandidatesAndOfferSlot(tenantId: string, sourceAppointment: any) {
    // Look for active waitlist candidates
    // Check if an offer already exists for this slot
    const existingOffer = await FollowUpTask.findOne({
      tenantId,
      sourceAppointmentId: sourceAppointment._id,
      status: { $in: ["pending", "in_progress"] }
    });

    if (existingOffer) return null; // Offer already in progress

    // Find all waitlist candidates who already received an offer for this exact slot
    const previousOffers = await FollowUpTask.find({
      tenantId,
      sourceAppointmentId: sourceAppointment._id
    }).select("waitlistEntryId");
    
    const excludedEntryIds = previousOffers
      .map(o => o.waitlistEntryId)
      .filter(id => id != null);

    // Find candidates, excluding those who already received an offer
    const candidates = await WaitlistEntry.find({
      tenantId,
      status: "active",
      ...(excludedEntryIds.length > 0 ? { _id: { $nin: excludedEntryIds } } : {})
    });
    
    console.log("CANDIDATES FOUND:", candidates.map(c => ({ treatment: c.treatment, _id: c._id })));

    if (candidates.length === 0) return null;

    // Filter by preferences
    // Append T12:00:00Z to avoid timezone shifts changing the weekday
    const slotDate = new Date(sourceAppointment.date + "T12:00:00Z");
    const dayName = slotDate.toLocaleDateString("en-US", { weekday: 'long', timeZone: 'UTC' }); // e.g., "Friday"
    
    // We could parse startTime to morning/afternoon but for simplicity we keep all open if preferredTimeRanges is empty
    let eligible = candidates.filter(c => {
      // If preferredDays is set, it must include dayName
      if (c.preferredDays && c.preferredDays.length > 0) {
        if (!c.preferredDays.includes(dayName)) return false;
      }
      return true;
    });

    console.log("ELIGIBLE CANDIDATES:", eligible.map(c => ({ treatment: c.treatment, _id: c._id })));
    if (eligible.length === 0) return null;

    // Sort by priority and wait time
    const priorityWeights: any = { high: 50, medium: 25, low: 0 };
    
    eligible.sort((a, b) => {
      let scoreA = 100 + (priorityWeights[a.priority] || 0);
      let scoreB = 100 + (priorityWeights[b.priority] || 0);

      // +1 point per day waiting
      const daysWaitingA = Math.floor((Date.now() - a.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const daysWaitingB = Math.floor((Date.now() - b.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      scoreA += daysWaitingA;
      scoreB += daysWaitingB;

      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Descending
      }
      
      // Tie-breaker: oldest createdAt
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const topCandidate = eligible[0];

    // Create the FollowUpTask offer
    try {
      const task = await FollowUpTask.create({
        tenantId,
        patientId: topCandidate.patientId,
        waitlistEntryId: topCandidate._id,
        sourceAppointmentId: sourceAppointment._id,
        type: "slot_fill_offer",
        priority: topCandidate.priority,
        scheduledFor: new Date()
      });
      return task;
    } catch (err: any) {
      if (err.code === 11000) {
        console.error("E11000 Duplicate Key Error:", err.message);
        // Concurrency catch: another offer was just created
        return null;
      }
      throw err;
    }
  },

  async fulfillWaitlistEntry(waitlistEntryId: string, tenantId: string, doctorId: string, date: string, startTime: string, endTime: string, taskId: string) {
    const entry = await WaitlistEntry.findOne({ _id: waitlistEntryId, tenantId, status: "active" });
    if (!entry) throw new Error("WaitlistEntry not found or not active");

    const task = await FollowUpTask.findOne({ _id: taskId, tenantId, waitlistEntryId: entry._id, status: { $in: ["pending", "in_progress"] } });
    if (!task) throw new Error("Active FollowUpTask for this WaitlistEntry not found");

    // Try to book the appointment
    try {
      const appointment = new Appointment({
        tenantId,
        patientId: entry.patientId,
        doctorId,
        date,
        startTime,
        endTime,
        treatment: entry.treatment,
        status: "scheduled"
      });
      await appointment.save();

      // Successfully booked!
      entry.status = "fulfilled";
      entry.fulfilledByAppointmentId = appointment._id as mongoose.Types.ObjectId;
      await entry.save();

      task.status = "completed";
      task.completedAt = new Date();
      await task.save();

      return appointment;
    } catch (err: any) {
      if (err.code === 11000) {
        // Someone else booked this exact slot!
        throw new Error("409 Conflict: Slot is already booked.");
      }
      throw err;
    }
  }
};
