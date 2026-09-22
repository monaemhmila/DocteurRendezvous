import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Calendar,
  LayoutGrid,
  CalendarDays,
  ListFilter,
  Search,
  User,
  Phone,
  Filter,
  Bot,
  MessageCircle,
  TrendingUp,
  Check,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  X,
  Building,
} from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { addDays, formatLongDate, formatShortDate, money, startOfWeek, parseISO } from "@/lib/format";
import { cn } from "@/lib/utils";

// Today's date as ISO YYYY-MM-DD
const pad = (n: number) => String(n).padStart(2, "0");
function isoDay(offset = 0): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const TODAY = isoDay(0);

interface BackendAppointment {
  _id?: string;
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
  source?: "ai" | "manual" | string;
  createdByAi?: boolean;
  value?: number;
}

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda Médical Pro — Dental AI" },
      {
        name: "description",
        content:
          "Agenda professionnel du cabinet avec vues Jour, Semaine, Mois, Liste, filtres avancés et créneaux intelligents.",
      },
    ],
  }),
  component: AgendaPage,
});

// Hourly grid timeline definition (08:00 to 19:30)
const TIMELINE_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"
];

function AgendaPage() {
  const [view, setView] = useState<"day" | "week" | "month" | "list">("day");
  const [day, setDay] = useState(TODAY);
  const [selected, setSelected] = useState<BackendAppointment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [quickBookTime, setQuickBookTime] = useState<string>("09:00");
  const [quickBookDate, setQuickBookDate] = useState<string>(TODAY);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [treatmentFilter, setTreatmentFilter] = useState<string>("all");

  const queryClient = useQueryClient();

  // Queries
  const { data: serverAppointments = [], isLoading: isLoadingAppts, isError } = useQuery<BackendAppointment[]>({
    queryKey: ["appointments"],
    queryFn: () => api.get("/appointments"),
  });

  const { data: serverPatients = [] } = useQuery<any[]>({
    queryKey: ["patients"],
    queryFn: () => api.get("/patients"),
  });

  const { data: tenant } = useQuery<any>({
    queryKey: ["currentTenant"],
    queryFn: () => api.get("/tenants/current"),
  });

  // Services catalog from tenant settings (or default)
  const servicesCatalog: Array<{ name: string; durationMin: number; price?: number }> = useMemo(() => {
    if (tenant?.settings?.services && Array.isArray(tenant.settings.services) && tenant.settings.services.length > 0) {
      return tenant.settings.services;
    }
    return [
      { name: "Consultation & Bilan", durationMin: 20, price: 50 },
      { name: "Détartrage & Polissage", durationMin: 30, price: 80 },
      { name: "Soin de Carie / Obturation", durationMin: 45, price: 90 },
      { name: "Extraction dentaire", durationMin: 45, price: 120 },
      { name: "Pose d'Implant / Chirurgie", durationMin: 60, price: 900 },
      { name: "Contrôle & Urgence rapide", durationMin: 15, price: 35 },
    ];
  }, [tenant]);

  // Mutations
  const createAppointment = useMutation({
    mutationFn: (data: any) => api.post("/appointments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Rendez-vous ajouté avec succès au planning.");
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      if (err.message?.includes("409") || err.message?.includes("Double_Booking")) {
        toast.error("Créneau non disponible (chevauchement avec un autre rendez-vous).");
      } else {
        toast.error(err.message || "Erreur lors de la création du rendez-vous.");
      }
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/appointments/${id}/status`, { status }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["recoveries"] });
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      toast.success(`Statut mis à jour : ${variables.status}`);
      setSelected(null);
    },
    onError: () => toast.error("Erreur lors de la mise à jour du statut."),
  });

  const deleteAppointment = useMutation({
    mutationFn: (id: string) => api.delete(`/appointments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Rendez-vous supprimé.");
      setSelected(null);
    },
    onError: () => toast.error("Erreur lors de la suppression."),
  });

  const getPatient = (id: string) => serverPatients.find((p) => p.id === id || p._id === id);

  // Dynamic treatment list for filter dropdown
  const uniqueTreatments = useMemo(() => {
    const set = new Set<string>();
    serverAppointments.forEach((a) => {
      if (a.treatment) set.add(a.treatment);
    });
    return Array.from(set);
  }, [serverAppointments]);

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return (serverAppointments || []).filter((a) => {
      if (!a) return false;

      // Status filter
      if (statusFilter !== "all" && a.status !== statusFilter) return false;

      // Source filter
      const isAi = a.source === "ai" || a.createdByAi === true;
      if (sourceFilter === "ai" && !isAi) return false;
      if (sourceFilter === "manual" && isAi) return false;

      // Treatment filter
      if (treatmentFilter !== "all" && a.treatment !== treatmentFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const p = getPatient(a.patientId);
        const pName = (p ? `${p.firstName} ${p.lastName}` : (a.patientName || "")).toLowerCase();
        const phone = (p?.phone || "").toLowerCase();
        const treat = (a.treatment || "").toLowerCase();
        const match = pName.includes(q) || phone.includes(q) || treat.includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [serverAppointments, statusFilter, sourceFilter, treatmentFilter, searchQuery, serverPatients]);

  // Day specific appointments
  const dayAppointments = useMemo(() => {
    return filteredAppointments
      .filter((a) => a.date === day)
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  }, [filteredAppointments, day]);

  // Week calculation
  const weekStart = startOfWeek(day);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Month calculation (generate 35-42 days grid)
  const monthGridDays = useMemo(() => {
    const current = parseISO(day);
    const year = current.getFullYear();
    const month = current.getMonth();
    const firstDayOfMonth = new Date(year, month, 1, 12, 0, 0);
    const lastDayOfMonth = new Date(year, month + 1, 0, 12, 0, 0);

    const firstIso = `${year}-${pad(month + 1)}-01`;
    const startGridIso = startOfWeek(firstIso);

    const days: string[] = [];
    let cur = startGridIso;
    for (let i = 0; i < 35; i++) {
      days.push(cur);
      cur = addDays(cur, 1);
    }
    return days;
  }, [day]);

  // Stats for the current view
  const stats = useMemo(() => {
    const list = view === "day"
      ? serverAppointments.filter((a) => a.date === day)
      : view === "week"
      ? serverAppointments.filter((a) => weekDays.includes(a.date))
      : serverAppointments;

    const total = list.length;
    const confirmed = list.filter((a) => a.status === "confirmed" || a.status === "completed").length;
    const scheduled = list.filter((a) => a.status === "scheduled").length;
    const aiCount = list.filter((a) => a.source === "ai" || a.createdByAi === true).length;
    const totalRevenue = list
      .filter((a) => a.status !== "cancelled" && a.status !== "no_show")
      .reduce((sum, a) => sum + (a.value || 60), 0);

    return { total, confirmed, scheduled, aiCount, totalRevenue };
  }, [serverAppointments, day, view, weekDays]);

  // Navigation handlers
  const handlePrev = () => {
    if (view === "day") setDay(addDays(day, -1));
    else if (view === "week") setDay(addDays(day, -7));
    else if (view === "month") {
      const d = parseISO(day);
      d.setMonth(d.getMonth() - 1);
      setDay(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    } else {
      setDay(addDays(day, -7));
    }
  };

  const handleNext = () => {
    if (view === "day") setDay(addDays(day, 1));
    else if (view === "week") setDay(addDays(day, 7));
    else if (view === "month") {
      const d = parseISO(day);
      d.setMonth(d.getMonth() + 1);
      setDay(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    } else {
      setDay(addDays(day, 7));
    }
  };

  const handleOpenQuickBook = (selectedDate: string, selectedTime: string) => {
    setQuickBookDate(selectedDate);
    setQuickBookTime(selectedTime);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const durationMin = parseInt(formData.get("durationMin") as string) || 30;
    const time = formData.get("time") as string;
    const targetDate = formData.get("date") as string;

    const [hours = 9, minutes = 0] = (time || "09:00").split(":").map(Number);
    const totalMinutes = (hours ?? 9) * 60 + (minutes ?? 0) + durationMin;
    const endHours = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
    const endMinutes = (totalMinutes % 60).toString().padStart(2, "0");
    const endTime = `${endHours}:${endMinutes}`;

    const data = {
      patientId: formData.get("patientId"),
      date: targetDate,
      startTime: time,
      endTime: endTime,
      treatment: formData.get("treatment"),
      durationMin: durationMin,
      notes: formData.get("notes"),
      status: "scheduled",
      source: "manual",
    };
    createAppointment.mutate(data);
  };

  // Status color helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "border-l-emerald-500 bg-emerald-50/50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100";
      case "completed":
        return "border-l-blue-500 bg-blue-50/50 text-blue-950 dark:bg-blue-950/30 dark:text-blue-100";
      case "scheduled":
        return "border-l-amber-500 bg-amber-50/40 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100";
      case "cancelled":
        return "border-l-rose-500 bg-rose-50/30 text-rose-950 opacity-60 line-through dark:bg-rose-950/20";
      case "no_show":
        return "border-l-purple-500 bg-purple-50/40 text-purple-950 dark:bg-purple-950/20";
      default:
        return "border-l-primary bg-muted/40 text-foreground";
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-20">
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Agenda & Planning Médical"
        subtitle={
          view === "day"
            ? formatLongDate(day)
            : view === "week"
            ? `Semaine du ${formatShortDate(weekStart)} au ${formatShortDate(addDays(weekStart, 6))}`
            : view === "month"
            ? `Mois de ${parseISO(day).toLocaleString("fr-FR", { month: "long", year: "numeric" })}`
            : "Vue Liste détaillée des consultations"
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Navigator Controls */}
            <div className="flex items-center rounded-lg border bg-card p-0.5 shadow-xs">
              <Button variant="ghost" size="icon" className="size-8" onClick={handlePrev}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-xs font-semibold px-2.5 h-8" onClick={() => setDay(TODAY)}>
                Aujourd'hui
              </Button>
              <Button variant="ghost" size="icon" className="size-8" onClick={handleNext}>
                <ChevronRight className="size-4" />
              </Button>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex rounded-lg border bg-muted/60 p-0.5 shadow-xs">
              {[
                { key: "day", label: "Jour", icon: Clock },
                { key: "week", label: "Semaine", icon: LayoutGrid },
                { key: "month", label: "Mois", icon: CalendarDays },
                { key: "list", label: "Liste", icon: ListFilter },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = view === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setView(tab.key as any)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all",
                      active
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("size-3.5", active && "text-emerald-600")} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* New Appointment Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-9"
                  onClick={() => {
                    setQuickBookDate(day);
                    setQuickBookTime("09:00");
                  }}
                >
                  <Plus className="size-4" />
                  Nouveau Rendez-vous
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Calendar className="size-5 text-emerald-600" />
                      Planifier un Rendez-vous
                    </DialogTitle>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    {/* Patient selector */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Patient</Label>
                      <select
                        name="patientId"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        required
                      >
                        <option value="">Sélectionner un patient existant</option>
                        {serverPatients.map((p) => (
                          <option key={p.id || p._id} value={p.id || p._id}>
                            {p.firstName} {p.lastName} {p.phone ? `(${p.phone})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Date</Label>
                        <Input name="date" type="date" required defaultValue={quickBookDate} className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Heure de début</Label>
                        <Input name="time" type="time" required defaultValue={quickBookTime} className="h-9 text-sm font-semibold" />
                      </div>
                    </div>

                    {/* Treatment preset selector & Duration */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Prestation / Soin</Label>
                        <Input
                          name="treatment"
                          required
                          placeholder="Ex: Consultation, Détartrage..."
                          defaultValue={servicesCatalog[0]?.name || "Consultation générale"}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Durée estimée</Label>
                        <select
                          name="durationMin"
                          defaultValue="30"
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                          <option value="15">15 min (Contrôle rapide)</option>
                          <option value="20">20 min (Consultation)</option>
                          <option value="30">30 min (Détartrage / Soin)</option>
                          <option value="45">45 min (Soin complexe)</option>
                          <option value="60">1h00 (Chirurgie / Implant)</option>
                          <option value="90">1h30 (Chirurgie lourde)</option>
                        </select>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Notes & Consignes particulières</Label>
                      <Input name="notes" placeholder="Ex: Première consultation, phobie du dentiste..." className="h-9 text-sm" />
                    </div>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit" disabled={createAppointment.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      {createAppointment.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
                      Enregistrer le RDV
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* ── KPI STATS RIBBON ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl border bg-card shadow-2xs space-y-1">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Calendar className="size-3.5 text-primary" /> Total Consultations
          </p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>

        <div className="p-3.5 rounded-xl border bg-card shadow-2xs space-y-1">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600" /> Confirmés
          </p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.confirmed}</p>
        </div>

        <div className="p-3.5 rounded-xl border bg-card shadow-2xs space-y-1">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Clock className="size-3.5 text-amber-600" /> En attente
          </p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.scheduled}</p>
        </div>

        <div className="p-3.5 rounded-xl border bg-card shadow-2xs space-y-1">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-emerald-600" /> Pris par IA
          </p>
          <p className="text-2xl font-bold text-emerald-600">{stats.aiCount}</p>
        </div>

        <div className="p-3.5 rounded-xl border bg-card shadow-2xs space-y-1 col-span-2 sm:col-span-1">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-blue-600" /> CA Prévisionnel
          </p>
          <p className="text-2xl font-bold text-foreground">{money(stats.totalRevenue)}</p>
        </div>
      </div>

      {/* ── ADVANCED FILTERS BAR ────────────────────────────────────────────── */}
      <div className="p-3.5 rounded-xl border bg-card shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher patient, téléphone, soin..."
            className="pl-9 h-9 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Filter Badges & Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border text-xs">
            {[
              { key: "all", label: "Tous" },
              { key: "confirmed", label: "Confirmés" },
              { key: "scheduled", label: "Planifiés" },
              { key: "completed", label: "Terminés" },
              { key: "cancelled", label: "Annulés" },
              { key: "no_show", label: "🐰 No-Shows" },
            ].map((st) => (
              <button
                key={st.key}
                onClick={() => setStatusFilter(st.key)}
                className={cn(
                  "px-2 py-1 rounded-md text-[11px] font-medium transition-all",
                  statusFilter === st.key
                    ? "bg-background text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Source Filter (AI vs Manual) */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs shadow-2xs focus:outline-none"
          >
            <option value="all">Toutes sources</option>
            <option value="ai">🤖 Créés par IA</option>
            <option value="manual">👤 Manuel / Secrétariat</option>
          </select>

          {/* Treatment Filter */}
          {uniqueTreatments.length > 0 && (
            <select
              value={treatmentFilter}
              onChange={(e) => setTreatmentFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs shadow-2xs focus:outline-none"
            >
              <option value="all">Tous les soins</option>
              {uniqueTreatments.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}

          {/* Reset Filters */}
          {(statusFilter !== "all" || sourceFilter !== "all" || treatmentFilter !== "all" || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("all");
                setSourceFilter("all");
                setTreatmentFilter("all");
                setSearchQuery("");
              }}
              className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <X className="size-3.5" /> Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {/* ── VIEWS CONTENT ───────────────────────────────────────────────────── */}
      {isError ? (
        <div className="p-12 text-center rounded-xl border bg-card">
          <AlertCircle className="mx-auto size-8 text-destructive mb-2" />
          <p className="text-sm font-semibold text-destructive">Impossible de charger l'agenda.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ["appointments"] })}>
            Réessayer
          </Button>
        </div>
      ) : isLoadingAppts ? (
        <div className="flex h-80 flex-col items-center justify-center gap-3 text-muted-foreground rounded-xl border bg-card">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-xs font-medium">Synchronisation du planning médical...</p>
        </div>
      ) : view === "day" ? (
        /* ══════════════════════════════════════════════════════════════════════
           VUE JOUR : Timeline médicale continue
           ══════════════════════════════════════════════════════════════════════ */
        <div className="rounded-xl border bg-card shadow-2xs overflow-hidden">
          <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-base font-bold text-foreground">{formatLongDate(day)}</span>
              {day === TODAY && (
                <Badge variant="default" className="bg-emerald-600 text-white text-[10px] uppercase font-bold tracking-wider">
                  Aujourd'hui
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {dayAppointments.length} consultation{dayAppointments.length > 1 ? "s" : ""} programmée{dayAppointments.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="divide-y divide-border/60">
            {TIMELINE_SLOTS.map((slotHour) => {
              const matchedAppts = dayAppointments.filter((a) => a.startTime === slotHour);
              const hasAppts = matchedAppts.length > 0;

              return (
                <div
                  key={slotHour}
                  className={cn(
                    "flex items-start gap-4 p-3 transition-colors",
                    !hasAppts && "hover:bg-muted/30 group cursor-pointer"
                  )}
                  onClick={() => {
                    if (!hasAppts) handleOpenQuickBook(day, slotHour);
                  }}
                >
                  {/* Hour Indicator */}
                  <div className="w-16 shrink-0 text-right pt-1">
                    <span className="text-xs font-bold text-muted-foreground font-mono">{slotHour}</span>
                  </div>

                  {/* Slot Container */}
                  <div className="flex-1 space-y-2">
                    {hasAppts ? (
                      matchedAppts.map((appt) => {
                        const p = getPatient(appt.patientId);
                        const pName = p ? `${p.firstName} ${p.lastName}` : appt.patientName || "Patient";
                        const pInitials = p ? `${p.firstName[0] || ""}${p.lastName[0] || ""}`.toUpperCase() : "PT";
                        const isAi = appt.source === "ai" || appt.createdByAi;

                        return (
                          <div
                            key={appt._id || appt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(appt);
                            }}
                            className={cn(
                              "p-3 rounded-xl border border-l-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
                              getStatusColor(appt.status)
                            )}
                          >
                            {/* Patient Info */}
                            <div className="flex items-center gap-3">
                              <PatientAvatar initials={pInitials} id={appt.patientId} size="md" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-foreground">{pName}</span>
                                  {isAi && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                                      <Sparkles className="size-3" /> IA
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                  <span className="font-semibold text-foreground">{appt.treatment}</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1 font-mono">
                                    <Clock className="size-3 text-muted-foreground" />
                                    {appt.startTime} - {appt.endTime} ({appt.durationMin}m)
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Actions & Status */}
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                              {p?.phone && (
                                <span className="text-xs text-muted-foreground hidden md:inline-flex items-center gap-1">
                                  <Phone className="size-3" /> {p.phone}
                                </span>
                              )}
                              <AppointmentStatusBadge status={appt.status} />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex items-center justify-between py-1 text-xs text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity">
                        <span>Créneau libre — Cliquer pour réserver</span>
                        <Plus className="size-4 text-emerald-600 mr-2" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : view === "week" ? (
        /* ══════════════════════════════════════════════════════════════════════
           VUE SEMAINE : Grille synchronisée 7 jours
           ══════════════════════════════════════════════════════════════════════ */
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
          {weekDays.map((d) => {
            const list = filteredAppointments
              .filter((a) => a.date === d)
              .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
            const isCurrentToday = d === TODAY;

            return (
              <div
                key={d}
                className={cn(
                  "rounded-xl border bg-card shadow-2xs flex flex-col min-h-[450px] transition-all",
                  isCurrentToday ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-border"
                )}
              >
                {/* Day Header */}
                <div
                  className={cn(
                    "p-3 border-b text-center rounded-t-xl cursor-pointer hover:bg-muted/40 transition-colors",
                    isCurrentToday ? "bg-emerald-50/80 dark:bg-emerald-950/40 font-bold" : "bg-muted/20"
                  )}
                  onClick={() => {
                    setDay(d);
                    setView("day");
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {parseISO(d).toLocaleDateString("fr-FR", { weekday: "short" })}
                  </p>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {parseISO(d).getDate()}
                  </p>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {list.length} RDV
                  </span>
                </div>

                {/* Day Slots / Appointments */}
                <div className="p-2 flex-1 space-y-2 overflow-y-auto max-h-[500px]">
                  {list.length === 0 ? (
                    <div
                      className="h-full flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-muted/30 rounded-lg group"
                      onClick={() => handleOpenQuickBook(d, "09:00")}
                    >
                      <span className="text-xs text-muted-foreground">Journée libre</span>
                      <Plus className="size-4 text-emerald-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ) : (
                    list.map((appt) => {
                      const p = getPatient(appt.patientId);
                      const pName = p ? `${p.firstName} ${p.lastName}` : appt.patientName || "Patient";
                      const isAi = appt.source === "ai" || appt.createdByAi;

                      return (
                        <div
                          key={appt._id || appt.id}
                          onClick={() => setSelected(appt)}
                          className={cn(
                            "p-2 rounded-lg border border-l-4 text-xs shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-1",
                            getStatusColor(appt.status)
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[11px] font-mono">{appt.startTime}</span>
                            {isAi && <Sparkles className="size-3 text-emerald-600" />}
                          </div>
                          <p className="font-semibold text-foreground truncate">{pName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{appt.treatment}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Quick Add at bottom */}
                <div className="p-2 border-t bg-muted/10 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs h-7 text-muted-foreground hover:text-emerald-700"
                    onClick={() => handleOpenQuickBook(d, "09:00")}
                  >
                    <Plus className="size-3 mr-1" /> Ajouter
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : view === "month" ? (
        /* ══════════════════════════════════════════════════════════════════════
           VUE MOIS : Calendrier mensuel complet et interactif
           ══════════════════════════════════════════════════════════════════════ */
        <div className="rounded-xl border bg-card shadow-2xs overflow-hidden">
          {/* Weekday labels */}
          <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-bold text-muted-foreground py-2.5">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((wd) => (
              <div key={wd}>{wd}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-border/60">
            {monthGridDays.map((mDay) => {
              const list = filteredAppointments.filter((a) => a.date === mDay);
              const isCurrentDay = mDay === TODAY;
              const isCurrentMonth = parseISO(mDay).getMonth() === parseISO(day).getMonth();

              return (
                <div
                  key={mDay}
                  onClick={() => {
                    setDay(mDay);
                    setView("day");
                  }}
                  className={cn(
                    "min-h-[105px] p-2 transition-colors cursor-pointer hover:bg-muted/40 flex flex-col justify-between",
                    !isCurrentMonth && "bg-muted/10 text-muted-foreground opacity-50",
                    isCurrentDay && "bg-emerald-50/40 dark:bg-emerald-950/20 font-bold"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "size-6 flex items-center justify-center rounded-full text-xs font-semibold",
                        isCurrentDay ? "bg-emerald-600 text-white" : "text-foreground"
                      )}
                    >
                      {parseISO(mDay).getDate()}
                    </span>
                    {list.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono font-bold">
                        {list.length}
                      </Badge>
                    )}
                  </div>

                  {/* Mini previews */}
                  <div className="space-y-1 mt-1">
                    {list.slice(0, 2).map((a) => (
                      <div
                        key={a._id || a.id}
                        className="truncate text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted/60 border text-foreground flex items-center gap-1"
                      >
                        <span className="font-mono text-[9px]">{a.startTime}</span>
                        <span className="truncate">{a.treatment}</span>
                      </div>
                    ))}
                    {list.length > 2 && (
                      <p className="text-[9px] text-muted-foreground text-center font-medium">
                        +{list.length - 2} autre{list.length - 2 > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════════
           VUE LISTE : Tableau de données complet avec tri & filtres
           ══════════════════════════════════════════════════════════════════════ */
        <div className="rounded-xl border bg-card shadow-2xs overflow-hidden">
          <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">
              Toutes les consultations enregistrées ({filteredAppointments.length})
            </h3>
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState title="Aucun rendez-vous trouvé" description="Aucune consultation ne correspond à vos filtres actuels." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3">Date & Heure</th>
                    <th className="p-3">Patient</th>
                    <th className="p-3">Téléphone</th>
                    <th className="p-3">Prestation / Soin</th>
                    <th className="p-3">Durée</th>
                    <th className="p-3">Source</th>
                    <th className="p-3">Statut</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredAppointments.map((a) => {
                    const p = getPatient(a.patientId);
                    const pName = p ? `${p.firstName} ${p.lastName}` : a.patientName || "Patient";
                    const isAi = a.source === "ai" || a.createdByAi;

                    return (
                      <tr key={a._id || a.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-semibold text-foreground whitespace-nowrap">
                          {formatShortDate(a.date)} à <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">{a.startTime}</span>
                        </td>
                        <td className="p-3 font-bold text-foreground whitespace-nowrap">
                          {pName}
                        </td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap font-mono">
                          {p?.phone || "—"}
                        </td>
                        <td className="p-3 font-medium text-foreground whitespace-nowrap">
                          {a.treatment}
                        </td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap font-mono">
                          {a.durationMin} min
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {isAi ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1">
                              <Sparkles className="size-3" /> IA
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Manuel
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <AppointmentStatusBadge status={a.status} />
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelected(a)}
                            className="h-7 text-xs gap-1"
                          >
                            <Eye className="size-3.5" /> Gérer
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── APPOINTMENT DETAILS DIALOG ───────────────────────────────────────── */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          {selected && (() => {
            const sp = getPatient(selected.patientId);
            const spName = sp ? `${sp.firstName} ${sp.lastName}` : selected.patientName || "Patient inconnu";
            const spInitials = sp ? `${sp.firstName[0] || ""}${sp.lastName[0] || ""}`.toUpperCase() : "PT";
            const isUpdating = updateStatus.isPending;
            const cleanPhone = sp?.phone?.replace(/[^0-9]/g, "") || "";
            const waDirectUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between gap-2">
                    <DialogTitle className="text-lg font-bold">{selected.treatment}</DialogTitle>
                    <AppointmentStatusBadge status={selected.status} />
                  </div>
                </DialogHeader>

                <div className="space-y-5 py-2">
                  {/* Patient Card */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
                    <div className="flex items-center gap-3">
                      <PatientAvatar initials={spInitials} id={selected.patientId} size="md" />
                      <div>
                        <Link
                          to="/patients/$id"
                          params={{ id: selected.patientId || "0" }}
                          className="text-sm font-bold hover:underline hover:text-emerald-600"
                          onClick={() => setSelected(null)}
                        >
                          {spName}
                        </Link>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {sp?.phone || "Numéro non renseigné"}
                        </p>
                      </div>
                    </div>

                    {waDirectUrl && (
                      <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-emerald-700 border-emerald-300">
                        <a href={waDirectUrl} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="size-3.5" /> WhatsApp
                        </a>
                      </Button>
                    )}
                  </div>

                  {/* Consultation Time Details */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border bg-card text-xs">
                    <div className="space-y-1">
                      <p className="text-muted-foreground font-medium">Date prévue</p>
                      <p className="font-bold text-foreground text-sm">{formatLongDate(selected.date)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground font-medium">Plage horaire</p>
                      <p className="font-bold text-foreground text-sm font-mono">
                        {selected.startTime} ➔ {selected.endTime} ({selected.durationMin}m)
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground font-medium">Source</p>
                      <p className="font-semibold text-foreground">
                        {selected.source === "ai" || selected.createdByAi ? "🤖 Assistant IA" : "👤 Manuel"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground font-medium">Valeur estimée</p>
                      <p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                        {money(selected.value || 60)}
                      </p>
                    </div>
                  </div>

                  {/* Notes */}
                  {selected.notes && (
                    <div className="p-3 rounded-lg bg-muted/40 border text-xs space-y-1">
                      <span className="font-semibold text-foreground">Notes praticien :</span>
                      <p className="text-muted-foreground">{selected.notes}</p>
                    </div>
                  )}

                  {/* Status Action Buttons */}
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs font-bold">Mettre à jour le statut</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={selected.status === "confirmed" ? "default" : "outline"}
                        disabled={isUpdating || selected.status === "confirmed"}
                        onClick={() => updateStatus.mutate({ id: selected._id || selected.id, status: "confirmed" })}
                        className="w-full text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="mr-1.5 size-3.5" /> Confirmer
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant={selected.status === "completed" ? "default" : "outline"}
                        disabled={isUpdating || selected.status === "completed"}
                        onClick={() => updateStatus.mutate({ id: selected._id || selected.id, status: "completed" })}
                        className="w-full text-xs h-8"
                      >
                        <Check className="mr-1.5 size-3.5 text-blue-500" /> Terminé
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant={selected.status === "cancelled" ? "default" : "outline"}
                        disabled={isUpdating || selected.status === "cancelled"}
                        onClick={() => updateStatus.mutate({ id: selected._id || selected.id, status: "cancelled" })}
                        className="w-full text-xs h-8"
                      >
                        <XCircle className="mr-1.5 size-3.5 text-rose-500" /> Annuler
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant={selected.status === "no_show" ? "destructive" : "outline"}
                        disabled={isUpdating || selected.status === "no_show"}
                        onClick={() => updateStatus.mutate({ id: selected._id || selected.id, status: "no_show" })}
                        className="w-full text-xs h-8"
                      >
                        <AlertCircle className="mr-1.5 size-3.5" /> No-Show
                      </Button>
                    </div>
                  </div>
                </div>

                <DialogFooter className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm("Supprimer définitivement ce rendez-vous ?")) {
                        deleteAppointment.mutate(selected._id || selected.id);
                      }
                    }}
                  >
                    Supprimer
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
                      Fermer
                    </Button>
                  </div>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
