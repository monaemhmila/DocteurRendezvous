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
        <PageHeader title="Analytics" subtitle="Suivez les performances de votre cabinet et l'impact de l'IA." />
        <EmptyState 
          icon={ShieldAlert}
          title="Erreur de chargement"
          description="Impossible de charger les statistiques d'analyse pour le moment."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-20">
      <PageHeader
        title="Analytics"
        subtitle="Suivez les performances de votre cabinet et l'impact de l'IA (30 derniers jours)."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Taux de récupération"
          value={isLoading ? "..." : `${Math.round(overview?.recoveryRate ?? 0)}%`}
          tone="success"
          icon={HeartPulse}
        />
        <StatCard
          label="Taux de no-show"
          value={isLoading ? "..." : "N/A"}
          tone="neutral"
          icon={CalendarDays}
        />
        <StatCard
          label="Récupération no-show"
          value={isLoading ? "..." : `${Math.round(overview?.noShowRecoveryRate ?? 0)}%`}
          tone="accent"
          icon={ShieldAlert}
        />
        <StatCard
          label="Remplissage liste attente"
          value={isLoading ? "..." : `${Math.round(overview?.waitlistConversionRate ?? 0)}%`}
          tone="ai"
          icon={ListOrdered}
        />
        <StatCard
          label="Relances actives"
          value={isLoading ? "..." : dashboard?.activeFollowUps ?? 0}
          tone="warning"
          icon={Sparkles}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Rendez-vous et Récupérations" description="Évolution sur les 6 derniers mois">
          <div className="flex h-[300px] w-full items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl mt-4">
             Aucune donnée
          </div>
        </SectionCard>

        <SectionCard title="Réactivation de patients inactifs" description="Patients n'ayant pas consulté depuis > 6 mois">
          <div className="flex h-[300px] w-full items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl mt-4">
             Aucune donnée
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Où votre cabinet perd des opportunités" className="border-warning/30 bg-warning/5">
         <div className="flex h-[150px] w-full items-center justify-center text-muted-foreground mt-4">
            <div className="flex items-center gap-2">
               <BarChart2 className="w-5 h-5" />
               <p>Aucune donnée</p>
            </div>
         </div>
      </SectionCard>
    </div>
  );
}
