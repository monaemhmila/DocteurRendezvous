import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Sparkles, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useAppState } from "@/hooks/use-app-state";
import type {
  AppointmentStatus,
  PatientStatus,
  Priority,
  RecoveryReason,
} from "@/types";

/* -------------------------------------------------------------- PageHeader */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- StatCard */

export function StatCard({
  label,
  value,
  hint,
  trend,
  tone = "neutral",
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  trend?: number;
  tone?: "neutral" | "accent" | "ai" | "warning" | "success" | "destructive";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const toneRing: Record<string, string> = {
    neutral: "bg-muted text-muted-foreground",
    accent: "bg-accent-soft text-accent",
    ai: "bg-ai-soft text-ai",
    warning: "bg-warning-soft text-warning",
    success: "bg-success-soft text-success",
    destructive: "bg-destructive-soft text-destructive",
  };

  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              toneRing[tone],
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="num mt-3 text-[28px] leading-none font-semibold text-foreground">{value}</p>
      <div className="mt-2 flex items-center gap-1.5 text-xs">
        {typeof trend === "number" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              trend >= 0 ? "text-success" : "text-destructive",
            )}
          >
            {trend >= 0 ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            )}
            {trend > 0 ? "+" : ""}
            {trend}%
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- SectionCard */

export function SectionCard({
  title,
  description,
  actions,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("panel overflow-hidden", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ Badges */

const pill =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap";

export function Dot({ className }: { className?: string }) {
  return <span className={cn("size-1.5 rounded-full bg-current", className)} />;
}

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const { t, language } = useAppState();
  const appointmentStatusLabel: Record<AppointmentStatus, string> = {
    confirmed: language === "ar" ? "مؤكد" : language === "en" ? "Confirmed" : "CONFIRMÉ",
    scheduled: language === "ar" ? "مبرمج" : language === "en" ? "Scheduled" : "PRÉVU",
    cancelled: language === "ar" ? "ملغى" : language === "en" ? "Cancelled" : "ANNULÉ",
    completed: language === "ar" ? "مكتمل" : language === "en" ? "Completed" : "EFFECTUÉ",
    no_show: language === "ar" ? "غياب" : language === "en" ? "No-Show" : "NO-SHOW",
  };
  const styles: Record<AppointmentStatus, string> = {
    confirmed: "bg-success-soft text-success",
    scheduled: "bg-warning-soft text-warning",
    cancelled: "bg-muted text-muted-foreground",
    completed: "bg-secondary text-secondary-foreground",
    no_show: "bg-destructive-soft text-destructive",
  };
  return (
    <span className={cn(pill, styles[status])}>
      <Dot />
      {appointmentStatusLabel[status]}
    </span>
  );
}

export function PatientStatusBadge({ status }: { status: PatientStatus }) {
  const { t, language } = useAppState();
  const patientStatusLabel: Record<PatientStatus, string> = {
    active: language === "ar" ? "نشط" : language === "en" ? "Active" : "Actif",
    inactive: language === "ar" ? "غير نشط" : language === "en" ? "Inactive" : "Inactif",
    at_risk: language === "ar" ? "في خطر" : language === "en" ? "At Risk" : "À Risque",
  };
  const styles: Record<PatientStatus, string> = {
    active: "bg-success-soft text-success",
    inactive: "bg-muted text-muted-foreground",
    at_risk: "bg-warning-soft text-warning",
  };
  return (
    <span className={cn(pill, styles[status])}>
      <Dot />
      {patientStatusLabel[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { t } = useAppState();
  const priorityLabel: Record<Priority, string> = {
    high: t.followupsPage.priorityHigh,
    medium: t.followupsPage.priorityMedium,
    low: t.followupsPage.priorityLow,
  };
  const styles: Record<Priority, string> = {
    high: "bg-destructive-soft text-destructive",
    medium: "bg-warning-soft text-warning",
    low: "bg-muted text-muted-foreground",
  };
  return <span className={cn(pill, styles[priority])}>{priorityLabel[priority]}</span>;
}

export function ReasonBadge({ reason }: { reason: RecoveryReason }) {
  const { t } = useAppState();
  const reasonLabel: Record<RecoveryReason, string> = {
    inactive: t.uiKit.reasonInactive,
    treatment_interrupted: t.uiKit.reasonInterrupted,
    quote_pending: t.uiKit.reasonQuote,
    no_show: t.uiKit.reasonNoShow,
    checkup_overdue: t.uiKit.reasonOverdue,
    cancellation: t.uiKit.reasonCancel,
    follow_up: t.uiKit.reasonFollowUp,
  };
  return (
    <span className={cn(pill, "bg-secondary text-secondary-foreground")}>
      {reasonLabel[reason]}
    </span>
  );
}

export function AIStatusBadge({
  active,
  label,
}: {
  active: boolean;
  label?: string;
}) {
  const { t } = useAppState();
  return (
    <span
      className={cn(
        pill,
        active ? "bg-ai-soft text-ai" : "bg-muted text-muted-foreground",
      )}
    >
      <Sparkles className="size-3" />
      {label ?? (active ? t.uiKit.aiActive : t.uiKit.aiPaused)}
    </span>
  );
}

/* ------------------------------------------------------------------ Avatar */

const AVATAR_TONES = [
  "bg-accent-soft text-accent",
  "bg-ai-soft text-ai",
  "bg-warning-soft text-warning",
  "bg-success-soft text-success",
  "bg-secondary text-secondary-foreground",
];

export function PatientAvatar({
  initials,
  id = "",
  size = "md",
  className,
  ...props
}: {
  initials: string;
  id?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
} & React.HTMLAttributes<HTMLSpanElement>) {
  const tone =
    AVATAR_TONES[
      Math.abs([...id].reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_TONES.length
    ];
  const sizes = {
    sm: "size-8 text-[11px]",
    md: "size-10 text-xs",
    lg: "size-14 text-base",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold uppercase",
        sizes[size],
        tone,
        className,
      )}
      {...props}
    >
      {initials}
    </span>
  );
}

/* -------------------------------------------------------------- EmptyState */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon && (
        <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </span>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------- Misc */

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "accent",
}: {
  value: number;
  tone?: "accent" | "ai" | "warning" | "success";
}) {
  const bg = {
    accent: "bg-accent",
    ai: "bg-ai",
    warning: "bg-warning",
    success: "bg-success",
  }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all", bg)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
