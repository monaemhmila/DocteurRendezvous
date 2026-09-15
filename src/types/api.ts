/**
 * Shared API TypeScript interfaces for Phase 4 frontend integration.
 *
 * Each interface is derived field-by-field from the corresponding
 * Mongoose schema in the backend. No fields are invented.
 *
 * When populated refs are returned by the API (e.g. patientId as an
 * object instead of a string ID), optional union types are used.
 */

// ---------------------------------------------------------------------------
// IPatient
// Source: backend/src/modules/patients/patient.model.ts
// ---------------------------------------------------------------------------
export interface IPatientMetrics {
  totalVisits: number;
  noShowCount: number;
  lastVisit?: string; // ISO date string when serialised
  revenue: number;
}

export interface IPatient {
  _id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  language?: string;
  /** "active" | "inactive" | "lead" | "at_risk" */
  status: "active" | "inactive" | "lead" | "at_risk";
  tags: string[];
  dateOfBirth?: string; // ISO date string when serialised
  gender?: string;
  notes?: string;
  nextAppointmentAt?: string; // ISO datetime string when serialised
  metrics: IPatientMetrics;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// IAppointment
// Source: backend/src/modules/appointments/appointment.model.ts
// ---------------------------------------------------------------------------
export interface IAppointment {
  _id: string;
  tenantId: string;
  /** May be populated as IPatient object or remain as string ID */
  patientId: string | IPatient;
  /** The dentist/doctor identifier for this tenant */
  doctorId: string;
  /** ISO Date YYYY-MM-DD */
  date: string;
  /** HH:MM */
  startTime: string;
  /** HH:MM */
  endTime: string;
  durationMin: number;
  treatment: string;
  notes?: string;
  cancellationReason?: string;
  source?: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// IRecovery
// Source: backend/src/modules/recovery/recovery.model.ts
// ---------------------------------------------------------------------------
export type RecoveryType =
  | "inactive_patient"
  | "interrupted_treatment"
  | "pending_quote"
  | "no_show"
  | "cancellation"
  | "overdue_checkup"
  | "follow_up_required";

export type RecoveryStatus =
  | "identified"
  | "queued"
  | "contacted"
  | "responded"
  | "booked"
  | "visited"
  | "no_response"
  | "dismissed";

export interface IRecovery {
  _id: string;
  tenantId: string;
  /** May be populated as IPatient object or remain as string ID */
  patientId: string | IPatient;
  /** Legacy field — alias for sourceAppointmentId */
  appointmentId?: string | IAppointment;
  sourceAppointmentId?: string | IAppointment;
  recoveryAppointmentId?: string | IAppointment;
  type: RecoveryType;
  status: RecoveryStatus;
  priority: "high" | "medium" | "low";
  reason?: string;
  detectedAt: string;
  lastContactedAt?: string;
  nextActionAt?: string;
  estimatedValue: number;
  bookedValue: number;
  recoveredValue: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// IWaitlistEntry
// Source: backend/src/modules/waitlist/waitlist.model.ts
// (declared before IFollowUpTask/IFollowUpAttempt since they reference it)
// ---------------------------------------------------------------------------
export type WaitlistEntryStatus = "active" | "fulfilled" | "cancelled" | "expired";

export interface IWaitlistEntry {
  _id: string;
  tenantId: string;
  /** May be populated as IPatient object or remain as string ID */
  patientId: string | IPatient;
  treatment: string;
  priority: "high" | "medium" | "low";
  preferredDays: string[];
  preferredTimeRanges: string[];
  status: WaitlistEntryStatus;
  notes?: string;
  fulfilledByAppointmentId?: string | IAppointment;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// IFollowUpTask
// Source: backend/src/modules/followups/followup.model.ts
// ---------------------------------------------------------------------------
export type FollowUpTaskType =
  | "no_show_followup"
  | "cancellation_followup"
  | "inactive_reengagement"
  | "checkup_reminder"
  | "slot_fill_offer";

export type FollowUpTaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "expired";

export interface IFollowUpTask {
  _id: string;
  tenantId: string;
  /** May be populated as IPatient object or remain as string ID */
  patientId: string | IPatient;
  /** XOR with waitlistEntryId — exactly one must be present */
  recoveryId?: string | IRecovery;
  /** XOR with recoveryId — exactly one must be present */
  waitlistEntryId?: string | IWaitlistEntry;
  sourceAppointmentId?: string | IAppointment;
  type: FollowUpTaskType;
  status: FollowUpTaskStatus;
  priority: "high" | "medium" | "low";
  scheduledFor: string;
  completedAt?: string;
  attemptCount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// IFollowUpAttempt
// Source: backend/src/modules/followups/followup.model.ts
// ---------------------------------------------------------------------------
export type FollowUpAttemptOutcome =
  | "no_answer"
  | "left_voicemail"
  | "spoken_agreed"
  | "spoken_declined"
  | "invalid_number";

export type FollowUpAttemptChannel =
  | "phone"
  | "whatsapp"
  | "sms"
  | "email"
  | "in_person";

export interface IFollowUpAttempt {
  _id: string;
  tenantId: string;
  /** XOR with waitlistEntryId — exactly one must be present */
  recoveryId?: string | IRecovery;
  /** XOR with recoveryId — exactly one must be present */
  waitlistEntryId?: string | IWaitlistEntry;
  taskId?: string | IFollowUpTask;
  attemptNumber: number;
  channel: FollowUpAttemptChannel;
  outcome: FollowUpAttemptOutcome;
  notes?: string;
  performedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface IAnalyticsOverview {
  recoveryRate: number;
  noShowRecoveryRate: number;
  cancellationRecoveryRate: number;
  waitlistConversionRate: number;
  recoveredRevenue: number;
  estimatedValuePending: number;
}
