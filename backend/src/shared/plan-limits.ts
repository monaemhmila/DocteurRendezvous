export type PlanTier = 'starter' | 'pro' | 'enterprise';

export interface PlanLimits {
  maxPatients: number;
  maxUsers: number;
  maxAppointmentsPerMonth: number;
  historyMonths: number;
  aiEnabled: boolean;
  aiAutoBooking: boolean;
  waitlistEnabled: boolean;
  recoveryEnabled: boolean;
  analyticsEnabled: boolean;
  multiDoctorEnabled: boolean;
  customBrandingEnabled: boolean;
  exportEnabled: boolean;
  noShowPolicyEnabled: boolean;
  whatsappEnabled: boolean;
  prioritySupport: boolean;
  aiMessagesPerDay: number;
  apiCallsPerHour: number;
  priceMonthly: number;
  priceAnnual: number;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  starter: {
    maxPatients: 150,
    maxUsers: 2,
    maxAppointmentsPerMonth: 200,
    historyMonths: 3,
    aiEnabled: false,
    aiAutoBooking: false,
    waitlistEnabled: false,
    recoveryEnabled: false,
    analyticsEnabled: false,
    multiDoctorEnabled: false,
    customBrandingEnabled: false,
    exportEnabled: false,
    noShowPolicyEnabled: false,
    whatsappEnabled: true,
    prioritySupport: false,
    aiMessagesPerDay: 0,
    apiCallsPerHour: 100,
    priceMonthly: 49,
    priceAnnual: 39,
  },
  pro: {
    maxPatients: 1000,
    maxUsers: 5,
    maxAppointmentsPerMonth: 2000,
    historyMonths: 12,
    aiEnabled: true,
    aiAutoBooking: true,
    waitlistEnabled: true,
    recoveryEnabled: true,
    analyticsEnabled: true,
    multiDoctorEnabled: true,
    customBrandingEnabled: false,
    exportEnabled: true,
    noShowPolicyEnabled: true,
    whatsappEnabled: true,
    prioritySupport: false,
    aiMessagesPerDay: 500,
    apiCallsPerHour: 1000,
    priceMonthly: 99,
    priceAnnual: 79,
  },
  enterprise: {
    maxPatients: -1,
    maxUsers: -1,
    maxAppointmentsPerMonth: -1,
    historyMonths: -1,
    aiEnabled: true,
    aiAutoBooking: true,
    waitlistEnabled: true,
    recoveryEnabled: true,
    analyticsEnabled: true,
    multiDoctorEnabled: true,
    customBrandingEnabled: true,
    exportEnabled: true,
    noShowPolicyEnabled: true,
    whatsappEnabled: true,
    prioritySupport: true,
    aiMessagesPerDay: -1,
    apiCallsPerHour: -1,
    priceMonthly: 249,
    priceAnnual: 199,
  },
};

export function getPlanLimits(plan?: string): PlanLimits {
  return PLAN_LIMITS[(plan as PlanTier) ?? 'pro'] ?? PLAN_LIMITS.pro;
}

export function isQuotaExceeded(current: number, max: number): boolean {
  if (max === -1) return false;
  return current >= max;
}

export function getQuotaPercent(current: number, max: number): number {
  if (max === -1) return 0;
  return Math.min(100, Math.round((current / max) * 100));
}

export type PlanFeatureKey = keyof Pick<PlanLimits,
  | 'aiEnabled' | 'aiAutoBooking' | 'waitlistEnabled' | 'recoveryEnabled'
  | 'analyticsEnabled' | 'multiDoctorEnabled' | 'customBrandingEnabled'
  | 'exportEnabled' | 'noShowPolicyEnabled' | 'whatsappEnabled' | 'prioritySupport'
>;

export const FEATURE_LABELS: Record<PlanFeatureKey, string> = {
  aiEnabled:             'Assistant IA WhatsApp',
  aiAutoBooking:         'Prise de RDV automatique par IA',
  waitlistEnabled:       "Liste d'attente",
  recoveryEnabled:       'Relances patients perdus',
  analyticsEnabled:      'Tableau de bord analytique',
  multiDoctorEnabled:    'Multi-praticiens',
  customBrandingEnabled: 'Personnalisation de la marque',
  exportEnabled:         'Export CSV / PDF',
  noShowPolicyEnabled:   'Politique no-show',
  whatsappEnabled:       'Canal WhatsApp',
  prioritySupport:       'Support prioritaire',
};
