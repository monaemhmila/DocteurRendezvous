import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAppState } from "@/hooks/use-app-state";
import { api } from "@/lib/api";
import { IFollowUpTask, IPatient } from "@/types/api";
import { PageHeader, SectionCard, PriorityBadge, PatientAvatar } from "@/components/shared/ui-kit";
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
import {
  CheckCircle2,
  Clock,
  PlayCircle,
  XCircle,
  Phone,
  MessageSquare,
  Mail,
  User,
  Smartphone
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/follow-ups")({
  component: FollowUpsPage,
});

const taskTypeLabel = (t: any) => ({
  no_show_followup: t.followupsPage.typeAbsence,
  cancellation_followup: t.followupsPage.typeCancel,
  inactive_reengagement: t.followupsPage.typeReengage,
  checkup_reminder: t.followupsPage.typeCheckup,
  slot_fill_offer: t.followupsPage.typeSlotOffer,
});

const taskStatusLabel = (t: any) => ({
  pending: t.followupsPage.statusPending,
  in_progress: t.followupsPage.statusInProgress,
  completed: t.followupsPage.statusCompleted,
  cancelled: t.followupsPage.statusCancelled,
  expired: t.followupsPage.statusExpired,
});

function FollowUpsPage() {
  const { t } = useAppState();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("active"); // active = pending + in_progress
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const { data: rawTasks = [], isLoading } = useQuery<IFollowUpTask[]>({
    queryKey: ["follow-ups"],
    queryFn: () => api.get("/follow-ups"),
  });

  // Filter out dummy patients used for doctor reservations
  const allTasks = rawTasks.filter(
    (task) => (task.patientId as IPatient)?.phone !== "00000000"
  );

  // KPI Calculations
  const today = new Date().toISOString().split("T")[0] as string;
  const pendingCount = allTasks.filter(t => t.status === "pending").length;
  const inProgressCount = allTasks.filter(t => t.status === "in_progress").length;
  const completedTodayCount = allTasks.filter(t => t.status === "completed" && t.completedAt?.startsWith(today)).length;
  const expiredCount = allTasks.filter(t => t.status === "expired").length;

  // Filter tasks
  const filteredTasks = allTasks.filter(task => {
    if (statusFilter === "active" && !["pending", "in_progress"].includes(task.status)) return false;
    if (statusFilter !== "active" && statusFilter !== "" && task.status !== statusFilter) return false;
    if (priorityFilter && task.priority !== priorityFilter) return false;
    if (typeFilter && task.type !== typeFilter) return false;
    return true;
  });

  const completeMutation = useMutation({
    mutationFn: (taskId: string) => api.post(`/follow-ups/${taskId}/complete`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      toast.success(t.followupsPage.toastSuccess);
    },
    onError: (error: any) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 pb-20">
      <PageHeader
        title={t.pages.followupsTitle}
        subtitle={t.pages.followupsSubtitle}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title={t.followupsPage.kpiPending} value={pendingCount} icon={Clock} color="text-warning" />
        <KpiCard title={t.followupsPage.kpiInProgress} value={inProgressCount} icon={PlayCircle} color="text-accent" />
        <KpiCard title={t.followupsPage.kpiCompletedToday} value={completedTodayCount} icon={CheckCircle2} color="text-success" />
        <KpiCard title={t.followupsPage.kpiExpired} value={expiredCount} icon={XCircle} color="text-muted-foreground" />
      </div>

      <SectionCard>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <select 
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
              <option value="">{t.followupsPage.filterActive}</option>
              <option value="active">{t.followupsPage.filterActive}</option>
              <option value="pending">{t.followupsPage.statusPending}</option>
              <option value="in_progress">{t.followupsPage.statusInProgress}</option>
              <option value="completed">{t.followupsPage.statusCompleted}</option>
          </select>

          <select 
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">{t.followupsPage.filterAllPriorities}</option>
            <option value="high">{t.followupsPage.priorityHigh}</option>
            <option value="medium">{t.followupsPage.priorityMedium}</option>
            <option value="low">{t.followupsPage.priorityLow}</option>
          </select>

          <select 
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">{t.followupsPage.filterAllTypes}</option>
            {Object.entries(taskTypeLabel(t)).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Task Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium">{t.followupsPage.colPatient}</th>
                <th className="px-4 py-3 font-medium">{t.followupsPage.colType}</th>
                <th className="px-4 py-3 font-medium">{t.followupsPage.colPriority}</th>
                <th className="px-4 py-3 font-medium">{t.followupsPage.colStatus}</th>
                <th className="px-4 py-3 font-medium text-center">{t.followupsPage.colAttempts}</th>
                <th className="px-4 py-3 font-medium text-right">{t.followupsPage.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">{t.followupsPage.loading}</td></tr>
              ) : filteredTasks.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">{t.followupsPage.noTasks}</td></tr>
              ) : (
                filteredTasks.map(task => (
                  <TaskRow 
                    key={task._id} 
                    task={task} 
                    onComplete={() => completeMutation.mutate(task._id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="panel p-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-2xl font-semibold mt-1">{value}</p>
      </div>
      <div className={cn("p-3 rounded-full bg-muted/50", color)}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

function TaskRow({ task, onComplete }: { task: IFollowUpTask, onComplete: () => void }) {
  const { t } = useAppState();
  const patient = (task.patientId && typeof task.patientId === "object") ? (task.patientId as IPatient) : null;
  const isActionable = ["pending", "in_progress"].includes(task.status);
  const pFirstName = patient?.firstName || "Patient";
  const pLastName = patient?.lastName || "";
  const pInitials = `${pFirstName[0] || "P"}${pLastName[0] || "T"}`.toUpperCase();

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <PatientAvatar initials={pInitials} id={patient?._id || (task.patientId as string) || "pt"} size="sm" />
          <div>
            <div className="font-medium text-foreground">{pFirstName} {pLastName}</div>
            <div className="text-xs text-muted-foreground">{patient?.phone || "—"}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 font-medium">{taskTypeLabel(t)[task.type] || task.type}</td>
      <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
      <td className="px-4 py-3">
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
          task.status === "completed" ? "bg-success-soft text-success" :
          task.status === "in_progress" ? "bg-accent-soft text-accent" :
          task.status === "pending" ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"
        )}>
          {taskStatusLabel(t)[task.status] || task.status}
        </span>
      </td>
      <td className="px-4 py-3 text-center font-medium">{task.attemptCount}</td>
      <td className="px-4 py-3 text-right">
        {isActionable && (
          <div className="flex items-center justify-end gap-2">
            <JournalDialog task={task} />
            <Button size="sm" variant="outline" onClick={onComplete}>{t.followupsPage.btnComplete}</Button>
          </div>
        )}
      </td>
    </tr>
  );
}

function JournalDialog({ task }: { task: IFollowUpTask }) {
  const { t } = useAppState();
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState("phone");
  const [outcome, setOutcome] = useState("no_answer");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/follow-ups/attempts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      toast.success(t.followupsPage.toastAttempt);
      setOpen(false);
      setNotes("");
    },
    onError: (error: any) => toast.error(error.message)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      taskId: task._id,
      channel,
      outcome,
      notes
    };
    if (task.recoveryId) {
      payload.recoveryId = typeof task.recoveryId === "string" ? task.recoveryId : task.recoveryId._id;
    } else if (task.waitlistEntryId) {
      payload.waitlistEntryId = typeof task.waitlistEntryId === "string" ? task.waitlistEntryId : task.waitlistEntryId._id;
    }
    mutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">{t.followupsPage.btnJournal}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.followupsPage.journalTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.followupsPage.journalChannel}</label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: "phone", icon: Phone, label: t.followupsPage.channelPhone },
                { id: "whatsapp", icon: MessageSquare, label: t.followupsPage.channelWA },
                { id: "sms", icon: Smartphone, label: t.followupsPage.channelSMS },
                { id: "email", icon: Mail, label: t.followupsPage.channelEmail },
                { id: "in_person", icon: User, label: t.followupsPage.channelVisit }
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
            <label className="text-sm font-medium">{t.followupsPage.journalOutcome}</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            >
              <option value="no_answer">{t.followupsPage.outNoAnswer}</option>
              <option value="left_voicemail">{t.followupsPage.outVoicemail}</option>
              <option value="spoken_agreed">{t.followupsPage.outAgreed}</option>
              <option value="spoken_declined">{t.followupsPage.outDeclined}</option>
              <option value="invalid_number">{t.followupsPage.outInvalid}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t.followupsPage.journalNotes}</label>
            <Textarea 
              placeholder={t.followupsPage.journalNotesPlaceholder} 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? t.followupsPage.journalSaving : t.followupsPage.journalSave}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
