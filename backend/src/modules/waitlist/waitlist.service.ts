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

    // Check which candidates already have a pending offer to distribute slots fairly
    const activeOffers = await FollowUpTask.find({
      tenantId,
      type: "slot_fill_offer",
      status: { $in: ["pending", "in_progress"] }
    }).select("waitlistEntryId");
    
    const activeEntryIds = new Set(
      activeOffers.map(o => o.waitlistEntryId?.toString()).filter(Boolean)
    );

    // Sort by priority, diversity (candidates without active offers first), and wait time
    const priorityWeights: any = { high: 50, medium: 25, low: 0 };
    
    eligible.sort((a, b) => {
      // 1. Fair distribution: Candidates who don't already have an offer in progress come first
      const hasOfferA = activeEntryIds.has(a._id.toString()) ? 1 : 0;
      const hasOfferB = activeEntryIds.has(b._id.toString()) ? 1 : 0;
      if (hasOfferA !== hasOfferB) {
        return hasOfferA - hasOfferB;
      }

      // 2. Score by priority and wait time
      let scoreA = 100 + (priorityWeights[a.priority] || 0);
      let scoreB = 100 + (priorityWeights[b.priority] || 0);

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
    if (!topCandidate) return null;

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

  async fulfillWaitlistEntry({ waitlistEntryId, taskId, tenantId }: { waitlistEntryId: string, taskId: string, tenantId: string }) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // 1. WaitlistEntry existence and ownership
      const entry = await WaitlistEntry.findOne({ _id: waitlistEntryId, tenantId }).session(session);
      if (!entry) throw new Error("WAITLIST_NOT_FOUND");

      // Idempotency check
      if (entry.fulfilledByAppointmentId) {
        const existingAppt = await Appointment.findOne({ _id: entry.fulfilledByAppointmentId, tenantId }).session(session);
        await FollowUpTask.findOneAndUpdate(
          { _id: taskId, tenantId, status: { $in: ["pending", "in_progress"] } },
          { $set: { status: "completed", completedAt: new Date() } }
        ).session(session);
        await session.commitTransaction();
        session.endSession();
        return existingAppt;
      }

      if (entry.status !== "active") {
        throw new Error("WAITLIST_NOT_ACTIVE");
      }

      // 3. FollowUpTask validation
      const task = await FollowUpTask.findOne({ 
        _id: taskId, 
        tenantId, 
        waitlistEntryId: entry._id 
      }).session(session);
      
      if (!task) throw new Error("TASK_NOT_FOUND");
      if (!["pending", "in_progress"].includes(task.status)) throw new Error("TASK_NOT_ACTIONABLE");
      if (task.type !== "slot_fill_offer") throw new Error("TASK_INVALID_TYPE");
      if (!task.sourceAppointmentId) throw new Error("TASK_MISSING_SOURCE");

      // 5. Source appointment exists
      const sourceAppt = await Appointment.findOne({ _id: task.sourceAppointmentId, tenantId }).session(session);
      if (!sourceAppt) throw new Error("SOURCE_NOT_FOUND");

      // Write 1: Create Appointment
      const newAppointment = new Appointment({
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

      try {
        await newAppointment.save({ session });
      } catch (err: any) {
        if (err.code === 11000) {
          throw new Error("SLOT_UNAVAILABLE");
        }
        throw err;
      }

      // Write 2: Update WaitlistEntry
      entry.status = "fulfilled";
      entry.fulfilledByAppointmentId = newAppointment._id as mongoose.Types.ObjectId;
      await entry.save({ session });

      // Write 3: Update FollowUpTask
      task.status = "completed";
      task.completedAt = new Date();
      await task.save({ session });

      await session.commitTransaction();
      session.endSession();
      return newAppointment;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
};
