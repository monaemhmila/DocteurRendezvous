import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { IFollowUpTask, IWaitlistEntry, IPatient } from "@/types/api";
import { PageHeader, SectionCard, PatientAvatar, PriorityBadge } from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, UserPlus, Phone, MessageSquare, Mail, User, Smartphone, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/waitlist")({
  component: WaitlistPage,
});

function WaitlistPage() {
  const queryClient = useQueryClient();

  // Data Queries
  const { data: allTasks = [], isLoading: isLoadingTasks } = useQuery<IFollowUpTask[]>({
    queryKey: ["follow-ups", "slot_fill_offer"],
    queryFn: () => api.get("/follow-ups?type=slot_fill_offer"),
  });

  const { data: waitlist = [], isLoading: isLoadingWaitlist } = useQuery<IWaitlistEntry[]>({
    queryKey: ["waitlist"],
    queryFn: () => api.get("/waitlist"),
  });

  // Client-side filtering for pending/in_progress
  const openOffers = allTasks.filter(t => t.status === "pending" || t.status === "in_progress");

  const deleteEntryMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/waitlist/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      toast.success("Patient retiré de la liste d'attente.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 pb-20">
      <PageHeader
        title="Liste d'attente"
        subtitle="Remplissez automatiquement les créneaux annulés."
        actions={<AddWaitlistDialog />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Panel - Active Offers */}
        <SectionCard title="Offres de créneau actives" description={`${openOffers.length} offres en cours`}>
          <div className="space-y-4">
            {isLoadingTasks ? (
              <p className="text-sm text-muted-foreground text-center py-4">Chargement...</p>
            ) : openOffers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <CheckCircle2 className="size-12 mb-3 opacity-20" />
                <p>Aucune offre de créneau active.</p>
              </div>
            ) : (
              openOffers.map(task => <OfferCard key={task._id} task={task} />)
            )}
          </div>
        </SectionCard>

        {/* Right Panel - Waiting Patients */}
        <SectionCard title="Patients en attente" description={`${waitlist.length} patients inscrits`}>
          <div className="divide-y divide-border -mx-5 -mb-5 mt-2">
            {isLoadingWaitlist ? (
              <p className="text-sm text-muted-foreground text-center py-4">Chargement...</p>
            ) : waitlist.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun patient en attente.</p>
            ) : (
              waitlist.map(entry => {
                const p = entry.patientId as IPatient;
                return (
                  <div key={entry._id} className="p-5 flex items-start gap-4 hover:bg-muted/30 transition-colors">
                    <PatientAvatar initials={`${p.firstName[0]}${p.lastName[0]}`} id={p._id} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <Link to="/patients/$id" params={{ id: p._id }} className="font-semibold text-sm hover:underline">
                          {p.firstName} {p.lastName}
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteEntryMutation.mutate(entry._id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      <p className="text-sm text-foreground mt-1 font-medium">{entry.treatment}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <PriorityBadge priority={entry.priority} />
                        {entry.preferredDays && entry.preferredDays.length > 0 && (
                          <span className="text-xs text-muted-foreground">Jours: {entry.preferredDays.join(", ")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function OfferCard({ task }: { task: IFollowUpTask }) {
  const patient = task.patientId as IPatient;
  const queryClient = useQueryClient();

  const fulfillMutation = useMutation({
    mutationFn: () => {
      const waitlistEntryId = typeof task.waitlistEntryId === "string" ? task.waitlistEntryId : (task.waitlistEntryId as any)._id;
      return api.post(`/waitlist/${waitlistEntryId}/fulfill`, { taskId: task._id });
    },
    onSuccess: () => {
      toast.success("Créneau réservé avec succès.");
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
    if (confirm("Voulez-vous réserver ce créneau pour ce patient ?")) {
      fulfillMutation.mutate();
    }
  };

  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-warning" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-sm">
              Offre pour: {patient.firstName} {patient.lastName}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Créneau source: {task.sourceAppointmentId ? `ID ${task.sourceAppointmentId}` : "Information non disponible"}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
              task.status === "in_progress" ? "bg-accent-soft text-accent" : "bg-warning-soft text-warning"
            )}>
              {task.status === "in_progress" ? "En cours" : "En attente"}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {task.attemptCount} tentative(s)
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-warning/10 flex items-center justify-end gap-2">
        <JournalDialog task={task} />
        <Button size="sm" onClick={handleFulfill} disabled={fulfillMutation.isPending}>
          {fulfillMutation.isPending ? "Réservation..." : "Réserver ce créneau"}
        </Button>
      </div>
    </div>
  );
}

function JournalDialog({ task }: { task: IFollowUpTask }) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState("phone");
  const [outcome, setOutcome] = useState("no_answer");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/follow-ups/attempts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      toast.success("Tentative enregistrée");
      setOpen(false);
      setNotes("");
    },
    onError: (error: any) => toast.error(error.message)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const waitlistEntryId = typeof task.waitlistEntryId === "string" 
      ? task.waitlistEntryId 
      : (task.waitlistEntryId as any)._id;

    mutation.mutate({
      taskId: task._id,
      waitlistEntryId,
      channel,
      outcome,
      notes
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">Journal</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Journal de contact (Liste d'attente)</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Canal</label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: "phone", icon: Phone, label: "Appel" },
                { id: "whatsapp", icon: MessageSquare, label: "WA" },
                { id: "sms", icon: Smartphone, label: "SMS" },
                { id: "email", icon: Mail, label: "Email" },
                { id: "in_person", icon: User, label: "Visite" }
              ].map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChannel(c.id)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-md border text-xs gap-1 transition-colors",
                    channel === c.id ? "bg-accent-soft text-accent border-accent" : "hover:bg-muted"
                  )}
                >
                  <c.icon className="w-4 h-4" />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Résultat</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            >
              <option value="no_answer">Pas de réponse</option>
              <option value="left_voicemail">Message vocal laissé</option>
              <option value="spoken_agreed">Contacté - D'accord</option>
              <option value="spoken_declined">Contacté - Refus</option>
              <option value="invalid_number">Numéro invalide</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (optionnel)</label>
            <Textarea 
              placeholder="Détails de l'échange..." 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Enregistrement..." : "Enregistrer la tentative"}
          </Button>
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
  const queryClient = useQueryClient();

  const { data: patients = [] } = useQuery<IPatient[]>({
    queryKey: ["patients"],
    queryFn: () => api.get("/patients"),
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/waitlist", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      toast.success("Patient ajouté à la liste d'attente");
      setOpen(false);
      // Reset form
      setPatientId("");
      setTreatment("");
      setPriority("medium");
    },
    onError: (err: any) => toast.error(err.message)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !treatment) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    mutation.mutate({ patientId, treatment, priority });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="mr-2 size-4" />
          Ajouter à la liste
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un patient en liste d'attente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Patient *</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
            >
              <option value="">Sélectionner un patient...</option>
              {patients.map(p => (
                <option key={p._id} value={p._id}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Traitement souhaité *</label>
            <Input 
              required
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
              placeholder="Ex: Détartrage, Urgence..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Priorité</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Basse</option>
              <option value="medium">Moyenne</option>
              <option value="high">Haute</option>
            </select>
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
