import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { IFollowUpTask, IWaitlistEntry, IPatient } from "@/types/api";
import { PageHeader, SectionCard, PatientAvatar, PriorityBadge } from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CheckCircle2,
  UserPlus,
  Phone,
  MessageSquare,
  Mail,
  User,
  Smartphone,
  Trash2,
  Calendar,
  Clock,
  Sparkles,
  Zap,
  Search,
  Filter,
  AlertCircle,
  Stethoscope,
  ArrowRight,
  Send,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/waitlist")({
  component: WaitlistPage,
});

const POPULAR_TREATMENTS = [
  "Détartrage",
  "Implant",
  "Composite",
  "Couronne céramique",
  "Traitement de canal",
  "Consultation",
  "Urgence dentaire",
  "Blanchiment",
];

const DAYS_OF_WEEK = [
  { id: "Monday", label: "Lundi" },
  { id: "Tuesday", label: "Mardi" },
  { id: "Wednesday", label: "Mercredi" },
  { id: "Thursday", label: "Jeudi" },
  { id: "Friday", label: "Vendredi" },
  { id: "Saturday", label: "Samedi" },
];

function WaitlistPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [waitlistPage, setWaitlistPage] = useState(1);
  const waitlistLimit = 50; // reasonable page size for waitlist

  // Data Queries
  const { data: allTasks = [], isLoading: isLoadingTasks } = useQuery<IFollowUpTask[]>({
    queryKey: ["follow-ups", "slot_fill_offer"],
    queryFn: () => api.get("/follow-ups?type=slot_fill_offer"),
  });

  const { data: waitlistResponse, isLoading: isLoadingWaitlist } = useQuery<{ data: IWaitlistEntry[], meta: any }>({
    queryKey: ["waitlist", waitlistPage, waitlistLimit],
    queryFn: async () => {
      const res = await api.get(`/waitlist?page=${waitlistPage}&limit=${waitlistLimit}`);
      return res as { data: IWaitlistEntry[], meta: any };
    },
  });

  const waitlist: IWaitlistEntry[] = waitlistResponse?.data || [];
  const waitlistMeta = waitlistResponse?.meta;

  const { data: appointments = [] } = useQuery<any[]>({
    queryKey: ["appointments"],
    queryFn: async () => {
      const res = await api.get("/appointments?limit=100");
      return Array.isArray(res) ? res : (res.data || []);
    },
  });

  // Client-side filtering for pending/in_progress offers
  const openOffers = allTasks.filter(
    (t) =>
      (t.status === "pending" || t.status === "in_progress") &&
      (t.type === "slot_fill_offer" || !t.type) &&
      t.waitlistEntryId
  );

  // Delete waitlist entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/waitlist/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      toast.success("Patient retiré de la liste d'attente.");
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de la suppression"),
  });

  // Quick Simulation Mutation: Cancel an appointment to test AI slot matching
  const simulateCancelMutation = useMutation({
    mutationFn: async () => {
      // Find a scheduled appointment to cancel
      const scheduled = appointments.find((a) => a.status === "scheduled" || a.status === "confirmed");
      if (!scheduled) {
        throw new Error("Aucun rendez-vous planifié disponible pour simuler une annulation.");
      }
      const apptId = scheduled._id || scheduled.id;
      return api.patch(`/appointments/${apptId}/status`, { status: "cancelled" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      toast.success("Annulation simulée ! L'IA a analysé la liste d'attente et proposé le meilleur candidat.");
    },
    onError: (err: any) => toast.error(err.message || "Impossible de simuler"),
  });

  // Filtered waitlist (client-side filter on the current page)
  const filteredWaitlist = waitlist.filter((entry) => {
    const p = entry.patientId as IPatient;
    const name = p ? `${p.firstName} ${p.lastName}`.toLowerCase() : "";
    const treatment = (entry.treatment || "").toLowerCase();
    const matchesSearch =
      name.includes(searchQuery.toLowerCase()) ||
      treatment.includes(searchQuery.toLowerCase()) ||
      (p?.phone && p.phone.includes(searchQuery));

    if (priorityFilter === "all") return matchesSearch;
    return matchesSearch && entry.priority === priorityFilter;
  });

  const highPriorityCount = waitlist.filter((w) => w.priority === "high").length;

  // Group open offers by patient to avoid repetitive duplicate cards
  const offersByPatient = openOffers.reduce((acc, task) => {
    const p = (typeof task.patientId === "object" && task.patientId ? task.patientId : null) as IPatient | null;
    const pId = p?._id || p?.id || (typeof task.patientId === "string" ? task.patientId : "unknown");

    const sourceApptObj = typeof task.sourceAppointmentId === "object" && task.sourceAppointmentId ? (task.sourceAppointmentId as any) : null;
    const sourceApptId = sourceApptObj?._id || sourceApptObj?.id || (typeof task.sourceAppointmentId === "string" ? task.sourceAppointmentId : "");
    const sourceAppt = sourceApptObj?.date
      ? sourceApptObj
      : (appointments || []).find((a) => a && (a._id === sourceApptId || a.id === sourceApptId));

    if (!acc[pId]) {
      acc[pId] = {
        patientId: pId,
        patient: p,
        tasks: [],
      };
    }
    acc[pId].tasks.push({ task, sourceAppt });
    return acc;
  }, {} as Record<string, { patientId: string; patient: IPatient | null; tasks: Array<{ task: IFollowUpTask; sourceAppt: any }> }>);

  const patientOfferGroups = Object.values(offersByPatient);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 pb-20">
      <PageHeader
        title="Liste d'attente & Remplissage intelligent"
        subtitle="Dès qu'un créneau se libère ou est annulé, l'IA identifie automatiquement le meilleur patient en attente et lui propose le créneau par WhatsApp."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => simulateCancelMutation.mutate()}
              disabled={simulateCancelMutation.isPending}
              className="gap-2 text-xs border-dashed border-primary/40 text-primary hover:bg-primary/5"
            >
              <Zap className="size-3.5" />
              Simuler un désistement
            </Button>
            <AddWaitlistDialog />
          </div>
        }
      />

      {/* ── KPI Stat Banner ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Patients en attente
            </span>
            <User className="size-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{waitlistMeta?.total ?? waitlist.length}</p>
          <p className="text-xs text-muted-foreground">Demandes actives</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Priorité Haute / Urgences
            </span>
            <AlertCircle className="size-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">{highPriorityCount}</p>
          <p className="text-xs text-muted-foreground">À contacter en priorité</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Patients Ciblés (IA)
            </span>
            <Sparkles className="size-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold text-primary">{patientOfferGroups.length}</p>
          <p className="text-xs text-muted-foreground">{openOffers.length} créneau(x) libre(s) à attribuer</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Remplissage IA
            </span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">100%</p>
          <p className="text-xs text-muted-foreground">Algorithme automatisé 24/7</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Left Panel - Active Offers (Grouped by Patient) ─── */}
        <SectionCard
          title="Offres de créneau libéré (IA)"
          description={`${patientOfferGroups.length} patient(s) ciblé(s) · ${openOffers.length} créneau(x) disponible(s)`}
        >
          <div className="space-y-4">
            {isLoadingTasks ? (
              <p className="text-sm text-muted-foreground text-center py-8">Chargement des offres...</p>
            ) : patientOfferGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
                  <CheckCircle2 className="size-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">Tous vos créneaux sont occupés</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Dès qu'un patient annule son rendez-vous, l'IA proposera instantanément la place libérée au patient en attente le plus pertinent.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => simulateCancelMutation.mutate()}
                  className="mt-4 gap-1.5 text-xs"
                >
                  <Zap className="size-3.5 text-primary" />
                  Tester avec une annulation
                </Button>
              </div>
            ) : (
              patientOfferGroups.map((group) => (
                <PatientGroupOfferCard key={group.patientId} group={group} />
              ))
            )}
          </div>
        </SectionCard>

        {/* ── Right Panel - Waiting Patients ─────────────────── */}
        <SectionCard
          title="Patients inscrits en liste d'attente"
          description={`${filteredWaitlist.length} patient(s) en attente d'un créneau`}
        >
          {/* Search & Filter bar inside the card */}
          <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
            <div className="relative w-full flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Filtrer par nom, soin, téléphone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-card"
              />
            </div>
            <div className="flex items-center gap-1 w-full sm:w-auto">
              {["all", "high", "medium", "low"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriorityFilter(p)}
                  className={cn(
                    "px-2 py-1 rounded text-[11px] font-medium transition-colors",
                    priorityFilter === p
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p === "all" ? "Tous" : p === "high" ? "Haute" : p === "medium" ? "Moy." : "Basse"}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-border -mx-5 -mb-5">
            {isLoadingWaitlist ? (
              <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
            ) : filteredWaitlist.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p className="text-sm">Aucun patient correspondant.</p>
              </div>
            ) : (
              filteredWaitlist.map((entry, idx) => {
                if (!entry) return null;
                const p = (typeof entry.patientId === "object" && entry.patientId ? entry.patientId : null) as IPatient | null;
                const pId = p?._id || p?.id || (typeof entry.patientId === "string" ? entry.patientId : "");
                const pName = p ? `${p.firstName || ""} ${p.lastName || ""}`.trim() : "Patient";
                const initials = p ? `${p.firstName?.[0] || ""}${p.lastName?.[0] || ""}`.toUpperCase() : "PA";

                return (
                  <div
                    key={entry._id || `wl-${idx}`}
                    className="p-4 flex items-start gap-3.5 hover:bg-muted/30 transition-colors"
                  >
                    <PatientAvatar initials={initials} id={pId} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        {pId ? (
                          <Link
                            to="/patients/$id"
                            params={{ id: pId }}
                            className="font-semibold text-sm hover:underline text-foreground"
                          >
                            {pName}
                          </Link>
                        ) : (
                          <span className="font-semibold text-sm text-foreground">{pName}</span>
                        )}
                        <div className="flex items-center gap-1">
                          {p?.phone && (
                            <a
                              href={`https://wa.me/${p.phone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
                              title="Contacter par WhatsApp"
                            >
                              <MessageSquare className="size-3.5" />
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteEntryMutation.mutate(entry._id)}
                            title="Retirer de la liste d'attente"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary inline-flex items-center gap-1">
                          <Stethoscope className="size-3" />
                          {entry.treatment}
                        </span>
                        <PriorityBadge priority={entry.priority} />
                      </div>

                      {entry.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">
                          "{entry.notes}"
                        </p>
                      )}

                      {entry.preferredDays && entry.preferredDays.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {entry.preferredDays.map((d) => (
                            <span
                              key={d}
                              className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                            >
                              {d === "Monday"
                                ? "Lun"
                                : d === "Tuesday"
                                ? "Mar"
                                : d === "Wednesday"
                                ? "Mer"
                                : d === "Thursday"
                                ? "Jeu"
                                : d === "Friday"
                                ? "Ven"
                                : d === "Saturday"
                                ? "Sam"
                                : d}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {waitlistMeta && waitlistMeta.totalPages > 1 && (
            <div className="flex justify-between items-center py-4 border-t border-border mt-4">
              <span className="text-sm text-muted-foreground">
                Page {waitlistMeta.page} sur {waitlistMeta.totalPages} — {waitlistMeta.total} patient{waitlistMeta.total > 1 ? "s" : ""}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={waitlistMeta.page <= 1}
                  onClick={() => setWaitlistPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4 mr-1" /> Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={waitlistMeta.page >= waitlistMeta.totalPages}
                  onClick={() => setWaitlistPage(p => p + 1)}
                >
                  Suivant <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function PatientGroupOfferCard({
  group,
}: {
  group: {
    patientId: string;
    patient: IPatient | null;
    tasks: Array<{ task: IFollowUpTask; sourceAppt: any }>;
  };
}) {
  const queryClient = useQueryClient();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const patient = group.patient;
  const patientName = patient ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim() : "Patient";
  const initials = patient ? `${patient.firstName?.[0] || ""}${patient.lastName?.[0] || ""}`.toUpperCase() : "PA";

  const safeIndex = selectedIndex < group.tasks.length ? selectedIndex : 0;
  const currentSelection = group.tasks[safeIndex];
  const currentTask = currentSelection?.task;
  const currentAppt = currentSelection?.sourceAppt;

  const waitlistEntryObj =
    typeof currentTask?.waitlistEntryId === "object" ? (currentTask?.waitlistEntryId as any) : null;
  const treatmentName = waitlistEntryObj?.treatment || "Soin dentaire";

  const fulfillMutation = useMutation({
    mutationFn: async () => {
      if (!currentTask) throw new Error("Tâche introuvable.");

      const waitlistEntryId =
        typeof currentTask.waitlistEntryId === "string"
          ? currentTask.waitlistEntryId
          : (currentTask.waitlistEntryId as any)?._id || (currentTask.waitlistEntryId as any)?.id;

      if (!waitlistEntryId) {
        throw new Error("Identifiant de la demande introuvable.");
      }

      const taskId = currentTask._id || (currentTask as any).id;
      return api.post(`/waitlist/${waitlistEntryId}/fulfill`, { taskId });
    },
    onSuccess: () => {
      toast.success(`Créneau réservé avec succès pour ${patientName} !`);
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la réservation");
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
    },
  });

  const handleFulfill = () => {
    const slotInfo = currentAppt
      ? `${currentAppt.date} à ${currentAppt.startTime}`
      : "l'horaire sélectionné";
    if (confirm(`Confirmez-vous la réservation pour ${patientName} (${slotInfo}) ?`)) {
      fulfillMutation.mutate();
    }
  };

  const slotDateText = currentAppt?.date ? `le ${currentAppt.date}` : "";
  const slotTimeText = currentAppt?.startTime ? `à ${currentAppt.startTime}` : "";
  const whatsappMessage = `Bonjour ${patient?.firstName || ""} 😊 Une disponibilité s'est libérée au cabinet ${slotDateText} ${slotTimeText} pour votre soin (${treatmentName}). Souhaitez-vous en profiter ?`;
  const whatsappUrl = patient?.phone
    ? `https://wa.me/${patient.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(whatsappMessage)}`
    : "#";

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 relative overflow-hidden space-y-3.5">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />

      {/* Header: Patient Identity */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <PatientAvatar initials={initials} id={group.patientId} size="md" />
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Link
                to="/patients/$id"
                params={{ id: group.patientId }}
                className="font-bold text-foreground text-sm hover:underline"
              >
                {patientName}
              </Link>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                <Sparkles className="size-3" /> IA Recommandé
              </span>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Phone className="size-3" /> {patient?.phone || "Non renseigné"}
              <span className="text-muted-foreground/40">·</span>
              <span className="font-medium text-foreground">{treatmentName}</span>
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-[10px] font-semibold bg-background">
          {group.tasks.length} créneau{group.tasks.length > 1 ? "x" : ""} proposé{group.tasks.length > 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Slots Selector (If multiple, show interactive chips) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
          <span className="flex items-center gap-1">
            <Clock className="size-3 text-primary" />
            {group.tasks.length > 1 ? "Choisir le créneau à attribuer :" : "Créneau disponible :"}
          </span>
          {group.tasks.length > 1 && (
            <span className="text-[11px] text-primary font-semibold">
              Option {safeIndex + 1} sur {group.tasks.length}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {group.tasks.map(({ task, sourceAppt }, idx) => {
            const isSelected = idx === safeIndex;
            const timeLabel = sourceAppt ? `${sourceAppt.startTime} - ${sourceAppt.endTime}` : "Créneau";
            const dateLabel = sourceAppt?.date ? sourceAppt.date : "";

            return (
              <button
                key={task._id || `opt-${idx}`}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={cn(
                  "px-3 py-2 rounded-lg text-xs font-medium border transition-all flex items-center gap-2",
                  isSelected
                    ? "bg-card border-primary text-foreground ring-2 ring-primary/20 shadow-xs font-semibold"
                    : "bg-background/80 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "size-2 rounded-full",
                    isSelected ? "bg-primary" : "bg-muted-foreground/40"
                  )}
                />
                <div className="text-left">
                  <div className="font-mono text-[11px] leading-tight text-primary font-bold">{timeLabel}</div>
                  {dateLabel && <div className="text-[10px] text-muted-foreground leading-tight">{dateLabel}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-border flex flex-wrap items-center justify-end gap-2">
        {patient?.phone && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 px-2.5 py-1.5 rounded-md transition-colors"
          >
            <MessageSquare className="size-3.5" />
            WhatsApp
          </a>
        )}

        {currentTask && <JournalDialog task={currentTask} />}

        <Button
          size="sm"
          onClick={handleFulfill}
          disabled={fulfillMutation.isPending}
          className="gap-1.5 text-xs shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          <CheckCircle2 className="size-3.5" />
          {fulfillMutation.isPending ? "Réservation..." : "Valider ce créneau"}
        </Button>
      </div>
    </div>
  );
}

function JournalDialog({ task }: { task: IFollowUpTask }) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState("phone");
  const [outcome, setOutcome] = useState("spoken_agreed");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/follow-ups/attempts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      toast.success("Tentative enregistrée dans l'historique");
      setOpen(false);
      setNotes("");
    },
    onError: (error: any) => toast.error(error.message || "Erreur"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const waitlistEntryId =
      typeof task.waitlistEntryId === "string"
        ? task.waitlistEntryId
        : (task.waitlistEntryId as any)?._id || (task.waitlistEntryId as any)?.id;

    mutation.mutate({
      taskId: task._id || (task as any).id,
      waitlistEntryId,
      channel,
      outcome,
      notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="text-xs">
          Journal d'échange
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Journal de contact (Liste d'attente)</DialogTitle>
          <DialogDescription>
            Enregistrez le retour du patient suite à la proposition du créneau.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold">Canal de contact</label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: "phone", icon: Phone, label: "Appel" },
                { id: "whatsapp", icon: MessageSquare, label: "WhatsApp" },
                { id: "sms", icon: Smartphone, label: "SMS" },
                { id: "email", icon: Mail, label: "Email" },
                { id: "in_person", icon: User, label: "Sur place" },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChannel(c.id)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-md border text-xs gap-1 transition-colors",
                    channel === c.id
                      ? "bg-primary/10 text-primary border-primary font-semibold"
                      : "hover:bg-muted"
                  )}
                >
                  <c.icon className="size-4" />
                  <span className="text-[10px]">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold">Résultat de l'échange</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            >
              <option value="spoken_agreed">Patient d'accord (Accepte le créneau)</option>
              <option value="no_answer">Pas de réponse</option>
              <option value="left_voicemail">Message vocal laissé</option>
              <option value="spoken_declined">Refus (Indisponible à cet horaire)</option>
              <option value="invalid_number">Numéro injoignable</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold">Notes / Détails (optionnel)</label>
            <Textarea
              placeholder="Ex: Le patient confirme être disponible et viendra 10 min en avance..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Enregistrement..." : "Enregistrer la tentative"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddWaitlistDialog() {
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [treatment, setTreatment] = useState("");
  const [priority, setPriority] = useState("medium");
  const [notes, setNotes] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: patients = [] } = useQuery<IPatient[]>({
    queryKey: ["patients"],
    queryFn: async () => {
      const res = await api.get("/patients?limit=100");
      return Array.isArray(res) ? res : (res.data || []);
    },
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/waitlist", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      toast.success("Patient ajouté à la liste d'attente avec succès !");
      setOpen(false);
      setPatientId("");
      setTreatment("");
      setPriority("medium");
      setNotes("");
      setSelectedDays([]);
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de l'ajout"),
  });

  const toggleDay = (dayId: string) => {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !treatment) {
      toast.error("Veuillez sélectionner un patient et un traitement");
      return;
    }
    mutation.mutate({
      patientId,
      treatment,
      priority,
      notes,
      preferredDays: selectedDays,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-sm">
          <UserPlus className="size-4" />
          Ajouter à la liste
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un patient en liste d'attente</DialogTitle>
          <DialogDescription>
            Inscrivez un patient pour lui attribuer automatiquement les prochains désistements.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Patient *</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
            >
              <option value="">Sélectionner un patient...</option>
              {patients.map((p, idx) => (
                <option key={p._id || p.id || `pat-opt-${idx}`} value={p._id || p.id}>
                  {p.firstName} {p.lastName} ({p.phone || "Sans tél"})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Soin / Traitement souhaité *</label>
            <Input
              required
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
              placeholder="Ex: Détartrage, Urgence, Implant..."
            />
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1 mt-1">
              {POPULAR_TREATMENTS.slice(0, 4).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTreatment(t)}
                  className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Degré de priorité</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="high">Haute (Urgence / Patient très réactif)</option>
              <option value="medium">Moyenne (Standard)</option>
              <option value="low">Basse (Non urgent / Simple contrôle)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Jours de préférence (optionnel)</label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = selectedDays.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDay(d.id)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium border transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary font-semibold"
                        : "bg-background text-muted-foreground border-input hover:bg-muted"
                    )}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Notes / Remarques (optionnel)</label>
            <Textarea
              placeholder="Ex: Disponible à partir de 14h, habite près du cabinet..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Ajout..." : "Inscrire sur la liste"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
