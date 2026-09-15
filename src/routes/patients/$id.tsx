import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Phone, Calendar, Sparkles, ChevronLeft, CalendarDays, ClipboardList } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  PageHeader,
  PatientAvatar,
  PatientStatusBadge,
  PriorityBadge,
  SectionCard,
  EmptyState
} from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { relativeDay } from "@/lib/format";
import { Separator } from "@/components/ui/separator";
import { IPatient, IAppointment, IRecovery } from "@/types/api";

export const Route = createFileRoute("/patients/$id")({
  component: PatientProfilePage,
});

function PatientProfilePage() {
  const { id } = Route.useParams();
  
  const { data: p, isLoading: isLoadingPatient, isError: isErrorPatient } = useQuery<IPatient>({
    queryKey: ["patients", id],
    queryFn: () => api.get(`/patients/${id}`),
  });

  const { data: opportunities = [], isLoading: isLoadingRecovery } = useQuery<IRecovery[]>({
    queryKey: ["recovery", "patient", id],
    queryFn: () => api.get(`/recovery?patientId=${id}`),
  });

  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery<IAppointment[]>({
    queryKey: ["appointments", "patient", id],
    queryFn: () => api.get(`/appointments?patientId=${id}`),
  });

  const isLoading = isLoadingPatient || isLoadingRecovery || isLoadingAppointments;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1000px] space-y-6">
        <div className="p-8 text-center text-muted-foreground animate-pulse">Chargement du profil patient...</div>
      </div>
    );
  }

  if (isErrorPatient || !p) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center">
        <h2 className="text-xl font-semibold">Patient introuvable</h2>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/patients">Retour aux patients</Link>
        </Button>
      </div>
    );
  }

  const handleAction = (msg: string) => {
    toast.success(msg);
  };

  const patientInitials = `${p.firstName[0] || ""}${p.lastName[0] || ""}`;
  const patientName = `${p.firstName} ${p.lastName}`;

  // Find some derived metrics from appointments if needed, 
  // but we must rely on backend patient.metrics when possible
  const totalVisits = p.metrics?.totalVisits ?? 0;
  const noShows = p.metrics?.noShowCount ?? 0;
  const lastVisit = p.metrics?.lastVisit;
  const nextAppointment = p.nextAppointmentAt;

  // Filter appointments for chronology
  const timelineAppointments = [...appointments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="mx-auto max-w-[1000px] space-y-6 pb-20">
      <Link
        to="/patients"
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 size-4" />
        Retour aux patients
      </Link>

      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div className="flex items-center gap-4">
          <PatientAvatar initials={patientInitials.toUpperCase()} id={p._id} size="lg" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {patientName}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <PatientStatusBadge status={p.status as any} />
              <span>{p.phone}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => handleAction("Appel lancé")}>
            <Phone className="mr-2 size-4" />
            Appeler
          </Button>
          <Button variant="outline" onClick={() => handleAction("Message ouvert")}>
            <MessageCircle className="mr-2 size-4" />
            WhatsApp
          </Button>
          <Button onClick={() => handleAction("Prise de rendez-vous ouverte")}>
            <Calendar className="mr-2 size-4" />
            Prendre RDV
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <SectionCard title="Historique des rendez-vous">
             {timelineAppointments.length === 0 ? (
                <EmptyState 
                   icon={CalendarDays} 
                   title="Aucun rendez-vous" 
                   description="Ce patient n'a aucun historique de rendez-vous."
                />
             ) : (
                <div className="relative border-l border-border ml-3 space-y-6 pl-6 mt-4">
                  {timelineAppointments.map((a) => (
                    <div key={a._id} className="relative">
                      <span className="absolute -left-[31px] top-1 flex size-3 items-center justify-center rounded-full bg-border ring-4 ring-surface" />
                      <p className="text-xs font-semibold text-muted-foreground">{relativeDay(a.date)}</p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
                        {a.treatment || "Traitement non spécifié"}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        Statut: {a.status.replace(/_/g, " ")} {a.startTime && `à ${a.startTime}`}
                      </p>
                    </div>
                  ))}
                </div>
             )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Détails du patient">
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Téléphone</dt>
                <dd className="font-medium">{p.email || "—"}</dd>
              </div>
              <Separator />
              <div>
                <dt className="text-muted-foreground">Dernière visite</dt>
                <dd className="font-medium">{lastVisit ? relativeDay(lastVisit as string) : "—"}</dd>
              </div>
              <Separator />
              <div>
                <dt className="text-muted-foreground">Prochain RDV</dt>
                <dd className="font-medium">{nextAppointment ? relativeDay(nextAppointment as string) : "Aucun"}</dd>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-muted-foreground">Visites totales</dt>
                  <dd className="font-medium">{totalVisits}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Absences</dt>
                  <dd className="font-medium text-destructive">{noShows}</dd>
                </div>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Opportunités de récupération" className="border-warning/20">
             {opportunities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground text-center">
                  <ClipboardList className="size-6 mb-2 opacity-50" />
                  <p className="text-sm">Aucune récupération en cours</p>
                </div>
             ) : (
                <div className="space-y-4 mt-2">
                  {opportunities.map((opp) => (
                    <div key={opp._id} className="rounded-lg bg-background p-3 text-sm shadow-sm ring-1 ring-border">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium capitalize">{opp.type.replace(/_/g, " ")}</span>
                        {opp.priority && <PriorityBadge priority={opp.priority} />}
                      </div>
                      <p className="text-muted-foreground text-xs mb-2">
                         {opp.status === "identified" as any ? "Patient identifié pour relance" :
                          opp.status === "queued" ? "En attente de relance" :
                          opp.status === "contacted" ? "Patient contacté" :
                          opp.status === "responded" ? "Patient a répondu" :
                          opp.status === "booked" ? "Nouveau rendez-vous planifié" :
                          opp.status === "visited" ? "Rendez-vous honoré (Récupéré)" :
                          opp.status === "no_response" ? "Aucune réponse du patient" :
                          opp.status === "dismissed" ? "Opportunité écartée" : opp.status}
                      </p>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                        <span className="text-xs font-medium px-2 py-1 bg-secondary rounded-md capitalize">
                          {opp.status.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Valeur estimée: {opp.estimatedValue || 0} DT
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
             )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
