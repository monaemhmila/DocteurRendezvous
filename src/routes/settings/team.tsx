import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  Shield,
  Key,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Edit,
  Mail,
  Phone,
  Stethoscope,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageHeader, SectionCard, StatCard } from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppState } from "@/hooks/use-app-state";

export const Route = createFileRoute("/settings/team")({
  head: () => ({
    meta: [
      { title: "Équipe & Gestion des Accès — Medical AI" },
      { name: "description", content: "Gestion des collaborateurs du cabinet médical et configuration des permissions d'accès." },
    ],
  }),
  component: TeamSettingsPage,
});

interface MemberPermissions {
  appointments: boolean;
  patients: boolean;
  conversations: boolean;
  aiConfig: boolean;
  analytics: boolean;
  settings: boolean;
}

const defaultPermissionsByRole: Record<string, MemberPermissions> = {
  clinic_owner: {
    appointments: true,
    patients: true,
    conversations: true,
    aiConfig: true,
    analytics: true,
    settings: true,
  },
  dentist: {
    appointments: true,
    patients: true,
    conversations: true,
    aiConfig: false,
    analytics: true,
    settings: false,
  },
  receptionist: {
    appointments: true,
    patients: true,
    conversations: true,
    aiConfig: false,
    analytics: false,
    settings: false,
  },
  assistant: {
    appointments: true,
    patients: true,
    conversations: false,
    aiConfig: false,
    analytics: false,
    settings: false,
  },
};

