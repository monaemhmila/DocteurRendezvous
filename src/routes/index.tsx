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
import { toast } from "sonner";
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
import { Switch } from "@/components/ui/switch";
import { useAppState } from "@/hooks/use-app-state";
import { useAuth } from "@/contexts/auth-context";
import { formatLongDate, money, relativeDay } from "@/lib/format";
import { api } from "@/lib/api";
import { IPatient, IAppointment } from "@/types/api";

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
  const { aiGlobalActive, setAiGlobalActive } = useAppState();
  const { user } = useAuth();
  
  const todayStr = (new Date().toISOString().split("T")[0]) as string;

  const { data: stats, isLoading: isLoadingStats, isError: isErrorStats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get(`/stats/dashboard?date=${todayStr}`),
  });

  const { data: appointmentsData = [], isLoading: isLoadingAppts } = useQuery<IAppointment[]>({
    queryKey: ["appointments"],
    queryFn: () => api.get("/appointments"),
  });

  const { data: patientsData = [], isLoading: isLoadingPatients } = useQuery<IPatient[]>({
    queryKey: ["patients"],
    queryFn: () => api.get("/patients"),
  });

  const isLoading = isLoadingStats || isLoadingAppts || isLoadingPatients;

  if (isErrorStats) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-6">
        <PageHeader title={`Bonjour ${user?.firstName} 👋`} subtitle={formatLongDate(todayStr)} />
        <EmptyState 
          icon={ShieldAlert}
          title="Erreur de chargement"
          description="Impossible de charger le tableau de bord."
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
        title={`Bonjour ${user?.firstName} 👋`}
        subtitle={formatLongDate(todayStr)}
        actions={
          <>
            <div className="panel flex items-center gap-2.5 px-3 py-2">
              <Sparkles className="size-4 text-ai" />
              <span className="text-[13px] font-medium">Assistant IA</span>
              <Switch
                checked={aiGlobalActive}
                onCheckedChange={(v) => {
                  setAiGlobalActive(v);
                  toast.success(v ? "Assistant IA activé" : "Assistant IA mis en pause");
                }}
              />
            </div>
            <Button asChild>
              <Link to="/recovery">Lancer une récupération</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Rendez-vous aujourd'hui"
          value={isLoadingStats ? "..." : stats?.todayAppts ?? 0}
          {...(!isLoadingStats && { hint: `${stats?.confirmedAppts ?? 0} confirmés` })}
          tone="accent"
          icon={CalendarDays}
        />
        <StatCard
          label="Patients à récupérer"
          value={isLoadingStats ? "..." : stats?.patientsToRecover ?? 0}
          hint="ce mois"
          tone="warning"
          icon={HeartPulse}
        />
        <StatCard
          label="Revenus récupérés"
          value={isLoadingStats ? "..." : money(stats?.recoveredValue ?? 0)}
          hint="30 derniers jours"
          tone="success"
          icon={Wallet}
        />
        <StatCard
          label="Conversations actives"
          value={isLoadingStats ? "..." : stats?.activeConversations ?? 0}
          {...(!isLoadingStats && { hint: `${stats?.needsHuman ?? 0} à traiter` })}
          tone="ai"
          icon={MessagesSquare}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="Agenda du jour"
          description={isLoadingAppts ? "Chargement..." : `${todayAppts.length} rendez-vous planifiés`}
          bodyClassName="p-0"
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/agenda">Voir l'agenda</Link>
            </Button>
          }
        >
          {isLoadingAppts ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Chargement...</div>
          ) : todayAppts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Aucun rendez-vous aujourd'hui</div>
          ) : (
            <ul className="divide-y divide-border">
              {todayAppts.slice(0, 8).map((a) => {
                const p = patientsData.find((pt) => pt._id === a.patientId);
                const pInitials = p ? `${p.firstName[0] || ""}${p.lastName[0] || ""}` : "";
                const pName = p ? `${p.firstName} ${p.lastName}` : "Patient inconnu";
                return (
                  <li key={a._id} className="flex items-center gap-3 px-5 py-3">
                    <span className="num w-12 shrink-0 text-sm font-semibold text-foreground">
                      {a.startTime || "00:00"}
                    </span>
                    <PatientAvatar initials={pInitials} id={a.patientId as string} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/patients/$id"
                        params={{ id: a.patientId as string }}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {pName}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.treatment || "Traitement non spécifié"}
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
          title="Priorités IA"
          description="Patients à contacter en premier"
          bodyClassName="p-0"
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/recovery">Tout voir</Link>
            </Button>
          }
        >
          {isLoadingPatients ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Chargement...</div>
          ) : toRecover.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Aucun patient prioritaire</div>
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
                      Relance nécessaire
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard title="Entonnoir de récupération" description="30 derniers jours">
          <div className="flex h-[200px] w-full items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl mt-2">
            Aucune donnée
          </div>
        </SectionCard>

        <SectionCard
          title="Créneaux libres"
          description="À remplir avec la liste d'attente"
          bodyClassName="p-0"
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/waitlist">Liste d'attente</Link>
            </Button>
          }
        >
          <div className="flex h-[200px] w-full items-center justify-center text-muted-foreground p-5">
            Aucune donnée
          </div>
        </SectionCard>

        <SectionCard
          title="Activité de l'IA"
          description="Dernières 24 heures"
          bodyClassName="p-0"
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/conversations">Boîte de réception</Link>
            </Button>
          }
        >
          <div className="flex h-[200px] w-full items-center justify-center text-muted-foreground p-5">
            Aucune donnée
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Impact estimé" description="Simulation basée sur vos données locales">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="flex items-start gap-3 opacity-50">
            <span className="flex size-9 items-center justify-center rounded-lg bg-success-soft text-success">
              <TrendingUp className="size-4" />
            </span>
            <div>
              <p className="num text-xl font-semibold">N/A</p>
              <p className="text-xs text-muted-foreground">
                Potentiel restant à récupérer
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
                Messages traités automatiquement ce mois
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
                Rendez-vous créés par l'IA ce mois
              </p>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
