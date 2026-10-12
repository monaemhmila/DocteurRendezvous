import { useAppState } from "@/hooks/use-app-state";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader, SectionCard, StatCard, EmptyState } from "@/components/shared/ui-kit";
import { HeartPulse, CalendarDays, ShieldAlert, ListOrdered, Sparkles, BarChart2 } from "lucide-react";
import { IAnalyticsOverview } from "@/types/api";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { t } = useAppState();
  const { data: overview, isLoading: isLoadingOverview, isError: isErrorOverview } = useQuery<IAnalyticsOverview>({
    queryKey: ["analytics-overview"],
    queryFn: () => api.get("/stats/analytics/overview"),
  });

  const { data: dashboard, isLoading: isLoadingDashboard, isError: isErrorDashboard } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get("/stats/dashboard"),
  });

  const isLoading = isLoadingOverview || isLoadingDashboard;
  const isError = isErrorOverview || isErrorDashboard;

  if (isError) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-6">
        <PageHeader title={t.analyticsPage.title} subtitle={t.analyticsPage.subtitleError} />
        <EmptyState 
          icon={ShieldAlert}
          title={t.analyticsPage.errorTitle}
          description={t.analyticsPage.errorDesc}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-20">
      <PageHeader
        title={t.analyticsPage.title}
        subtitle={t.analyticsPage.subtitle}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label={t.analyticsPage.statRecoveryRate}
          value={isLoading ? t.analyticsPage.loading : `${Math.round(overview?.recoveryRate ?? 0)}%`}
          tone="success"
          icon={HeartPulse}
        />
        <StatCard
          label={t.analyticsPage.statNoShow}
          value={isLoading ? t.analyticsPage.loading : "N/A"}
          tone="neutral"
          icon={CalendarDays}
        />
        <StatCard
          label={t.analyticsPage.statNoShowRecovery}
          value={isLoading ? t.analyticsPage.loading : `${Math.round(overview?.noShowRecoveryRate ?? 0)}%`}
          tone="accent"
          icon={ShieldAlert}
        />
        <StatCard
          label={t.analyticsPage.statWaitlist}
          value={isLoading ? t.analyticsPage.loading : `${Math.round(overview?.waitlistConversionRate ?? 0)}%`}
          tone="ai"
          icon={ListOrdered}
        />
        <StatCard
          label={t.analyticsPage.statActiveFollowUps}
          value={isLoading ? t.analyticsPage.loading : dashboard?.activeFollowUps ?? 0}
          tone="warning"
          icon={Sparkles}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title={t.analyticsPage.chartAppointmentsTitle} description={t.analyticsPage.chartAppointmentsDesc}>
          <div className="flex h-[300px] w-full items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl mt-4">{t.analyticsPage.noData}</div>
        </SectionCard>

        <SectionCard title={t.analyticsPage.chartInactiveTitle} description={t.analyticsPage.chartInactiveDesc}>
          <div className="flex h-[300px] w-full items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl mt-4">{t.analyticsPage.noData}</div>
        </SectionCard>
      </div>

      <SectionCard title={t.analyticsPage.chartLostTitle} className="border-warning/30 bg-warning/5">
         <div className="flex h-[150px] w-full items-center justify-center text-muted-foreground mt-4">
            <div className="flex items-center gap-2">
               <BarChart2 className="w-5 h-5" />
               <p>{t.analyticsPage.noData}</p>
            </div>
         </div>
      </SectionCard>
    </div>
  );
}
