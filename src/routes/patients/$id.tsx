import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { IPatient, IAppointment, IRecovery, IWaitlistEntry, IFollowUpTask } from "@/types/api";
import {
  PageHeader,
  PatientAvatar,
  PatientStatusBadge,
  PriorityBadge,
  SectionCard,
  EmptyState,
} from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  ChevronLeft,
  Calendar,
  Clock,
  Phone,
  MessageSquare,
  Mail,
  Edit3,
  Trash2,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Zap,
  User,
  Activity,
  DollarSign,
  TrendingUp,
  FileText,
  Stethoscope,
  HeartPulse,
  History,
  MoreVertical,
  CalendarPlus,
  ListOrdered,
  Send,
  Tag,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeDay } from "@/lib/format";

export const Route = createFileRoute("/patients/$id")({
  component: PatientProfilePage,
});

const POPULAR_TREATMENTS = [
  "Consultation",
  "Détartrage",
  "Implant dentaire",
  "Composite / Soin carie",
  "Couronne céramique",
  "Traitement de canal",
  "Blanchiment",
  "Urgence",
  "Contrôle annuel",
];

const MEDICAL_ALERTS_PRESETS = [
  "Allergie Pénicilline",
  "Allergie Latex",
  "Allergie Anesthésique",
  "Diabète",
  "Hypertension",
  "Sous Anticoagulant",
  "Pathologie Cardiaque",
  "Grossesse",
  "Phobie du dentiste",
  "Reflexe nauséeux fort",
];

const DAYS_OF_WEEK = [
  { id: "Monday", label: "Lundi" },
  { id: "Tuesday", label: "Mardi" },
  { id: "Wednesday", label: "Mercredi" },
  { id: "Thursday", label: "Jeudi" },
  { id: "Friday", label: "Vendredi" },
  { id: "Saturday", label: "Samedi" },
];

function PatientProfilePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Active sub-filters & state
  const [activeTab, setActiveTab] = useState("appointments");
  const [appointmentFilter, setAppointmentFilter] = useState<string>("all");
  
  // Dialog Open States
  const [isBookApptOpen, setIsBookApptOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAddWaitlistOpen, setIsAddWaitlistOpen] = useState(false);
  const [isCreateRecoveryOpen, setIsCreateRecoveryOpen] = useState(false);
  const [isContactJournalOpen, setIsContactJournalOpen] = useState(false);
  const [selectedRecoveryForJournal, setSelectedRecoveryForJournal] = useState<IRecovery | null>(null);

  // Live note draft state
  const [clinicalNotes, setClinicalNotes] = useState<string | null>(null);

  // Queries
  const {
    data: p,
    isLoading: isLoadingPatient,
    isError: isErrorPatient,
  } = useQuery<IPatient>({
    queryKey: ["patients", id],
    queryFn: () => api.get(`/patients/${id}`),
  });

  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const [appointmentsLimit, setAppointmentsLimit] = useState(20);

  const { data: appointmentsResponse, isLoading: isLoadingAppointments } = useQuery<{ data: IAppointment[], meta: any }>({
    queryKey: ["appointments", "patient", id, appointmentsPage, appointmentsLimit],
    queryFn: async () => {
      const res = await api.get(`/appointments?patientId=${id}&page=${appointmentsPage}&limit=${appointmentsLimit}`);
      return res as { data: IAppointment[], meta: any };
    },
  });

  const appointments = appointmentsResponse?.data || [];
  const appointmentsMeta = appointmentsResponse?.meta;

  const { data: opportunities = [], isLoading: isLoadingRecovery } = useQuery<IRecovery[]>({
    queryKey: ["recovery", "patient", id],
    queryFn: () => api.get(`/recovery?patientId=${id}`),
  });

  const { data: waitlistResponse, isLoading: isLoadingWaitlist } = useQuery<{ data: IWaitlistEntry[], meta: any }>({
    queryKey: ["waitlist", "patient", id],
    queryFn: async () => {
      const res = await api.get(`/waitlist?patientId=${id}&limit=100`);
      return (res.data ? res : { data: res, meta: {} }) as { data: IWaitlistEntry[], meta: any };
    },
  });

  const waitlist = waitlistResponse?.data || [];

  // Mutations
  const updatePatientMutation = useMutation({
    mutationFn: (data: Partial<IPatient>) => api.put(`/patients/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients", id] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Dossier patient mis à jour avec succès !");
      setIsEditProfileOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de la mise à jour"),
  });

  const saveNotesMutation = useMutation({
    mutationFn: (notes: string) => api.put(`/patients/${id}`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients", id] });
      toast.success("Notes cliniques enregistrées.");
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de l'enregistrement des notes"),
  });

  const deletePatientMutation = useMutation({
    mutationFn: () => api.delete(`/patients/${id}`),
    onSuccess: () => {
      toast.success("Patient supprimé avec succès.");
      navigate({ to: "/patients" });
    },
    onError: (err: any) => toast.error(err.message || "Impossible de supprimer ce patient"),
  });

  const updateApptStatusMutation = useMutation({
    mutationFn: ({ apptId, status }: { apptId: string; status: string }) =>
      api.patch(`/appointments/${apptId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments", "patient", id] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["recovery"] });
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      queryClient.invalidateQueries({ queryKey: ["patients", id] });
      toast.success("Statut du rendez-vous mis à jour !");
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de la mise à jour"),
  });

  const deleteWaitlistMutation = useMutation({
    mutationFn: (entryId: string) => api.delete(`/waitlist/${entryId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      queryClient.invalidateQueries({ queryKey: ["waitlist", "patient", id] });
      toast.success("Demande retirée de la liste d'attente.");
    },
    onError: (err: any) => toast.error(err.message || "Erreur"),
  });

  if (isLoadingPatient) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-6 pb-20 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-md" />
        <div className="h-44 bg-card border border-border rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-card border border-border rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-card border border-border rounded-2xl" />
      </div>
    );
  }

  if (isErrorPatient || !p) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <div className="size-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <AlertTriangle className="size-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Dossier Patient Introuvable</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Le patient demandé n'existe pas ou vous n'avez pas l'autorisation d'y accéder.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/patients">
            <ChevronLeft className="mr-2 size-4" />
            Retour à la liste des patients
          </Link>
        </Button>
      </div>
    );
  }

  const patientInitials = `${p.firstName?.[0] || ""}${p.lastName?.[0] || ""}`.toUpperCase() || "PA";
  const patientFullName = `${p.firstName} ${p.lastName}`;
  const patientDossierNum = p._id ? `#PAT-${p._id.slice(-6).toUpperCase()}` : "#PAT-000000";

  // Calculate age if dateOfBirth is present
  const calculateAge = (dobString?: string) => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return null;
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };
  const patientAge = calculateAge(p.dateOfBirth);

  // Derived metrics
  const totalVisits = appointments.filter((a) => a.status === "completed").length || p.metrics?.totalVisits || 0;
  const noShows = appointments.filter((a) => a.status === "no_show").length || p.metrics?.noShowCount || 0;
  const cancelledCount = appointments.filter((a) => a.status === "cancelled").length;
  const totalBookedAppointments = appointmentsMeta?.total || 0;
  
  const attendanceRate = totalBookedAppointments > 0
    ? Math.round(((totalVisits + appointments.filter((a) => a.status === "scheduled" || a.status === "confirmed").length) / totalBookedAppointments) * 100)
    : 100;

  // Next upcoming appointment
  const upcomingAppointments = appointments
    .filter((a) => a.status === "scheduled" || a.status === "confirmed")
    .sort((a, b) => new Date(`${a.date}T${a.startTime || "00:00"}`).getTime() - new Date(`${b.date}T${b.startTime || "00:00"}`).getTime());
  const nextAppt = upcomingAppointments[0];

  // Last completed visit
  const pastAppointments = appointments
    .filter((a) => a.status === "completed")
    .sort((a, b) => new Date(`${b.date}T${b.startTime || "00:00"}`).getTime() - new Date(`${a.date}T${a.startTime || "00:00"}`).getTime());
  const lastCompletedAppt = pastAppointments[0];

  // Active AI Opportunities
  const activeOpportunities = opportunities.filter((o) => !["visited", "dismissed"].includes(o.status));
  const totalEstimatedRecovery = activeOpportunities.reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0);

  // WhatsApp Pre-composed URL
  const cleanPhone = p.phone ? p.phone.replace(/[^0-9]/g, "") : "";
  const whatsappMsg = `Bonjour ${p.firstName}, c'est le cabinet dentaire. Nous vous contactons concernant votre suivi de soins.`;
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMsg)}` : "#";

  // Filtered appointments for chronology tab
  const filteredAppointments = appointments.filter((a) => {
    if (appointmentFilter === "upcoming") return a.status === "scheduled" || a.status === "confirmed";
    if (appointmentFilter === "completed") return a.status === "completed";
    if (appointmentFilter === "cancelled") return a.status === "cancelled" || a.status === "no_show";
    return true;
  }).sort((a, b) => new Date(`${b.date}T${b.startTime || "00:00"}`).getTime() - new Date(`${a.date}T${a.startTime || "00:00"}`).getTime());

  // Handle toggle medical alert tag
  const handleToggleTag = (tag: string) => {
    const currentTags = p.tags || [];
    const nextTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    updatePatientMutation.mutate({ tags: nextTags });
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-24 px-4 sm:px-6">
      {/* ── Breadcrumb & Quick Nav ────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          to="/patients"
          className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="mr-1 size-4" />
          Retour au répertoire
        </Link>
        <span className="font-mono text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-md border border-border">
          {patientDossierNum}
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ── LEFT COLUMN: Patient Sidebar ──────────────────────── */}
        <div className="w-full lg:w-[360px] shrink-0 space-y-6">
          {/* Profile Card */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="h-24 bg-gradient-to-br from-primary/10 to-primary/5 relative">
              <div className="absolute -bottom-8 left-6">
                <div className="relative">
                  <PatientAvatar initials={patientInitials} id={p._id} size="lg" className="size-20 text-xl ring-4 ring-card shadow-sm" />
                  <span
                    className={cn(
                      "absolute bottom-0 right-0 size-4 rounded-full border-2 border-card ring-1 ring-border",
                      p.status === "active" ? "bg-emerald-500" : p.status === "at_risk" ? "bg-amber-500" : p.status === "inactive" ? "bg-rose-500" : "bg-blue-500"
                    )}
                  />
                </div>
              </div>
            </div>
            
            <div className="pt-12 pb-6 px-6 space-y-5">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">{patientFullName}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <PatientStatusBadge status={p.status} />
                  {p.gender && <Badge variant="outline" className="text-[10px] capitalize">{p.gender === "male" ? "Homme" : p.gender === "female" ? "Femme" : p.gender}</Badge>}
                  {patientAge !== null && <Badge variant="secondary" className="text-[10px]">{patientAge} ans</Badge>}
                  {p.language && <Badge variant="outline" className="text-[10px] uppercase font-mono">{p.language}</Badge>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setIsBookApptOpen(true)} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-sm text-xs">
                  <CalendarPlus className="size-3.5 mr-1.5" />
                  Prendre RDV
                </Button>
                {cleanPhone && (
                  <Button size="sm" variant="outline" className="size-9 p-0 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50" asChild>
                    <a href={whatsappUrl} target="_blank" rel="noreferrer" title="WhatsApp"><MessageSquare className="size-4" /></a>
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="size-9 p-0"><MoreVertical className="size-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={() => setIsEditProfileOpen(true)} className="gap-2 text-xs"><Edit3 className="size-3.5 text-muted-foreground" />Modifier le profil</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsAddWaitlistOpen(true)} className="gap-2 text-xs"><ListOrdered className="size-3.5 text-primary" />Inscrire en liste d'attente</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsCreateRecoveryOpen(true)} className="gap-2 text-xs"><Zap className="size-3.5 text-amber-600" />Créer une opportunité</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { if (confirm("Supprimer ?")) deletePatientMutation.mutate(); }} className="gap-2 text-xs text-destructive"><Trash2 className="size-3.5" />Supprimer</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Tags & Badges */}
              {(p.tags && p.tags.length > 0) || (p.metrics?.noShowCount ?? 0) > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {(p.metrics?.noShowCount ?? 0) > 0 && (
                    <Badge variant="destructive" className="text-[10px] cursor-pointer" onClick={() => { if (confirm("Reset No-Show?")) updatePatientMutation.mutate({ metrics: { ...p.metrics, noShowCount: 0 } as any }); }}>
                      🐇 {p.metrics!.noShowCount} No-Show
                    </Badge>
                  )}
                  {p.tags?.map((t) => (
                    <span key={t} className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold", t.toLowerCase().includes("allergie") ? "bg-rose-500/10 text-rose-600 border border-rose-500/20" : "bg-muted text-muted-foreground")}>
                      <Tag className="size-2.5" /> {t}
                    </span>
                  ))}
                </div>
              ) : null}

              <Separator />

              {/* Contact Info */}
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 text-muted-foreground">
                  <Phone className="size-4 shrink-0 mt-0.5" />
                  {p.phone ? <a href={`tel:${p.phone}`} className="font-medium text-foreground hover:text-primary transition-colors">{p.phone}</a> : <span className="italic text-xs">Non renseigné</span>}
                </div>
                <div className="flex items-start gap-3 text-muted-foreground">
                  <Mail className="size-4 shrink-0 mt-0.5" />
                  {p.email ? <a href={`mailto:${p.email}`} className="font-medium text-foreground hover:text-primary transition-colors truncate">{p.email}</a> : <span className="italic text-xs">Non renseigné</span>}
                </div>
                <div className="flex items-start gap-3 text-muted-foreground">
                  <Calendar className="size-4 shrink-0 mt-0.5" />
                  <span className="text-xs">Inscrit le {p.createdAt ? new Date(p.createdAt).toLocaleDateString("fr-FR") : "—"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3">
             <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-center items-center text-center">
               <Stethoscope className="size-5 text-primary mb-2" />
               <p className="text-2xl font-bold text-foreground">{totalVisits}</p>
               <p className="text-[10px] text-muted-foreground uppercase font-semibold mt-1 tracking-wider">Visites</p>
             </div>
             <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-center items-center text-center">
               <Activity className={cn("size-5 mb-2", attendanceRate >= 80 ? "text-emerald-500" : "text-amber-500")} />
               <p className={cn("text-2xl font-bold", attendanceRate >= 80 ? "text-emerald-600" : "text-amber-600")}>{attendanceRate}%</p>
               <p className="text-[10px] text-muted-foreground uppercase font-semibold mt-1 tracking-wider">Assiduité</p>
             </div>
          </div>

          {/* Next Appt Card */}
          <div className="rounded-xl border border-border bg-primary/5 p-5 shadow-sm">
             <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider mb-3">
                <Calendar className="size-3.5" /> Prochain Rendez-vous
             </div>
             {nextAppt ? (
               <div>
                 <p className="text-lg font-bold text-foreground">{relativeDay(nextAppt.date)} à {nextAppt.startTime}</p>
                 <p className="text-sm text-muted-foreground mt-0.5 truncate">{nextAppt.treatment}</p>
               </div>
             ) : (
               <div className="flex items-center justify-between">
                 <p className="text-sm text-muted-foreground">Aucun RDV prévu</p>
                 <Button size="sm" variant="link" onClick={() => setIsBookApptOpen(true)} className="p-0 h-auto text-xs font-semibold"><Plus className="size-3 mr-1"/> Ajouter</Button>
               </div>
             )}
          </div>
          
          {/* AI Opportunity Card */}
          <div className="rounded-xl border border-border bg-amber-50 p-5 shadow-sm dark:bg-amber-950/20">
             <div className="flex items-center gap-2 text-amber-600 font-semibold text-xs uppercase tracking-wider mb-3">
                <Sparkles className="size-3.5" /> Opportunité IA
             </div>
             <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-500">{totalEstimatedRecovery} DT</p>
                {activeOpportunities.length > 0 && <span className="text-xs font-semibold text-amber-600">({activeOpportunities.length} en cours)</span>}
             </div>
             <p className="text-xs text-amber-600/80 mt-1">
                {waitlist.length > 0 ? `${waitlist.length} demande(s) en liste d'attente` : "Suivi automatisé actif"}
             </p>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Main Content ────────────────────────── */}
        <div className="flex-1 min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none p-0 h-auto gap-6 overflow-x-auto">
              <TabsTrigger value="appointments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground px-1 py-3 text-sm font-medium data-[state=active]:shadow-none transition-none">
                <Calendar className="size-4 mr-2" /> Historique ({appointmentsMeta?.total || 0})
              </TabsTrigger>
              <TabsTrigger value="medical" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground px-1 py-3 text-sm font-medium data-[state=active]:shadow-none transition-none">
                <HeartPulse className="size-4 mr-2" /> Dossier & Notes
              </TabsTrigger>
              <TabsTrigger value="recovery" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground px-1 py-3 text-sm font-medium data-[state=active]:shadow-none transition-none">
                <Zap className="size-4 mr-2" /> IA & Relances ({opportunities.length})
              </TabsTrigger>
              <TabsTrigger value="waitlist" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground px-1 py-3 text-sm font-medium data-[state=active]:shadow-none transition-none">
                <ListOrdered className="size-4 mr-2" /> Attente ({waitlist.length})
              </TabsTrigger>
            </TabsList>

        {/* ── TAB 1: Appointments Timeline ────────────────────── */}
        <TabsContent value="appointments" className="space-y-4 m-0">
          <SectionCard
            title="Historique & Planning des Rendez-vous"
            description="Consultez l'ensemble des rendez-vous passés, actuels et modifiez leur statut en un clic."
            actions={
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg text-[11px]">
                  {[
                    { id: "all", label: `Tous (${appointmentsMeta?.total || 0})` },
                    { id: "upcoming", label: `À venir (${upcomingAppointments.length})` },
                    { id: "completed", label: `Effectués (${pastAppointments.length})` },
                    { id: "cancelled", label: `Annulés / Absents (${cancelledCount + noShows})` },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setAppointmentFilter(filter.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-md font-medium transition-all",
                        appointmentFilter === filter.id
                          ? "bg-card text-foreground font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                <Button size="sm" onClick={() => setIsBookApptOpen(true)} className="gap-1.5 text-xs shadow-sm">
                  <Plus className="size-3.5" />
                  Nouveau RDV
                </Button>
              </div>
            }
          >
            {filteredAppointments.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Aucun rendez-vous dans cette vue"
                description="Aucun rendez-vous ne correspond au filtre sélectionné pour ce patient."
                actions={
                  <Button size="sm" onClick={() => setIsBookApptOpen(true)} className="gap-1.5 text-xs">
                    <CalendarPlus className="size-3.5" />
                    Programmer un rendez-vous
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-border -mx-5 -mb-5">
                {filteredAppointments.map((appt) => {
                  const isUpcoming = appt.status === "scheduled" || appt.status === "confirmed";
                  const isCompleted = appt.status === "completed";
                  const isCancelled = appt.status === "cancelled";
                  const isNoShow = appt.status === "no_show";

                  return (
                    <div
                      key={appt._id}
                      className={cn(
                        "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-muted/30",
                        isUpcoming && "bg-primary/5 border-l-4 border-l-primary"
                      )}
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={cn(
                            "size-10 rounded-xl flex items-center justify-center shrink-0 font-mono text-xs font-bold shadow-xs",
                            isCompleted
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : isUpcoming
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : isNoShow
                              ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {appt.startTime || "RDV"}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">
                              {appt.treatment || "Consultation standard"}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-semibold uppercase tracking-wider",
                                isCompleted && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                                appt.status === "confirmed" && "bg-blue-500/10 text-blue-600 border-blue-500/30",
                                appt.status === "scheduled" && "bg-amber-500/10 text-amber-600 border-amber-500/30",
                                isCancelled && "bg-muted text-muted-foreground line-through",
                                isNoShow && "bg-rose-500/10 text-rose-600 border-rose-500/30"
                              )}
                            >
                              {appt.status === "completed"
                                ? "Effectué"
                                : appt.status === "confirmed"
                                ? "Confirmé"
                                : appt.status === "scheduled"
                                ? "Prévu"
                                : appt.status === "cancelled"
                                ? "Annulé"
                                : "Absence (No-Show)"}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <Calendar className="size-3 text-primary" />
                              {relativeDay(appt.date)} ({appt.date})
                            </span>
                            {appt.startTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="size-3" />
                                {appt.startTime} {appt.endTime ? `- ${appt.endTime}` : ""} ({appt.durationMin || 30} min)
                              </span>
                            )}
                          </div>

                          {appt.notes && (
                            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md mt-1.5 italic">
                              "{appt.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status Quick Action Controls */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        {isUpcoming && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950"
                              onClick={() => updateApptStatusMutation.mutate({ apptId: appt._id, status: "completed" })}
                              disabled={updateApptStatusMutation.isPending}
                            >
                              <CheckCircle2 className="size-3.5 mr-1" />
                              Honoré
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950"
                              onClick={() => updateApptStatusMutation.mutate({ apptId: appt._id, status: "no_show" })}
                              disabled={updateApptStatusMutation.isPending}
                            >
                              <XCircle className="size-3.5 mr-1" />
                              No-Show
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-8 text-muted-foreground hover:text-destructive"
                              onClick={() => updateApptStatusMutation.mutate({ apptId: appt._id, status: "cancelled" })}
                              disabled={updateApptStatusMutation.isPending}
                            >
                              Annuler
                            </Button>
                          </>
                        )}

                        {isCompleted && (
                          <span className="text-xs text-emerald-600 font-semibold inline-flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-md">
                            <CheckCircle2 className="size-3.5" />
                            Soin terminé
                          </span>
                        )}

                        {(isCancelled || isNoShow) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8"
                            onClick={() => setIsBookApptOpen(true)}
                          >
                            Reprogrammer
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {appointmentsMeta && appointmentsMeta.totalPages > 1 && (
              <div className="flex justify-between items-center py-4 border-t border-border mt-4">
                <span className="text-sm text-muted-foreground">
                  Page {appointmentsMeta.page} sur {appointmentsMeta.totalPages}
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={appointmentsMeta.page <= 1}
                    onClick={() => setAppointmentsPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-4 mr-1" /> Précédent
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={appointmentsMeta.page >= appointmentsMeta.totalPages}
                    onClick={() => setAppointmentsPage(p => p + 1)}
                  >
                    Suivant <ChevronRight className="size-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* ── TAB 2: Medical Record & Clinical Notes ─────────── */}
        <TabsContent value="medical" className="space-y-6 m-0">
          <div className="grid gap-6 xl:grid-cols-3">
            {/* Left: Main Clinical Notes */}
            <div className="xl:col-span-2 space-y-6">
              <SectionCard
                title="Dossier Clinique & Observations"
                description="Notes de consultation, historique des traitements et plan de soins."
              >
                <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex flex-col">
                  {/* Faux Editor Toolbar for a Pro feel */}
                  <div className="border-b border-border bg-muted/30 p-2 flex items-center gap-2">
                     <span className="text-xs font-semibold text-muted-foreground px-2">Observation libre</span>
                     <div className="h-4 w-px bg-border mx-1" />
                     <button className="p-1.5 text-muted-foreground hover:bg-muted rounded text-[10px] uppercase font-bold tracking-wider" type="button" onClick={() => setClinicalNotes((clinicalNotes ?? p.notes ?? '') + '\n[Examen initial] ')}>Examen</button>
                     <button className="p-1.5 text-muted-foreground hover:bg-muted rounded text-[10px] uppercase font-bold tracking-wider" type="button" onClick={() => setClinicalNotes((clinicalNotes ?? p.notes ?? '') + '\n[Plan de traitement] ')}>Plan</button>
                     <button className="p-1.5 text-muted-foreground hover:bg-muted rounded text-[10px] uppercase font-bold tracking-wider" type="button" onClick={() => setClinicalNotes((clinicalNotes ?? p.notes ?? '') + '\n[Devis] ')}>Devis</button>
                  </div>
                  
                  <Textarea
                    placeholder="Saisissez ici les notes cliniques du patient..."
                    value={clinicalNotes !== null ? clinicalNotes : p.notes || ""}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    className="border-0 focus-visible:ring-0 resize-y min-h-[350px] p-5 font-sans text-sm leading-relaxed rounded-none bg-transparent"
                  />
                  
                  <div className="border-t border-border bg-muted/10 p-3 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="size-3" />
                      Dernière modification : {p.updatedAt ? new Date(p.updatedAt).toLocaleString("fr-FR") : "—"}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => saveNotesMutation.mutate(clinicalNotes !== null ? clinicalNotes : p.notes || "")}
                      disabled={saveNotesMutation.isPending}
                      className="gap-1.5 text-xs h-8 bg-primary hover:bg-primary/90 shadow-sm"
                    >
                      <CheckCircle2 className="size-3.5" />
                      {saveNotesMutation.isPending ? "Sauvegarde..." : "Enregistrer le dossier"}
                    </Button>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Right: Medical Alerts & Info */}
            <div className="space-y-6">
              <SectionCard
                title="Alertes Médicales"
                description="Antécédents et précautions."
                bodyClassName="bg-amber-50/30 dark:bg-amber-950/10 border-amber-500/20"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {MEDICAL_ALERTS_PRESETS.map((preset) => {
                      const isSelected = (p.tags || []).includes(preset);
                      const isAllergy = preset.toLowerCase().includes("allergie") || preset.toLowerCase().includes("anticoagulant");
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleToggleTag(preset)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-all shadow-sm",
                            isSelected
                              ? isAllergy
                                ? "bg-rose-500 text-white border-rose-600 font-semibold ring-2 ring-rose-500/30"
                                : "bg-primary text-primary-foreground border-primary font-semibold ring-2 ring-primary/30"
                              : "bg-background text-muted-foreground border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                          )}
                        >
                          {isSelected ? <CheckCircle2 className="size-3" /> : <ShieldAlert className="size-3 opacity-50" />}
                          {preset}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Parcours de soins">
                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-card p-3 shadow-sm flex items-start gap-3">
                     <div className="bg-primary/10 text-primary p-2 rounded-lg">
                        <History className="size-4" />
                     </div>
                     <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Première visite</p>
                        <p className="text-sm font-bold text-foreground mt-0.5">
                           {pastAppointments.length > 0 ? pastAppointments[pastAppointments.length - 1].date : "Aucune visite"}
                        </p>
                     </div>
                  </div>
                  
                  <div className="rounded-xl border border-border bg-card p-3 shadow-sm flex items-start gap-3">
                     <div className="bg-emerald-500/10 text-emerald-600 p-2 rounded-lg">
                        <Stethoscope className="size-4" />
                     </div>
                     <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Soins effectués</p>
                        <p className="text-sm font-bold text-foreground mt-0.5">
                           {totalVisits} actes terminés
                        </p>
                     </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-3 shadow-sm flex items-start gap-3">
                     <div className="bg-blue-500/10 text-blue-600 p-2 rounded-lg">
                        <FileText className="size-4" />
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Motif principal</p>
                        <p className="text-sm font-bold text-foreground mt-0.5 truncate" title={appointments[0]?.treatment || "Consultation"}>
                           {appointments[0]?.treatment || "Consultation"}
                        </p>
                     </div>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 3: AI Recovery & Relances ───────────────────── */}
        <TabsContent value="recovery" className="space-y-4 m-0">
          <SectionCard
            title="Opportunités de Récupération & Relances Intelligentes"
            description="L'IA identifie les désistements, retards de contrôle annuel ou patients inactifs et déclenche les scénarios de réengagement."
            actions={
              <Button size="sm" onClick={() => setIsCreateRecoveryOpen(true)} className="gap-1.5 text-xs">
                <Plus className="size-3.5" />
                Nouvelle opportunité
              </Button>
            }
          >
            {opportunities.length === 0 ? (
              <EmptyState
                icon={Zap}
                title="Aucune opportunité de relance"
                description="Ce patient est parfaitement à jour dans ses soins ou aucun désistement n'a été constaté."
                actions={
                  <Button size="sm" onClick={() => setIsCreateRecoveryOpen(true)} className="gap-1.5 text-xs">
                    <Zap className="size-3.5 text-primary" />
                    Créer une relance manuelle
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-border -mx-5 -mb-5">
                {opportunities.map((opp) => (
                  <div key={opp._id || opp.id} className="p-4 space-y-3 hover:bg-muted/20 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground capitalize">
                          {opp.type.replace(/_/g, " ")}
                        </span>
                        <PriorityBadge priority={opp.priority} />
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                            opp.status === "visited"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : opp.status === "booked"
                              ? "bg-blue-500/10 text-blue-600"
                              : opp.status === "contacted"
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {opp.status === "identified"
                            ? "Identifié par l'IA"
                            : opp.status === "queued"
                            ? "En file d'attente"
                            : opp.status === "contacted"
                            ? "Contacté"
                            : opp.status === "responded"
                            ? "A répondu"
                            : opp.status === "booked"
                            ? "RDV Reprogrammé"
                            : opp.status === "visited"
                            ? "Récupéré & Honoré"
                            : opp.status === "no_response"
                            ? "Sans réponse"
                            : "Écarté"}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-primary">
                          Valeur estimée : {opp.estimatedValue || 0} DT
                        </span>
                      </div>
                    </div>

                    {opp.reason && (
                      <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg">
                        <Sparkles className="size-3 text-primary inline mr-1" />
                        {opp.reason}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
                      <span>Détecté le {opp.detectedAt ? new Date(opp.detectedAt).toLocaleDateString("fr-FR") : "—"}</span>
                      
                      <div className="flex items-center gap-2">
                        {p.phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                            asChild
                          >
                            <a href={whatsappUrl} target="_blank" rel="noreferrer">
                              <MessageSquare className="size-3" />
                              Relancer WhatsApp
                            </a>
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs h-7 gap-1"
                          onClick={() => {
                            setSelectedRecoveryForJournal(opp);
                            setIsContactJournalOpen(true);
                          }}
                        >
                          <History className="size-3" />
                          Journal de contact
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* ── TAB 4: Waitlist ─────────────────────────────────── */}
        <TabsContent value="waitlist" className="space-y-4 m-0">
          <SectionCard
            title="Inscriptions en Liste d'attente"
            description="Dès qu'un créneau s'annule, le patient recevra automatiquement une proposition prioritaire."
            actions={
              <Button size="sm" onClick={() => setIsAddWaitlistOpen(true)} className="gap-1.5 text-xs">
                <Plus className="size-3.5" />
                Ajouter une demande
              </Button>
            }
          >
            {waitlist.length === 0 ? (
              <EmptyState
                icon={ListOrdered}
                title="Aucune demande d'attente active"
                description="Ce patient n'est actuellement pas inscrit sur la liste d'attente pour un désistement."
                actions={
                  <Button size="sm" onClick={() => setIsAddWaitlistOpen(true)} className="gap-1.5 text-xs">
                    <Plus className="size-3.5" />
                    Inscrire en liste d'attente
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-border -mx-5 -mb-5">
                {waitlist.map((entry) => (
                  <div key={entry._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {entry.treatment}
                        </span>
                        <PriorityBadge priority={entry.priority} />
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {entry.status === "active" ? "En attente d'un créneau" : entry.status}
                        </Badge>
                      </div>

                      {entry.preferredDays && entry.preferredDays.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="text-[11px] text-muted-foreground mr-1">Disponibilités :</span>
                          {entry.preferredDays.map((d) => (
                            <span key={d} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
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

                      {entry.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          "{entry.notes}"
                        </p>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-destructive hover:bg-destructive/10 h-8 self-end sm:self-center"
                      onClick={() => deleteWaitlistMutation.mutate(entry._id)}
                      disabled={deleteWaitlistMutation.isPending}
                    >
                      <Trash2 className="size-3 mr-1" />
                      Retirer
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>
        </Tabs>
        </div>
      </div>

      {/* ── MODAL 1: Prendre Rendez-vous (Book Appointment) ──── */}
      <BookAppointmentDialog
        open={isBookApptOpen}
        onOpenChange={setIsBookApptOpen}
        patient={p}
      />

      {/* ── MODAL 2: Modifier le Profil Patient ───────────────── */}
      <EditPatientDialog
        open={isEditProfileOpen}
        onOpenChange={setIsEditProfileOpen}
        patient={p}
        onSave={(data) => updatePatientMutation.mutate(data)}
        isSaving={updatePatientMutation.isPending}
      />

      {/* ── MODAL 3: Inscrire en Liste d'attente ───────────────── */}
      <AddWaitlistDialog
        open={isAddWaitlistOpen}
        onOpenChange={setIsAddWaitlistOpen}
        patient={p}
      />

      {/* ── MODAL 4: Créer une Opportunité / Relance IA ─────────── */}
      <CreateRecoveryDialog
        open={isCreateRecoveryOpen}
        onOpenChange={setIsCreateRecoveryOpen}
        patient={p}
      />

      {/* ── MODAL 5: Journal de Contact (Log Attempt) ─────────── */}
      {selectedRecoveryForJournal && (
        <ContactJournalDialog
          open={isContactJournalOpen}
          onOpenChange={setIsContactJournalOpen}
          recovery={selectedRecoveryForJournal}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DIALOG COMPONENTS
// ─────────────────────────────────────────────────────────────

function BookAppointmentDialog({
  open,
  onOpenChange,
  patient,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: IPatient;
}) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [durationMin, setDurationMin] = useState(30);
  const [treatment, setTreatment] = useState("Consultation");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: any) => api.post("/appointments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments", "patient", patient._id] });
      queryClient.invalidateQueries({ queryKey: ["patients", patient._id] });
      toast.success("Rendez-vous planifié avec succès !");
      onOpenChange(false);
      setNotes("");
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de la prise de rendez-vous"),
  });

  const calculateEndTime = (start: string, duration: number) => {
    const [h, m] = start.split(":").map(Number);
    const totalMinutes = h * 60 + m + duration;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const endTime = calculateEndTime(startTime, durationMin);
    mutation.mutate({
      patientId: patient._id,
      date,
      startTime,
      endTime,
      durationMin,
      treatment,
      notes,
      status: "scheduled",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Programmer un Rendez-vous</DialogTitle>
          <DialogDescription>
            Fixez un créneau pour {patient.firstName} {patient.lastName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Date *</label>
              <Input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Heure de début *</label>
              <Input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Durée (minutes)</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 heure</option>
                <option value={90}>1h 30min</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Heure de fin estimée</label>
              <Input
                disabled
                value={calculateEndTime(startTime, durationMin)}
                className="bg-muted font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Soin / Motif de consultation *</label>
            <Input
              required
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
              placeholder="Ex: Détartrage, Soin carie, Contrôle..."
            />
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
            <label className="text-xs font-semibold">Remarques (optionnel)</label>
            <Textarea
              placeholder="Ex: Première consultation, douleur molaire gauche..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Création..." : "Confirmer le rendez-vous"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditPatientDialog({
  open,
  onOpenChange,
  patient,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: IPatient;
  onSave: (data: Partial<IPatient>) => void;
  isSaving: boolean;
}) {
  const [firstName, setFirstName] = useState(patient.firstName || "");
  const [lastName, setLastName] = useState(patient.lastName || "");
  const [phone, setPhone] = useState(patient.phone || "");
  const [email, setEmail] = useState(patient.email || "");
  const [gender, setGender] = useState(patient.gender || "male");
  const [status, setStatus] = useState(patient.status || "active");
  const [language, setLanguage] = useState(patient.language || "fr");
  const [dateOfBirth, setDateOfBirth] = useState(
    patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split("T")[0] : ""
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      gender,
      status: status as any,
      language,
      dateOfBirth: dateOfBirth ? (new Date(dateOfBirth) as any) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier la fiche patient</DialogTitle>
          <DialogDescription>Mettez à jour les informations générales du dossier.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Prénom *</label>
              <Input required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Nom *</label>
              <Input required value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Téléphone *</label>
              <Input required value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Sexe</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="male">Homme</option>
                <option value="female">Femme</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Statut</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="active">Actif</option>
                <option value="at_risk">À risque</option>
                <option value="inactive">Inactif</option>
                <option value="lead">Prospect (Lead)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Langue</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="fr">Français</option>
                <option value="ar">Arabe</option>
                <option value="en">Anglais</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Date de naissance</label>
            <Input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddWaitlistDialog({
  open,
  onOpenChange,
  patient,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: IPatient;
}) {
  const queryClient = useQueryClient();
  const [treatment, setTreatment] = useState("");
  const [priority, setPriority] = useState("medium");
  const [notes, setNotes] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/waitlist", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      queryClient.invalidateQueries({ queryKey: ["waitlist", "patient", patient._id] });
      toast.success("Patient ajouté à la liste d'attente !");
      onOpenChange(false);
      setTreatment("");
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
    if (!treatment) {
      toast.error("Veuillez indiquer le soin souhaité");
      return;
    }
    mutation.mutate({
      patientId: patient._id,
      treatment,
      priority,
      notes,
      preferredDays: selectedDays,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Inscrire en Liste d'attente</DialogTitle>
          <DialogDescription>
            Attribuer automatiquement les créneaux qui se libèrent à {patient.firstName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Soin souhaité *</label>
            <Input
              required
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
              placeholder="Ex: Détartrage, Urgence dentaire..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Degré de priorité</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="high">Haute (Urgence / Patient très disponible)</option>
              <option value="medium">Moyenne (Standard)</option>
              <option value="low">Basse (Simple contrôle)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Jours de préférence</label>
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
            <label className="text-xs font-semibold">Notes</label>
            <Textarea
              placeholder="Ex: Prévient 2h à l'avance..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Inscription..." : "Inscrire"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateRecoveryDialog({
  open,
  onOpenChange,
  patient,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: IPatient;
}) {
  const queryClient = useQueryClient();
  const [type, setType] = useState("inactive_patient");
  const [priority, setPriority] = useState("medium");
  const [estimatedValue, setEstimatedValue] = useState(120);
  const [reason, setReason] = useState("Suivi régulier du patient recommandé par l'IA");

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/recovery", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recovery"] });
      queryClient.invalidateQueries({ queryKey: ["recovery", "patient", patient._id] });
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      toast.success("Opportunité de relance créée !");
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message || "Erreur"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      patientId: patient._id,
      type,
      priority,
      estimatedValue: Number(estimatedValue) || 0,
      reason,
      status: "identified",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Créer une Opportunité de Relance IA</DialogTitle>
          <DialogDescription>
            Programmez une relance intelligente pour {patient.firstName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Type de relance</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="inactive_patient">Patient inactif (Sans visite récente)</option>
              <option value="overdue_checkup">Contrôle annuel en retard</option>
              <option value="cancellation">Rendez-vous annulé à reprogrammer</option>
              <option value="no_show">Rendez-vous manqué (No-Show)</option>
              <option value="follow_up_required">Suivi post-opératoire requis</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Priorité</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="high">Haute</option>
                <option value="medium">Moyenne</option>
                <option value="low">Basse</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Valeur estimée (DT)</label>
              <Input
                type="number"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Motif / Contexte de relance</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Le patient devait rappeler pour la suite de son traitement..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Création..." : "Déclencher la relance"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ContactJournalDialog({
  open,
  onOpenChange,
  recovery,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recovery: IRecovery;
}) {
  const queryClient = useQueryClient();
  const [channel, setChannel] = useState("whatsapp");
  const [outcome, setOutcome] = useState("spoken_agreed");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/follow-ups/attempts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recovery"] });
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      toast.success("Échange consigné dans le journal avec succès !");
      onOpenChange(false);
      setNotes("");
    },
    onError: (err: any) => toast.error(err.message || "Erreur"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      recoveryId: recovery._id,
      channel,
      outcome,
      notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Journal de Contact Patient</DialogTitle>
          <DialogDescription>
            Consignez le résultat de votre échange (appel, message, relance).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold">Canal de contact</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "whatsapp", icon: MessageSquare, label: "WhatsApp" },
                { id: "phone", icon: Phone, label: "Appel" },
                { id: "sms", icon: Send, label: "SMS" },
                { id: "email", icon: Mail, label: "Email" },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChannel(c.id)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-lg border text-xs gap-1 transition-colors",
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Résultat de l'échange</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            >
              <option value="spoken_agreed">Patient d'accord (Souhaite un RDV)</option>
              <option value="no_answer">Pas de réponse</option>
              <option value="left_voicemail">Message laissé</option>
              <option value="spoken_declined">Refus / Ne souhaite pas de suivi</option>
              <option value="invalid_number">Numéro non attribué</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Notes / Détails</label>
            <Textarea
              placeholder="Ex: Le patient rappelle demain pour confirmer son horaire..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Enregistrement..." : "Enregistrer dans l'historique"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
