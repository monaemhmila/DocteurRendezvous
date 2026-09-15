import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader, SectionCard, PatientAvatar, EmptyState } from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { AlertCircle, Calendar } from "lucide-react";
import { relativeDay } from "@/lib/format";

export const Route = createFileRoute("/no-shows")({
  component: NoShowsPage,
});

interface INoShowAppointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  treatment: string;
  status: string;
}

function NoShowsPage() {
  const { data: noShows, isLoading: isLoadingNoShows, isError: isErrorNoShows } = useQuery<INoShowAppointment[]>({
    queryKey: ["no-shows"],
    queryFn: () => api.get("/appointments/no-shows"),
  });

  const { data: dashboardStats, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get("/stats/dashboard"),
  });

  const { data: analyticsStats, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["analytics-stats"],
    queryFn: () => api.get("/stats/analytics/overview"),
  });

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 pb-20">
      <PageHeader
        title="Rendez-vous manqués (No-shows)"
        subtitle="Gérez les absences pour minimiser l'impact sur le cabinet."
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-5">
          <p className="text-[13px] font-medium text-muted-foreground">Absences aujourd'hui</p>
          {isLoadingDashboard ? (
             <p className="mt-2 text-3xl font-semibold text-muted-foreground animate-pulse">...</p>
          ) : (
             <p className="mt-2 text-3xl font-semibold text-foreground">{dashboardStats?.noShowsToday ?? 0}</p>
          )}
        </div>
        <div className="panel p-5">
          <p className="text-[13px] font-medium text-muted-foreground">Cette semaine</p>
          {isLoadingDashboard ? (
             <p className="mt-2 text-3xl font-semibold text-muted-foreground animate-pulse">...</p>
          ) : (
             <p className="mt-2 text-3xl font-semibold text-foreground">{dashboardStats?.noShowsThisWeek ?? 0}</p>
          )}
        </div>
        <div className="panel p-5">
          <p className="text-[13px] font-medium text-muted-foreground">Taux de récupération</p>
          {isLoadingAnalytics ? (
             <p className="mt-2 text-3xl font-semibold text-muted-foreground animate-pulse">...</p>
          ) : (
             <p className="mt-2 text-3xl font-semibold text-success">
                {analyticsStats?.noShowRecoveryRate != null ? Math.round(analyticsStats.noShowRecoveryRate) : 0}%
             </p>
          )}
        </div>
      </div>

      <SectionCard bodyClassName="p-0">
        {isLoadingNoShows ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">Chargement des absences...</div>
        ) : isErrorNoShows ? (
          <div className="p-8 text-center text-destructive">Une erreur est survenue lors du chargement.</div>
        ) : !noShows || noShows.length === 0 ? (
          <EmptyState 
             icon={Calendar} 
             title="Aucun no-show" 
             description="Aucun rendez-vous manqué n'a été trouvé." 
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3 font-medium text-muted-foreground">Patient</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Heure</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Traitement</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Historique absences</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Statut Recovery</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {noShows.map((n) => (
                  <tr key={n.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <PatientAvatar 
                          initials={n.patientName.substring(0, 2).toUpperCase()} 
                          id={n.patientId} 
                          size="sm" 
                        />
                        <Link 
                          to="/patients/$id" 
                          params={{ id: n.patientId }} 
                          className="font-medium hover:underline"
                        >
                          {n.patientName}
                        </Link>
                      </div>
                    </td>
                    <td className="px-5 py-3">{relativeDay(n.date)}</td>
                    <td className="px-5 py-3">{n.startTime}</td>
                    <td className="px-5 py-3 text-muted-foreground">{n.treatment || "Non spécifié"}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      <span className="text-xs">N/A</span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      <span className="text-xs">N/A</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link to="/patients/$id" params={{ id: n.patientId }}>
                        <Button size="sm" variant="outline">
                          Voir le suivi
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
