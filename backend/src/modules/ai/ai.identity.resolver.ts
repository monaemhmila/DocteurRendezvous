import mongoose from "mongoose";
import { Patient } from "../patients/patient.model";
import { isPlaceholderPatient } from "./ai.utils";

/**
 * Phase 6.17.1 — Resolve the target patient for a booking.
 *
 * Priority:
 *  1. If targetInfo is absent → use the conversation patient as-is.
 *  2. If targetInfo names the SAME person as the conversation patient → use as-is.
 *  3. Otherwise: search the tenant DB for firstName+lastName (case-insensitive).
 *     - Found  → reuse existing record (NEVER create a duplicate)
 *     - Not found → create a new lead patient
 *
 * CRITICAL: the conversation patient is NEVER modified.
 *
 * @param tenantId         Tenant scope — never crossed
 * @param conversationPatient  The patient already linked to the conversation (may be placeholder)
 * @param targetInfo       Name provided for the booking target (may be null)
 * @returns { targetPatientId: string, targetFirstName: string, targetLanguage: string }
 */
export async function resolveTargetPatient(
  tenantId: string,
  conversationPatient: any,
  targetInfo: { firstName: string; lastName: string } | null,
  contactWaId?: string
): Promise<{ targetPatientId: string; targetFirstName: string; targetLanguage: string }> {
  if (targetInfo) {
    // ANTI-HALLUCINATION GUARD: Names cannot contain digits, and must be reasonable in length.
    if (/\d/.test(targetInfo.firstName) || /\d/.test(targetInfo.lastName)) {
      throw new Error("Le format du nom est invalide (contient des chiffres). Veuillez demander le vrai nom du patient.");
    }
    if (targetInfo.firstName.length < 2 || targetInfo.lastName.length < 2) {
      throw new Error("Le format du nom est invalide (trop court). Veuillez demander le vrai prénom et nom.");
    }
  }

  // No explicit target → booking is for the conversation patient
  if (!targetInfo || (!targetInfo.firstName && !targetInfo.lastName)) {
    return {
      targetPatientId: conversationPatient._id.toString(),
      targetFirstName: conversationPatient.firstName || "",
      targetLanguage: conversationPatient.language || "fr",
    };
  }

  // Same name as conversation patient (case-insensitive) → use existing record
  const sameName =
    targetInfo.firstName.toLowerCase() === (conversationPatient.firstName || "").toLowerCase() &&
    targetInfo.lastName.toLowerCase() === (conversationPatient.lastName || "").toLowerCase();

  if (sameName && !isPlaceholderPatient(conversationPatient)) {
    return {
      targetPatientId: conversationPatient._id.toString(),
      targetFirstName: conversationPatient.firstName,
      targetLanguage: conversationPatient.language || "fr",
    };
  }

  // Search tenant-scoped by exact name (case-insensitive)
  const existing = await Patient.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    firstName: { $regex: new RegExp(`^${targetInfo.firstName}$`, "i") },
    lastName: { $regex: new RegExp(`^${targetInfo.lastName}$`, "i") },
  })
    .select("_id firstName lastName language status")
    .lean();

  if (existing) {
    console.log(`[AI Conversation] resolveTargetPatient: found existing patient ${existing._id} (${(existing as any).firstName} ${(existing as any).lastName})`);
    // If they were a lead, upgrade to active now that their identity is confirmed
    if ((existing as any).status === "lead") {
      await Patient.findByIdAndUpdate(existing._id, { $set: { status: "active" } });
      console.log(`[AI Conversation] resolveTargetPatient: upgraded patient ${existing._id} from lead to active`);
    }
    return {
      targetPatientId: (existing as any)._id.toString(),
      targetFirstName: (existing as any).firstName,
      targetLanguage: (existing as any).language || "arabizi",
    };
  }

  // Not found → create a new active patient (tenant-scoped)
  // Identity is confirmed (name was provided by caller), so status = active from the start.
  // Use the caller's WhatsApp number so the family member is reachable via the same channel.
  // Fall back to a unique placeholder only if contactWaId is unavailable.
  const phone = contactWaId || `wa-family-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const created = await Patient.create({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    firstName: targetInfo.firstName,
    lastName: targetInfo.lastName,
    language: "arabizi",
    status: "active",   // confirmed identity — never lead
    phone,
  });
  console.log(`[AI Conversation] resolveTargetPatient: created new active patient ${created._id} (${targetInfo.firstName} ${targetInfo.lastName}) phone=${phone}`);
  return {
    targetPatientId: created._id.toString(),
    targetFirstName: targetInfo.firstName,
    targetLanguage: "arabizi",
  };
}
