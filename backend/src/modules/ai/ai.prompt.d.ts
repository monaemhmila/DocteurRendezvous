/**
 * AI Module — System Prompt
 *
 * Centralized system prompt for the dental clinic WhatsApp communication assistant.
 * This is the single source of truth for the AI's role, capabilities,
 * and strict restrictions.
 *
 * VERSION: 1.6.0
 *
 * Changes from v1.5.0:
 *  - Prompt fully restructured into explicit, separated sections:
 *      SYSTEM RULES / CONVERSATION HISTORY / PATIENT CONTEXT /
 *      BUSINESS CONTEXT / CURRENT INTENT / AVAILABLE ACTIONS
 *  - PATIENT CONTEXT and BUSINESS CONTEXT are now distinct (privacy: only
 *    identity/language vs. business entities).
 *  - BUSINESS CONTEXT explicitly includes real clinic business hours so the AI
 *    can answer "are you open tomorrow?" from REAL data — never inventing them.
 *  - Conversation history rules clarified for multi-turn conversations.
 *  - Explicit statement that the AI's own previous outbound messages are part
 *    of the history and must be respected.
 *
 * IMPORTANT: This prompt defines a communication assistant role ONLY.
 * The AI must NEVER act as a medical professional.
export interface IClinicService {
  id?: string;
  name: string;
  durationMin: number;
  price?: number;
  description?: string;
}

export interface IAIContext {
  clinicName?: string;
  clinicSpecialty?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  customInstructions?: string;
  tone?: "friendly" | "professional" | "empathic" | string;
  bookingMode?: "auto" | "approval" | string;
  services?: IClinicService[];
  capabilities?: {
    autoBooking?: boolean;
    urgencyHandling?: boolean;
    pricingQuotes?: boolean;
    reminders?: boolean;
    doctorEscalation?: boolean;
    multiLanguage?: boolean;
  };
  escalationRules?: {
    medicalQuestion?: boolean;
    frustratedPatient?: boolean;
    complexQuote?: boolean;
    lowConfidence?: boolean;
  };
  patientId?: string;
  firstName?: string;
  lastName?: string;
  language?: string;
  isNewPatient?: boolean;
  appointment?: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    treatment: string;
    status: string;
  };
  recovery?: {
    id: string;
    type: string;
    status: string;
  };
  followUp?: {
    type: string;
    status: string;
    scheduledFor?: Date;
  };
  pendingBookingContext?: {
    date: string;
    proposedSlots: Array<{ startTime: string; endTime: string }>;
  };
  businessHours?: string;
  patientNoShowCount?: number;
  noShowPolicy?: {
    enabled: boolean;
    maxAllowed: number;
    rejectionMessage?: string;
  };
}

/**
 * Build the system prompt, incorporating patient, doctor, and clinic context.
 * Context is strictly scoped to the current tenant.
 */
export declare function buildSystemPrompt(context?: IAIContext): string;
//# sourceMappingURL=ai.prompt.d.ts.map