import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus, Sparkles, Loader2, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

import {
  AppointmentStatusBadge,
  EmptyState,
  PageHeader,
  PatientAvatar,
  SectionCard,
} from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { addDays, formatLongDate, formatShortDate, money, startOfWeek } from "@/lib/format";
import { cn } from "@/lib/utils";

// Today's date as ISO YYYY-MM-DD — used as the default selected day in the agenda grid
const pad = (n: number) => String(n).padStart(2, "0");
function isoDay(offset = 0): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const TODAY = isoDay(0);

// Derived from backend/src/modules/appointments/appointment.controller.ts
interface BackendAppointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  treatment: string;
  notes?: string;
  status: "scheduled" | "confirmed" | "cancelled" | "completed" | "no_show";
  createdByAi?: boolean;
  value?: number;
}

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — Dental AI" },
      {
        name: "description",
        content:
          "Agenda du cabinet en vue jour et semaine, avec créneaux libres, absences et rendez-vous créés par l'IA.",
      },
      { property: "og:title", content: "Agenda — Dental AI" },
      {
        property: "og:description",
        content: "Vue jour et semaine des rendez-vous du cabinet.",
      },
    ],
  }),
  component: AgendaPage,
});

const HOURS = [
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
];

function AgendaPage() {
  const [view, setView] = useState<"day" | "week">("day");
  const [day, setDay] = useState(TODAY);
  const [selected, setSelected] = useState<BackendAppointment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const weekStart = startOfWeek(day);
  const weekDays = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));

  const { data: serverAppointments = [], isLoading: isLoadingAppts, isError } = useQuery<BackendAppointment[]>({
    queryKey: ["appointments"],
    queryFn: () => api.get("/appointments"),
  });

  const { data: serverPatients = [], isLoading: isLoadingPatients } = useQuery<any[]>({
    queryKey: ["patients"],
    queryFn: () => api.get("/patients"),
  });

  const createAppointment = useMutation({
    mutationFn: (data: any) => api.post("/appointments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Rendez-vous ajouté avec succès.");
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      if (err.message?.includes("409")) {
        toast.error("Créneau non disponible (Double réservation).");
      } else {
        toast.error("Erreur lors de la création du rendez-vous.");
      }
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      api.patch(`/appointments/${id}/status`, { status }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      // Also invalidate stats/recoveries as lifecycles may have triggered
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["recoveries"] });
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      toast.success(`Statut mis à jour : ${variables.status}`);
      setSelected(null);
    },
    onError: () => toast.error("Erreur lors de la mise à jour du statut."),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const durationMin = parseInt(formData.get("durationMin") as string) || 30;
    const time = formData.get("time") as string;
    
    // calculate endTime
    const [hours, minutes] = time.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + durationMin;
    const endHours = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
    const endMinutes = (totalMinutes % 60).toString().padStart(2, "0");
    const endTime = `${endHours}:${endMinutes}`;

    const data = {
      patientId: formData.get("patientId"),
      date: formData.get("date"),
      startTime: time,
      endTime: endTime,
      treatment: formData.get("treatment"),
      durationMin: durationMin,
      status: "scheduled",
    };
    createAppointment.mutate(data);
  };

  const getPatient = (id: string) => serverPatients.find((p) => p.id === id);

  const visible = useMemo(
    () => serverAppointments,
    [serverAppointments],
  );

  const dayAppts = visible
    .filter((a) => a.date === day)
    .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

  const step = view === "day" ? 1 : 7;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-20">
      <PageHeader
        title="Agenda"
        subtitle={view === "day" ? formatLongDate(day) : `Semaine du ${formatShortDate(weekStart)}`}
        actions={
          <>
            <div className="panel flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDay(addDays(day, -step))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDay(TODAY)}>
                Aujourd'hui
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDay(addDays(day, step))}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Tabs value={view} onValueChange={(v) => setView(v as "day" | "week")}>
              <TabsList>
                <TabsTrigger value="day">Jour</TabsTrigger>
                <TabsTrigger value="week">Semaine</TabsTrigger>
              </TabsList>
            </Tabs>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4 mr-2" /> Rendez-vous
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Nouveau rendez-vous</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Patient</label>
                      <select name="patientId" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" required>
                        <option value="">Sélectionner un patient</option>
                        {serverPatients.map((p) => (
                          <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Date</label>
                        <Input name="date" type="date" required defaultValue={day} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Heure</label>
                        <Input name="time" type="time" required defaultValue="09:00" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Durée (min)</label>
                        <Input name="durationMin" type="number" required defaultValue="30" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Traitement</label>
                      <Input name="treatment" required placeholder="Ex: Détartrage" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                    <Button type="submit" disabled={createAppointment.isPending}>
                      {createAppointment.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Créer le rendez-vous
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      {isError ? (
        <div className="p-12 text-center">
          <p className="text-destructive">Impossible de charger l'agenda.</p>
        </div>
      ) : isLoadingAppts ? (
        <div className="p-12 text-center text-muted-foreground animate-pulse">
          Chargement de l'agenda...
        </div>
      ) : view === "day" ? (
        <SectionCard title="Journée" description={`${dayAppts.length} rendez-vous`} bodyClassName="p-0">
          {dayAppts.length === 0 ? (
            <EmptyState title="Aucun rendez-vous" description="Cette journée est libre." />
          ) : (
            <ul className="divide-y divide-border">
              {HOURS.map((h) => {
                const a = dayAppts.find((x) => x.startTime === h);
                if (!a)
                  return (
                    <li key={h} className="flex items-center gap-4 px-5 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => { setDay(day); setIsDialogOpen(true); }}>
                      <span className="num w-12 text-xs text-muted-foreground">{h}</span>
                      <span className="text-xs text-muted-foreground">Créneau libre</span>
                    </li>
                  );
                const p = getPatient(a.patientId);
                const pInitials = p ? `${p.firstName[0] || ""}${p.lastName[0] || ""}`.toUpperCase() : "??";
                const pName = p ? `${p.firstName} ${p.lastName}` : (a.patientName || "Patient inconnu");

                return (
                  <li key={h}>
                    <button
                      onClick={() => setSelected(a)}
                      className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-muted/60"
                    >
                      <span className="num w-12 text-sm font-semibold">{h}</span>
                      <PatientAvatar initials={pInitials} id={a.patientId} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {pName}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {a.treatment} · {a.durationMin} min
                        </span>
                      </span>
                      {a.createdByAi && (
                        <span className="hidden items-center gap-1 rounded-full bg-ai-soft px-2 py-0.5 text-[11px] font-medium text-ai sm:inline-flex">
                          <Sparkles className="size-3" /> IA
                        </span>
                      )}
                      <AppointmentStatusBadge status={a.status} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {weekDays.map((d) => {
            const list = visible
              .filter((a) => a.date === d)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            return (
              <SectionCard
                key={d}
                title={formatLongDate(d)}
                description={`${list.length} rendez-vous`}
                bodyClassName="p-0"
                className={cn(d === TODAY && "ring-1 ring-accent")}
              >
                {list.length === 0 ? (
                  <p className="px-5 py-6 text-xs text-muted-foreground">Journée libre.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {list.map((a) => {
                      const p = getPatient(a.patientId);
                      const pName = p ? `${p.firstName} ${p.lastName}` : (a.patientName || "Patient inconnu");
                      return (
                        <li key={a.id}>
                          <button
                            onClick={() => setSelected(a)}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/60"
                          >
                            <span className="num w-10 text-xs font-semibold">{a.startTime}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-medium">
                                {pName}
                              </span>
                              <span className="block truncate text-[11px] text-muted-foreground">
                                {a.treatment}
                              </span>
                            </span>
                            <AppointmentStatusBadge status={a.status} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </SectionCard>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          {selected && (() => {
            const sp = getPatient(selected.patientId);
            const spName = sp ? `${sp.firstName} ${sp.lastName}` : (selected.patientName || "Patient inconnu");
            const spInitials = sp ? `${sp.firstName[0] || ""}${sp.lastName[0] || ""}`.toUpperCase() : "??";
            const isUpdating = updateStatus.isPending;
            
            return (
              <>
                <DialogHeader>
                  <DialogTitle>{selected.treatment}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <PatientAvatar
                      initials={spInitials}
                      id={selected.patientId}
                    />
                    <div>
                      <Link
                        to="/patients/$id"
                        params={{ id: selected.patientId || "0" }}
                        className="text-sm font-medium hover:underline"
                        onClick={() => setSelected(null)}
                      >
                        {spName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {sp?.phone || "—"}
                      </p>
                    </div>
                    <div className="ml-auto">
                      <AppointmentStatusBadge status={selected.status} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg border border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-medium">{formatLongDate(selected.date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Heure</p>
                      <p className="num font-medium">
                        {selected.startTime} - {selected.endTime} ({selected.durationMin} min)
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Valeur estimée</p>
                      <p className="num font-medium">{money(selected.value ?? 0)}</p>
                    </div>
                  </div>
                  
                  {selected.notes && (
                    <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                      {selected.notes}
                    </p>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Actions sur le statut</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Button
                        size="sm"
                        variant={selected.status === "confirmed" ? "default" : "outline"}
                        disabled={isUpdating || selected.status === "confirmed"}
                        onClick={() => updateStatus.mutate({ id: selected.id, status: "confirmed" })}
                        className="w-full text-xs"
                      >
                        <CheckCircle2 className="mr-1.5 size-3.5 text-green-500" />
                        Confirmer
                      </Button>
                      <Button
                        size="sm"
                        variant={selected.status === "completed" ? "default" : "outline"}
                        disabled={isUpdating || selected.status === "completed"}
                        onClick={() => updateStatus.mutate({ id: selected.id, status: "completed" })}
                        className="w-full text-xs"
                      >
                        <CheckCircle2 className="mr-1.5 size-3.5 text-blue-500" />
                        Terminé
                      </Button>
                      <Button
                        size="sm"
                        variant={selected.status === "cancelled" ? "default" : "outline"}
                        disabled={isUpdating || selected.status === "cancelled"}
                        onClick={() => updateStatus.mutate({ id: selected.id, status: "cancelled" })}
                        className="w-full text-xs"
                      >
                        <XCircle className="mr-1.5 size-3.5 text-muted-foreground" />
                        Annuler
                      </Button>
                      <Button
                        size="sm"
                        variant={selected.status === "no_show" ? "destructive" : "outline"}
                        disabled={isUpdating || selected.status === "no_show"}
                        onClick={() => updateStatus.mutate({ id: selected.id, status: "no_show" })}
                        className="w-full text-xs"
                      >
                        <AlertCircle className="mr-1.5 size-3.5" />
                        No-Show
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        toast.success("Rappel WhatsApp envoyé");
                        setSelected(null);
                      }}
                    >
                      Envoyer un rappel
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/conversations">Voir la conversation</Link>
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