function TeamSettingsPage() {
  const queryClient = useQueryClient();
  const { t } = useAppState();

  // Dialog States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [resetPasswordMember, setResetPasswordMember] = useState<any | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [deletingMember, setDeletingMember] = useState<any | null>(null);

  // Form State for Add / Edit
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formSpecialty, setFormSpecialty] = useState("");
  const [formRole, setFormRole] = useState<"clinic_owner" | "dentist" | "receptionist" | "assistant">("receptionist");
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");
  const [formPassword, setFormPassword] = useState("");
  const [formPermissions, setFormPermissions] = useState<MemberPermissions>({
    appointments: true,
    patients: true,
    conversations: true,
    aiConfig: false,
    analytics: false,
    settings: false,
  });

  // Fetch Team Members
  const { data: teamMembers = [], isLoading, isError } = useQuery<any[]>({
    queryKey: ["team"],
    queryFn: () => api.get("/users/team"),
  });

  // Calculate Metrics
  const totalCount = teamMembers.length;
  const doctorsCount = teamMembers.filter((m) => m.role === "dentist" || m.role === "clinic_owner").length;
  const staffCount = teamMembers.filter((m) => m.role === "receptionist" || m.role === "assistant").length;
  const activeCount = teamMembers.filter((m) => m.status !== "inactive").length;

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post("/users/team", payload),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      setIsAddOpen(false);
      resetForm();
      toast.success(t.teamSettings.createdSuccess);
      if (res.temporaryPassword) {
        toast.info(`Mot de passe temporaire généré : ${res.temporaryPassword}`, { duration: 10000 });
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erreur lors de la création du membre.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => api.put(`/users/team/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      setEditingMember(null);
      resetForm();
      toast.success(t.teamSettings.updatedSuccess);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erreur lors de la mise à jour.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "inactive" }) =>
      api.patch(`/users/team/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      toast.success(t.teamSettings.statusUpdated);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erreur de mise à jour du statut.");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password?: string }) =>
      api.post(`/users/team/${id}/reset-password`, { password }),
    onSuccess: (res: any) => {
      setResetPasswordMember(null);
      setNewPasswordValue("");
      toast.success(t.teamSettings.passwordResetSuccess);
      if (res.newPassword) {
        toast.info(`Nouveau mot de passe : ${res.newPassword}`, { duration: 10000 });
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erreur lors de la réinitialisation.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/team/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      setDeletingMember(null);
      toast.success(t.teamSettings.deletedSuccess);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erreur lors de la suppression.");
    },
  });

  const resetForm = () => {
    setFormFirstName("");
    setFormLastName("");
    setFormEmail("");
    setFormPhone("");
    setFormSpecialty("");
    setFormRole("receptionist");
    setFormStatus("active");
    setFormPassword("");
    setFormPermissions(defaultPermissionsByRole.receptionist);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleOpenEdit = (member: any) => {
    setEditingMember(member);
    setFormFirstName(member.firstName || "");
    setFormLastName(member.lastName || "");
    setFormEmail(member.email || "");
    setFormPhone(member.phone || "");
    setFormSpecialty(member.specialty || "");
    setFormRole(member.role || "receptionist");
    setFormStatus(member.status || "active");
    setFormPassword("");
    setFormPermissions(
      member.permissions || defaultPermissionsByRole[member.role] || defaultPermissionsByRole.receptionist
    );
  };

  const handleRoleChange = (newRole: "clinic_owner" | "dentist" | "receptionist" | "assistant") => {
    setFormRole(newRole);
    if (defaultPermissionsByRole[newRole]) {
      setFormPermissions(defaultPermissionsByRole[newRole]);
    }
  };

  const handlePermissionToggle = (key: keyof MemberPermissions) => {
    setFormPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      firstName: formFirstName,
      lastName: formLastName,
      email: formEmail,
      phone: formPhone,
      specialty: formSpecialty,
      role: formRole,
      status: formStatus,
      password: formPassword || undefined,
      permissions: formPermissions,
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    updateMutation.mutate({
      id: editingMember._id,
      payload: {
        firstName: formFirstName,
        lastName: formLastName,
        email: formEmail,
        phone: formPhone,
        specialty: formSpecialty,
        role: formRole,
        status: formStatus,
        permissions: formPermissions,
      },
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "clinic_owner":
        return (
          <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[11px] font-semibold">
            {t.teamSettings.roles.clinic_owner}
          </Badge>
        );
      case "dentist":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[11px] font-semibold">
            {t.teamSettings.roles.dentist}
          </Badge>
        );
      case "assistant":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[11px] font-semibold">
            {t.teamSettings.roles.assistant}
          </Badge>
        );
      case "receptionist":
      default:
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-semibold">
            {t.teamSettings.roles.receptionist}
          </Badge>
        );
    }
  };

  return (
    <div className="mx-auto max-w-[1000px] space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title={t.teamSettings.title}
        subtitle={t.teamSettings.subtitle}
        actions={
          <Button onClick={handleOpenAdd} className="gap-2 shadow-sm font-medium">
            <UserPlus className="size-4" />
            {t.teamSettings.addMember}
          </Button>
        }
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label={t.teamSettings.totalMembers}
          value={String(totalCount)}
          hint={t.teamSettings.activeAccounts}
          tone="neutral"
          icon={Users}
        />
        <StatCard
          label={t.teamSettings.doctorsCount}
          value={String(doctorsCount)}
          hint="Praticiens"
          tone="accent"
          icon={Stethoscope}
        />
        <StatCard
          label={t.teamSettings.staffCount}
          value={String(staffCount)}
          hint="Support & Accueil"
          tone="neutral"
          icon={Users}
        />
        <StatCard
          label={t.teamSettings.activeAccounts}
          value={`${activeCount} / ${totalCount}`}
          hint="100% opérationnels"
          tone="success"
          icon={CheckCircle2}
        />
      </div>

      {/* Main Team Members List */}
      <SectionCard
        title={t.teamSettings.memberList}
        description={t.teamSettings.memberListDesc}
        bodyClassName="p-0 overflow-hidden"
      >
        {isLoading && (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground animate-pulse">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm font-medium">{t.common.loading}</p>
          </div>
        )}

        {isError && (
          <div className="p-8 text-center text-destructive">
            <p className="font-semibold">{t.common.error}</p>
          </div>
        )}

        {!isLoading && !isError && teamMembers.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <Users className="mx-auto size-10 opacity-40 mb-2" />
            <p className="font-medium text-sm">Aucun collaborateur enregistré.</p>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="divide-y divide-border">
            {teamMembers.map((member: any) => {
              const fullName = `${member.firstName || ""} ${member.lastName || ""}`.trim();
              const initials = `${(member.firstName || "")[0] || ""}${(member.lastName || "")[0] || ""}`.toUpperCase();
              const isInactive = member.status === "inactive";
              const isOwner = member.role === "clinic_owner";
              const perms: MemberPermissions = member.permissions || defaultPermissionsByRole[member.role] || defaultPermissionsByRole.receptionist;

              return (
                <div
                  key={member._id}
                  className={`flex flex-col gap-4 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between ${
                    isInactive ? "opacity-60 bg-muted/10" : ""
                  }`}
                >
                  {/* Member Info */}
                  <div className="flex items-start gap-3.5 sm:items-center">
                    <div className="relative">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-sm font-bold text-primary">
                        {initials}
                      </span>
                      <span
                        className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-background ${
                          isInactive ? "bg-muted-foreground" : "bg-emerald-500"
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-foreground">{fullName}</h4>
                        {getRoleBadge(member.role)}
                        {isInactive && (
                          <Badge variant="outline" className="text-destructive border-destructive/20 text-[10px]">
                            {t.teamSettings.inactive}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="size-3" />
                          {member.email}
                        </span>
                        {member.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="size-3" />
                            {member.phone}
                          </span>
                        )}
                        {member.specialty && (
                          <span className="flex items-center gap-1 text-foreground/80 font-medium">
                            <Stethoscope className="size-3 text-accent" />
                            {member.specialty}
                          </span>
                        )}
                      </div>

                      {/* Permissions Summary Badges */}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-medium text-muted-foreground mr-1">Accès :</span>
                        {perms.appointments && (
                          <span className="inline-flex items-center rounded-md bg-surface border border-border px-1.5 py-0.5 text-[10px] text-foreground font-medium">
                            📅 Agenda
                          </span>
                        )}
                        {perms.patients && (
                          <span className="inline-flex items-center rounded-md bg-surface border border-border px-1.5 py-0.5 text-[10px] text-foreground font-medium">
                            👥 Patients
                          </span>
                        )}
                        {perms.conversations && (
                          <span className="inline-flex items-center rounded-md bg-surface border border-border px-1.5 py-0.5 text-[10px] text-foreground font-medium">
                            💬 WhatsApp
                          </span>
                        )}
                        {perms.aiConfig && (
                          <span className="inline-flex items-center rounded-md bg-surface border border-border px-1.5 py-0.5 text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                            🤖 Directives IA
                          </span>
                        )}
                        {perms.analytics && (
                          <span className="inline-flex items-center rounded-md bg-surface border border-border px-1.5 py-0.5 text-[10px] text-foreground font-medium">
                            📊 Finances
                          </span>
                        )}
                        {perms.settings && (
                          <span className="inline-flex items-center rounded-md bg-surface border border-border px-1.5 py-0.5 text-[10px] text-accent font-medium">
                            ⚙️ Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Menu */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(member)}
                      className="h-8 gap-1.5 text-xs font-medium"
                    >
                      <Edit className="size-3.5" />
                      {t.common.edit}
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={() => handleOpenEdit(member)} className="cursor-pointer">
                          <Shield className="mr-2 size-3.5 text-accent" />
                          {t.teamSettings.editMember}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => {
                            setResetPasswordMember(member);
                            setNewPasswordValue("");
                          }}
                          className="cursor-pointer"
                        >
                          <Key className="mr-2 size-3.5 text-amber-500" />
                          {t.common.resetPassword}
                        </DropdownMenuItem>

                        {!isOwner && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                statusMutation.mutate({
                                  id: member._id,
                                  status: isInactive ? "active" : "inactive",
                                })
                              }
                              className="cursor-pointer"
                            >
                              {isInactive ? (
                                <>
                                  <CheckCircle2 className="mr-2 size-3.5 text-emerald-500" />
                                  Activer le compte
                                </>
                              ) : (
                                <>
                                  <XCircle className="mr-2 size-3.5 text-muted-foreground" />
                                  Désactiver le compte
                                </>
                              )}
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => setDeletingMember(member)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 size-3.5" />
                              {t.teamSettings.deleteMember}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Add / Edit Member Dialog */}
      <Dialog
        open={isAddOpen || editingMember !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditingMember(null);
          }
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="size-5 text-accent" />
              {editingMember ? t.teamSettings.editMember : t.teamSettings.addMember}
            </DialogTitle>
            <DialogDescription>{t.teamSettings.permissionsDesc}</DialogDescription>
          </DialogHeader>

          <form onSubmit={editingMember ? handleSaveEdit : handleSaveAdd} className="space-y-5 py-2">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mem-firstname" className="text-xs font-semibold">
                  {t.teamSettings.firstName} *
                </Label>
                <Input
                  id="mem-firstname"
                  value={formFirstName}
                  onChange={(e) => setFormFirstName(e.target.value)}
                  placeholder="Ex: Sami"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mem-lastname" className="text-xs font-semibold">
                  {t.teamSettings.lastName} *
                </Label>
                <Input
                  id="mem-lastname"
                  value={formLastName}
                  onChange={(e) => setFormLastName(e.target.value)}
                  placeholder="Ex: Ben Amor"
                  required
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mem-email" className="text-xs font-semibold">
                  {t.teamSettings.email} *
                </Label>
                <Input
                  id="mem-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="nom@cabinet.tn"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mem-phone" className="text-xs font-semibold">
                  {t.teamSettings.phone}
                </Label>
                <Input
                  id="mem-phone"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+216 92 000 000"
                />
              </div>
            </div>

            {/* Role & Specialty */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t.teamSettings.role} *</Label>
                <Select
                  value={formRole}
                  onValueChange={(val: any) => handleRoleChange(val)}
                  disabled={editingMember?.role === "clinic_owner"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dentist">{t.teamSettings.roles.dentist}</SelectItem>
                    <SelectItem value="receptionist">{t.teamSettings.roles.receptionist}</SelectItem>
                    <SelectItem value="assistant">{t.teamSettings.roles.assistant}</SelectItem>
                    {editingMember?.role === "clinic_owner" && (
                      <SelectItem value="clinic_owner">{t.teamSettings.roles.clinic_owner}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mem-spec" className="text-xs font-semibold">
                  {t.teamSettings.specialty}
                </Label>
                <Input
                  id="mem-spec"
                  value={formSpecialty}
                  onChange={(e) => setFormSpecialty(e.target.value)}
                  placeholder="Ex: Secrétaire Médicale"
                />
              </div>
            </div>

            {/* Password (Only on Add or Optional) */}
            {!editingMember && (
              <div className="space-y-1.5">
                <Label htmlFor="mem-pass" className="text-xs font-semibold">
                  {t.teamSettings.password}
                </Label>
                <Input
                  id="mem-pass"
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={t.teamSettings.passwordPlaceholder}
                />
              </div>
            )}

            {/* Granular Permissions Section */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Lock className="size-3.5 text-accent" />
                    {t.teamSettings.permissionsTitle}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">{t.teamSettings.permissionsDesc}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 pt-1">
                {/* 1. Appointments */}
                <div className="flex items-start justify-between gap-2 rounded-lg border border-border bg-surface p-2.5">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-foreground">
                      {t.teamSettings.permissions.appointmentsTitle}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      {t.teamSettings.permissions.appointmentsDesc}
                    </p>
                  </div>
                  <Switch
                    checked={formPermissions.appointments}
                    onCheckedChange={() => handlePermissionToggle("appointments")}
                  />
                </div>

                {/* 2. Patients */}
                <div className="flex items-start justify-between gap-2 rounded-lg border border-border bg-surface p-2.5">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-foreground">
                      {t.teamSettings.permissions.patientsTitle}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      {t.teamSettings.permissions.patientsDesc}
                    </p>
                  </div>
                  <Switch
                    checked={formPermissions.patients}
                    onCheckedChange={() => handlePermissionToggle("patients")}
                  />
                </div>

                {/* 3. WhatsApp Conversations */}
                <div className="flex items-start justify-between gap-2 rounded-lg border border-border bg-surface p-2.5">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-foreground">
                      {t.teamSettings.permissions.conversationsTitle}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      {t.teamSettings.permissions.conversationsDesc}
                    </p>
                  </div>
                  <Switch
                    checked={formPermissions.conversations}
                    onCheckedChange={() => handlePermissionToggle("conversations")}
                  />
                </div>

                {/* 4. AI Config & Pricing */}
                <div className="flex items-start justify-between gap-2 rounded-lg border border-border bg-surface p-2.5">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-foreground">
                      {t.teamSettings.permissions.aiConfigTitle}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      {t.teamSettings.permissions.aiConfigDesc}
                    </p>
                  </div>
                  <Switch
                    checked={formPermissions.aiConfig}
                    onCheckedChange={() => handlePermissionToggle("aiConfig")}
                  />
                </div>

                {/* 5. Revenue & Analytics */}
                <div className="flex items-start justify-between gap-2 rounded-lg border border-border bg-surface p-2.5">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-foreground">
                      {t.teamSettings.permissions.analyticsTitle}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      {t.teamSettings.permissions.analyticsDesc}
                    </p>
                  </div>
                  <Switch
                    checked={formPermissions.analytics}
                    onCheckedChange={() => handlePermissionToggle("analytics")}
                  />
                </div>

                {/* 6. Settings & Team Admin */}
                <div className="flex items-start justify-between gap-2 rounded-lg border border-border bg-surface p-2.5">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-foreground">
                      {t.teamSettings.permissions.settingsTitle}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      {t.teamSettings.permissions.settingsDesc}
                    </p>
                  </div>
                  <Switch
                    checked={formPermissions.settings}
                    onCheckedChange={() => handlePermissionToggle("settings")}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingMember(null);
                }}
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="gap-2 font-medium"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                {t.teamSettings.saveMember}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordMember !== null} onOpenChange={(open) => !open && setResetPasswordMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="size-5 text-amber-500" />
              {t.common.resetPassword}
            </DialogTitle>
            <DialogDescription>
              Définir un nouveau mot de passe pour {resetPasswordMember?.firstName} {resetPasswordMember?.lastName} ({resetPasswordMember?.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nouveau mot de passe</Label>
              <Input
                type="password"
                value={newPasswordValue}
                onChange={(e) => setNewPasswordValue(e.target.value)}
                placeholder="Laisser vide pour générer automatiquement"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordMember(null)}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={() =>
                resetPasswordMutation.mutate({
                  id: resetPasswordMember._id,
                  password: newPasswordValue || undefined,
                })
              }
              disabled={resetPasswordMutation.isPending}
              className="gap-2"
            >
              {resetPasswordMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              {t.common.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deletingMember !== null} onOpenChange={(open) => !open && setDeletingMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" />
              {t.teamSettings.deleteMember}
            </DialogTitle>
            <DialogDescription>
              {t.teamSettings.deleteConfirm}
              <br />
              <strong>{deletingMember?.firstName} {deletingMember?.lastName}</strong> ({deletingMember?.email})
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingMember(null)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingMember && deleteMutation.mutate(deletingMember._id)}
              disabled={deleteMutation.isPending}
              className="gap-2"
            >
              {deleteMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              {t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
