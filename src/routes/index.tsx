import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  HeartPulse,
  MessagesSquare,
  Sparkles,
  TrendingUp,
  Wallet,
  ShieldAlert
} from "lucide-react";
import {
  AIStatusBadge,
  AppointmentStatusBadge,
  PageHeader,
  PatientAvatar,
  PriorityBadge,
  ProgressBar,
  SectionCard,
  StatCard,
  EmptyState
} from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";

const getPatientId = (p: any) => {
  if (!p) return null;
  if (typeof p === 'string') return p;
  if (typeof p === 'object' && p._id) return p._id;
  if (typeof p === 'object' && p.id) return p.id;
  return null;
};

import { useAuth } from "@/contexts/auth-context";
import { formatLongDate, money, relativeDay } from "@/lib/format";
import { api } from "@/lib/api";
import { IPatient, IAppointment } from "@/types/api";
import { useAppState } from "@/hooks/use-app-state";

import { useAdmin } from "@/contexts/admin-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Dental AI" },
      {
        name: "description",
        content:
          "Vue d'ensemble du cabinet : rendez-vous du jour, patients à récupérer, revenus récupérés et activité de l'assistant IA.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { t } = useAppState();
  const { isAdminUnlocked } = useAdmin();
  
  const todayStr = (new Date().toISOString().split("T")[0]) as string;

  const { data: stats, isLoading: isLoadingStats, isError: isErrorStats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get(`/stats/dashboard?date=${todayStr}`),
  });

  const { data: appointmentsData = [], isLoading: isLoadingAppts } = useQuery<IAppointment[]>({
    queryKey: ["appointments", "today", todayStr],
    queryFn: async () => {
      const res = await api.get(`/appointments?date=${todayStr}&limit=100`);
      return Array.isArray(res) ? res : (res.data || []);
    },
  });

  const { data: patientsData = [], isLoading: isLoadingPatients } = useQuery<IPatient[]>({
    queryKey: ["patients"],
    queryFn: async () => {
      const res = await api.get("/patients?limit=100");
      return Array.isArray(res) ? res : (res.data || []);
    },
  });

  const isLoading = isLoadingStats || isLoadingAppts || isLoadingPatients;

  if (isErrorStats) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-6">
        <PageHeader title={t.dashboardPage.hello.replace("{name}", user?.firstName || "")} subtitle={formatLongDate(todayStr)} />
        <EmptyState 
          icon={ShieldAlert}
          title={t.dashboardPage.loadingError}
          description={t.dashboardPage.loadingErrorDesc}
        />
      </div>
    );
  }

  const todayAppts = appointmentsData
    .filter((a) => a.date === todayStr)
    .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

  const toRecover = patientsData
    .filter((p) => p.status === "at_risk" || (p.tags && p.tags.includes("recovery")))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-20">
      <PageHeader
        title={t.dashboardPage.hello.replace("{name}", user?.firstName || "")}
        subtitle={formatLongDate(todayStr)}
        actions={
          <>
            <Button asChild>
              <Link to="/recovery">{t.dashboardPage.startRecovery}</Link>
            </Button>
          </>
        }
      />

      {/* AI Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-card/50 p-6 sm:p-8 shadow-sm">
        <div className="absolute -top-24 -right-24 size-64 rounded-full bg-ai/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 size-64 rounded-full bg-emerald-500/10 blur-3xl" />
        
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="size-6 text-ai" />
              {t.dashboardPage.aiPerformance}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              {t.dashboardPage.aiPerformanceDesc}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 sm:gap-8">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.dashboardPage.automationRate}</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-ai">{isLoadingStats ? "..." : stats?.automationRate ?? 100}%</span>
              </div>
              <div className="h-1.5 w-32 rounded-full bg-secondary overflow-hidden">
                <div 
                  className="h-full bg-ai transition-all duration-1000 ease-out" 
                  style={{ width: `${stats?.automationRate ?? 100}%` }}
                />
              </div>
            </div>

            {isAdminUnlocked && (
              <>
                <div className="h-12 w-px bg-border hidden sm:block" />

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.dashboardPage.recoveredRevenue}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400">
                      {isLoadingStats ? "..." : money(stats?.recoveredValue ?? 0)}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-emerald-600/80 dark:text-emerald-400/80">{t.dashboardPage.last30days}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.dashboardPage.apptsToday}
          value={isLoadingStats ? "..." : stats?.todayAppts ?? 0}
          {...(!isLoadingStats && { hint: t.dashboardPage.confirmedAppts.replace("{count}", (stats?.confirmedAppts ?? 0).toString()) })}
          tone="accent"
          icon={CalendarDays}
        />
        <StatCard
          label={t.dashboardPage.patientsToRecover}
          value={isLoadingStats ? "..." : stats?.patientsToRecover ?? 0}
          hint={t.dashboardPage.thisMonth}
          tone="warning"
          icon={HeartPulse}
        />
        <StatCard
          label={t.dashboardPage.recentNoShows}
          value={isLoadingStats ? "..." : stats?.noShowsThisWeek ?? 0}
          hint={t.dashboardPage.last7days}
          tone="destructive"
          icon={ShieldAlert}
        />
        <StatCard
          label={t.dashboardPage.activeConversations}
          value={isLoadingStats ? "..." : stats?.activeConversations ?? 0}
          {...(!isLoadingStats && { hint: t.dashboardPage.needsHuman.replace("{count}", (stats?.needsHuman ?? 0).toString()) })}
          tone="ai"
          icon={MessagesSquare}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title={t.dashboardPage.todayAgenda}
          description={isLoadingAppts ? t.common.loading : t.dashboardPage.plannedAppts.replace("{count}", todayAppts.length.toString())}
          bodyClassName="p-0"
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/agenda">{t.dashboardPage.viewAgenda}</Link>
            </Button>
          }
        >
          {isLoadingAppts ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">{t.common.loading}</div>
          ) : todayAppts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">{t.dashboardPage.noApptsToday}</div>
          ) : (
            <ul className="divide-y divide-border">
              {todayAppts.slice(0, 8).map((a) => {
                const p = patientsData.find((pt) => pt._id === getPatientId(a.patientId));
                const pInitials = p ? `${p.firstName[0] || ""}${p.lastName[0] || ""}` : "";
                const pName = p ? `${p.firstName} ${p.lastName}` : t.dashboardPage.unknownPatient;
                return (
                  <li key={a._id} className="flex items-center gap-3 px-5 py-3">
                    <span className="num w-12 shrink-0 text-sm font-semibold text-foreground">
                      {a.startTime || "00:00"}
                    </span>
                    <PatientAvatar initials={pInitials} id={getPatientId(a.patientId) as string} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/patients/$id"
                        params={{ id: a.patientId as string }}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {pName}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.treatment || t.dashboardPage.unspecifiedTreatment}
                      </p>
                    </div>
                    <AppointmentStatusBadge status={a.status as any} />
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title={t.dashboardPage.aiPriorities}
          description={t.dashboardPage.contactFirst}
          bodyClassName="p-0"
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/recovery">{t.dashboardPage.seeAll}</Link>
            </Button>
          }
        >
          {isLoadingPatients ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">{t.common.loading}</div>
          ) : toRecover.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">{t.dashboardPage.noPriority}</div>
          ) : (
            <ul className="divide-y divide-border">
              {toRecover.map((p) => {
                const pInitials = `${p.firstName[0] || ""}${p.lastName[0] || ""}`;
                const pName = `${p.firstName} ${p.lastName}`;
                return (
                  <li key={p._id} className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <PatientAvatar initials={pInitials} id={p._id} size="sm" />
                      <Link
                        to="/patients/$id"
                        params={{ id: p._id }}
                        className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                      >
                        {pName}
                      </Link>
                      {(p as any).priority && <PriorityBadge priority={(p as any).priority} />}
                    </div>
                    <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
                      {t.dashboardPage.needsFollowup}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard title={t.dashboardPage.recoveryFunnel} description={t.dashboardPage.last30days}>
          <div className="flex h-[200px] w-full items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl mt-2">
            {t.dashboardPage.noData}
          </div>
        </SectionCard>

        <SectionCard
          title={t.dashboardPage.freeSlots}
          description={t.dashboardPage.fillWithWaitlist}
          bodyClassName="p-0"
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/waitlist">{t.dashboardPage.waitlist}</Link>
            </Button>
          }
        >
          <div className="flex h-[200px] w-full items-center justify-center text-muted-foreground p-5">
            {t.dashboardPage.noData}
          </div>
        </SectionCard>

        <SectionCard
          title={t.dashboardPage.aiActivity}
          description={t.dashboardPage.last24h}
          bodyClassName="p-0"
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/conversations" search={{ conversationId: undefined }}>{t.dashboardPage.inbox}</Link>
            </Button>
          }
        >
          <div className="flex h-[200px] w-full items-center justify-center text-muted-foreground p-5">
            {t.dashboardPage.noData}
          </div>
        </SectionCard>
      </div>

      <SectionCard title={t.dashboardPage.estimatedImpact} description={t.dashboardPage.simulationBased}>
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="flex items-start gap-3 opacity-50">
            <span className="flex size-9 items-center justify-center rounded-lg bg-success-soft text-success">
              <TrendingUp className="size-4" />
            </span>
            <div>
              <p className="num text-xl font-semibold">N/A</p>
              <p className="text-xs text-muted-foreground">
                {t.dashboardPage.potentialRemaining}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 opacity-50">
            <span className="flex size-9 items-center justify-center rounded-lg bg-ai-soft text-ai">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="num text-xl font-semibold">N/A</p>
              <p className="text-xs text-muted-foreground">
                {t.dashboardPage.messagesProcessed}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 opacity-50">
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <CalendarDays className="size-4" />
            </span>
            <div>
              <p className="num text-xl font-semibold">N/A</p>
              <p className="text-xs text-muted-foreground">
                {t.dashboardPage.apptsCreated}
              </p>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
