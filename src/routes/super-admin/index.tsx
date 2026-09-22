import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Building2,
  Plus,
  Loader2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Ban,
  KeyRound,
  Edit2,
  Trash2,
  Copy,
  Users,
  Calendar,
  UserCheck,
  ShieldCheck,
  Stethoscope,
  Phone,
  Mail,
  MoreVertical,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { formatLongDate } from "@/lib/format";

export const Route = createFileRoute("/super-admin/")({
  component: SuperAdminDashboard,
});

interface TenantData {
  _id: string;
  name: string;
  specialty?: string;
  email?: string;
  phone?: string;
  address?: string;
  status: "active" | "suspended" | "trial";
  suspensionReason?: string;
  plan?: "starter" | "pro" | "enterprise";
  createdAt: string;
  owner?: {
    name: string;
    email: string;
  } | null;
  metrics?: {
    userCount: number;
    patientCount: number;
    appointmentCount: number;
  };
}

const SPECIALTIES = [
  "Dentisterie",
  "Cardiologie",
  "Dermatologie",
  "Ophtalmologie",
  "Pédiatrie",
  "Gynécologie",
  "Médecine Générale",
  "Orthopédie",
  "ORL",
  "Autre spécialité",
];

function SuperAdminDashboard() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string; name: string } | null>(null);
  
  // Custom password state in creation form
  const [autoGenPassword, setAutoGenPassword] = useState(false);
  const [customPassword, setCustomPassword] = useState("Cabinet2025!");

  // Edit Tenant
  const [editingTenant, setEditingTenant] = useState<TenantData | null>(null);

  // Status Change (Suspension / Activation)
  const [statusDialogTenant, setStatusDialogTenant] = useState<TenantData | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("Retard de paiement");

  // Reset Password
  const [resetPwdTenant, setResetPwdTenant] = useState<TenantData | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [resetSuccessData, setResetSuccessData] = useState<{ email: string; password: string } | null>(null);

  // Fetch Tenants
  const { data: tenants = [], isLoading, isError } = useQuery<TenantData[]>({
    queryKey: ["tenants"],
    queryFn: () => api.get("/tenants"),
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/tenants", data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Cabinet créé avec succès !");
      setCreatedCredentials({
        name: res.tenant?.name || "Cabinet",
        email: res.owner?.email || "",
        password: res.generatedPassword || customPassword,
      });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la création du cabinet");
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/tenants/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Cabinet mis à jour avec succès");
      setEditingTenant(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la mise à jour");
    },
  });

  // Status Mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status, suspensionReason }: { id: string; status: string; suspensionReason?: string }) =>
      api.patch(`/tenants/${id}/status`, { status, suspensionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Statut du cabinet mis à jour !");
      setStatusDialogTenant(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la modification du statut");
    },
  });

  // Reset Password Mutation
  const resetPwdMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword?: string }) =>
      api.post(`/tenants/${id}/reset-password`, { newPassword }),
    onSuccess: (res) => {
      toast.success("Mot de passe réinitialisé !");
      setResetSuccessData({
        email: res.email,
        password: res.newPassword,
      });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur de réinitialisation");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tenants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Cabinet supprimé");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la suppression");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      clinicName: formData.get("clinicName"),
      specialty: formData.get("specialty"),
      ownerName: formData.get("ownerName"),
      ownerEmail: formData.get("ownerEmail"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      plan: formData.get("plan") || "pro",
      ownerPassword: autoGenPassword ? undefined : customPassword,
    };
    createMutation.mutate(data);
  };

  const handleUpdateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTenant) return;
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      specialty: formData.get("specialty"),
      ownerName: formData.get("ownerName"),
      ownerEmail: formData.get("ownerEmail"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      plan: formData.get("plan"),
    };
    updateMutation.mutate({ id: editingTenant._id, data });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié dans le presse-papier !`);
  };

  // Filtered tenants
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.specialty && t.specialty.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.owner?.name && t.owner.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.owner?.email && t.owner.email.toLowerCase().includes(searchQuery.toLowerCase()));

    if (statusFilter === "active") return matchesSearch && t.status === "active";
    if (statusFilter === "suspended") return matchesSearch && t.status === "suspended";
    return matchesSearch;
  });

  // KPI calculations
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === "active").length;
  const suspendedTenants = tenants.filter((t) => t.status === "suspended").length;
  const totalPatients = tenants.reduce((sum, t) => sum + (t.metrics?.patientCount || 0), 0);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Gestion des Cabinets Médicaux
              </h1>
              <p className="text-sm text-muted-foreground">
                Espace Super Admin — Contrôle des accès, créations et abonnements des cabinets.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => {
            setCreatedCredentials(null);
            setIsCreateOpen(true);
          }}
          className="gap-2 shadow-sm"
        >
          <Plus className="size-4" />
          Nouveau Cabinet
        </Button>
      </div>

      {/* ── KPI Stat Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Cabinets
            </span>
            <Building2 className="size-4 text-primary" />
          </div>
          <p className="mt-3 text-3xl font-bold text-foreground">{totalTenants}</p>
          <p className="mt-1 text-xs text-muted-foreground">Établissements enregistrés</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Accès Actifs
            </span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-foreground">{activeTenants}</p>
          <p className="mt-1 text-xs text-muted-foreground">Cabinets opérationnels</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Accès Suspendus
            </span>
            <Ban className="size-4 text-amber-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-amber-600">{suspendedTenants}</p>
          <p className="mt-1 text-xs text-muted-foreground">Retard de paiement / Bloqués</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Patients Actifs
            </span>
            <Users className="size-4 text-primary" />
          </div>
          <p className="mt-3 text-3xl font-bold text-foreground">{totalPatients}</p>
          <p className="mt-1 text-xs text-muted-foreground">Suivis sur la plateforme</p>
        </div>
      </div>

      {/* ── Filters & Search ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un cabinet, médecin, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-border bg-muted/40 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              statusFilter === "all" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Tous ({totalTenants})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              statusFilter === "active" ? "bg-background text-emerald-600 shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Actifs ({activeTenants})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("suspended")}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              statusFilter === "suspended" ? "bg-background text-amber-600 shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Suspendus ({suspendedTenants})
          </button>
        </div>
      </div>

      {/* ── Cabinets List Table ───────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5">Cabinet & Spécialité</th>
                <th className="px-5 py-3.5">Médecin Responsable</th>
                <th className="px-5 py-3.5">Statut de l'accès</th>
                <th className="px-5 py-3.5">Abonnement</th>
                <th className="px-5 py-3.5">Activité</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
                    <Loader2 className="mx-auto size-6 animate-spin text-primary" />
                    <p className="mt-2 text-xs">Chargement des cabinets...</p>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-destructive">
                    <AlertTriangle className="mx-auto size-6" />
                    <p className="mt-2 text-sm">Erreur lors de la récupération des cabinets.</p>
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
                    <Building2 className="mx-auto size-8 opacity-40 mb-2" />
                    <p className="text-sm font-medium text-foreground">Aucun cabinet trouvé</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {searchQuery ? "Aucun résultat ne correspond à votre recherche." : "Commencez par ajouter votre premier cabinet médical."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => {
                  const isSuspended = tenant.status === "suspended";

                  return (
                    <tr
                      key={tenant._id}
                      className={`transition-colors hover:bg-muted/40 ${isSuspended ? "bg-amber-500/5" : ""}`}
                    >
                      {/* Cabinet Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex size-10 items-center justify-center rounded-lg ${
                              isSuspended
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            <Building2 className="size-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground flex items-center gap-2">
                              {tenant.name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span className="inline-flex items-center gap-1 font-medium text-primary">
                                <Stethoscope className="size-3" />
                                {tenant.specialty || "Médecine générale"}
                              </span>
                              {tenant.phone && <span>· {tenant.phone}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Doctor / Owner */}
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            {tenant.owner?.name || "Dr. Non assigné"}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Mail className="size-3" />
                            {tenant.owner?.email || tenant.email || "—"}
                          </p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {isSuspended ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive border border-destructive/20">
                              <Ban className="size-3" />
                              Suspendu
                            </span>
                            {tenant.suspensionReason && (
                              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-medium">
                                Motif : {tenant.suspensionReason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 border border-emerald-500/20">
                            <CheckCircle2 className="size-3" />
                            Actif
                          </span>
                        )}
                      </td>

                      {/* Plan */}
                      <td className="px-5 py-4">
                        <span className="rounded-md border border-border bg-muted/60 px-2 py-1 text-xs font-medium text-foreground capitalize">
                          Plan {tenant.plan || "Pro"}
                        </span>
                      </td>

                      {/* Activity */}
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        <div className="space-y-0.5">
                          <p>
                            <span className="font-semibold text-foreground">{tenant.metrics?.patientCount ?? 0}</span> patients
                          </p>
                          <p>
                            <span className="font-semibold text-foreground">{tenant.metrics?.appointmentCount ?? 0}</span> RDV
                          </p>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="size-8 p-0">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel>Gestion du Cabinet</DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            {/* Toggle Suspension */}
                            {isSuspended ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  setStatusDialogTenant(tenant);
                                }}
                                className="text-emerald-600 font-medium cursor-pointer"
                              >
                                <CheckCircle2 className="size-4 mr-2" />
                                Réactiver l'accès
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  setStatusDialogTenant(tenant);
                                  setSuspensionReason("Retard de paiement");
                                }}
                                className="text-amber-600 font-medium cursor-pointer"
                              >
                                <Ban className="size-4 mr-2" />
                                Suspendre l'accès (Impayé)
                              </DropdownMenuItem>
                            )}

                            {/* Reset Password */}
                            <DropdownMenuItem
                              onClick={() => {
                                setResetPwdTenant(tenant);
                                setNewPasswordValue("Cabinet2025!");
                                setResetSuccessData(null);
                              }}
                              className="cursor-pointer"
                            >
                              <KeyRound className="size-4 mr-2" />
                              Changer le mot de passe
                            </DropdownMenuItem>

                            {/* Edit */}
                            <DropdownMenuItem
                              onClick={() => setEditingTenant(tenant)}
                              className="cursor-pointer"
                            >
                              <Edit2 className="size-4 mr-2" />
                              Modifier les détails
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* Delete */}
                            <DropdownMenuItem
                              onClick={() => {
                                if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le cabinet "${tenant.name}" ?`)) {
                                  deleteMutation.mutate(tenant._id);
                                }
                              }}
                              className="text-destructive cursor-pointer"
                            >
                              <Trash2 className="size-4 mr-2" />
                              Supprimer le cabinet
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Dialog: Create New Cabinet ────────────────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl">
          {createdCredentials ? (
            <div className="space-y-5 py-3">
              <DialogHeader>
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
                  <CheckCircle2 className="size-6" />
                </div>
                <DialogTitle className="text-center text-xl">Cabinet créé avec succès ! 🎉</DialogTitle>
                <DialogDescription className="text-center">
                  Le cabinet <strong>{createdCredentials.name}</strong> a été initialisé. Voici les identifiants de connexion à transmettre au médecin :
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
                    Email de connexion
                  </label>
                  <div className="flex items-center justify-between mt-1 rounded-lg border border-emerald-200 bg-white px-3 py-2">
                    <span className="font-mono text-sm text-foreground select-all">{createdCredentials.email}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="size-7 p-0 text-emerald-700 hover:text-emerald-900"
                      onClick={() => copyToClipboard(createdCredentials.email, "Email")}
                    >
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
                    Mot de passe initial
                  </label>
                  <div className="flex items-center justify-between mt-1 rounded-lg border border-emerald-200 bg-white px-3 py-2">
                    <span className="font-mono text-sm text-foreground select-all">{createdCredentials.password}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="size-7 p-0 text-emerald-700 hover:text-emerald-900"
                      onClick={() => copyToClipboard(createdCredentials.password, "Mot de passe")}
                    >
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="pt-2 text-xs text-emerald-800">
                  💡 <em>Note : Vous pourrez bientôt envoyer un lien d'activation sécurisé par email pour que le médecin définisse son propre mot de passe.</em>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    const text = `Vos accès Medical AI :\nCabinet : ${createdCredentials.name}\nEmail : ${createdCredentials.email}\nMot de passe : ${createdCredentials.password}\nLien : ${window.location.origin}/login`;
                    copyToClipboard(text, "Tous les identifiants");
                  }}
                >
                  <Copy className="size-4 mr-2" />
                  Copier tous les accès
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreatedCredentials(null);
                    setIsCreateOpen(false);
                  }}
                >
                  Fermer
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleCreateSubmit}>
              <DialogHeader>
                <DialogTitle className="text-xl">Créer un nouveau cabinet médical</DialogTitle>
                <DialogDescription>
                  Ajoutez un nouveau client, configurez sa spécialité et définissez ses accès de connexion.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Nom du cabinet / clinique *</label>
                    <Input name="clinicName" required placeholder="Ex: Cabinet Dr. Ben Amor" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Spécialité médicale *</label>
                    <select
                      name="specialty"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {SPECIALTIES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Médecin responsable *</label>
                    <Input name="ownerName" required placeholder="Ex: Dr. Sami Ben Amor" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Email de connexion *</label>
                    <Input name="ownerEmail" type="email" required placeholder="docteur@cabinet.com" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Téléphone du cabinet</label>
                    <Input name="phone" placeholder="Ex: +216 71 000 000" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Formule d'abonnement</label>
                    <select
                      name="plan"
                      defaultValue="pro"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="starter">Starter (1 praticien)</option>
                      <option value="pro">Pro (Multi-praticiens + IA)</option>
                      <option value="enterprise">Entreprise / Clinique</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Adresse du cabinet</label>
                  <Input name="address" placeholder="Ex: 12 Rue de Marseille, Tunis" />
                </div>

                {/* Password Selection */}
                <div className="rounded-xl border border-border bg-muted/40 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Mot de passe initial</label>
                    <button
                      type="button"
                      onClick={() => setAutoGenPassword(!autoGenPassword)}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      {autoGenPassword ? "Définir manuellement" : "Générer automatiquement"}
                    </button>
                  </div>

                  {autoGenPassword ? (
                    <p className="text-xs text-muted-foreground">
                      Un mot de passe sécurisé et complexe sera généré automatiquement et vous sera affiché après création.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      <Input
                        type="text"
                        value={customPassword}
                        onChange={(e) => setCustomPassword(e.target.value)}
                        placeholder="Mot de passe"
                        required
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Vous pouvez modifier ce mot de passe ou le laisser par défaut.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Créer et activer le cabinet
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Edit Cabinet ──────────────────────────────── */}
      <Dialog open={!!editingTenant} onOpenChange={(open) => !open && setEditingTenant(null)}>
        <DialogContent className="max-w-xl">
          {editingTenant && (
            <form onSubmit={handleUpdateSubmit}>
              <DialogHeader>
                <DialogTitle className="text-xl">Modifier le cabinet {editingTenant.name}</DialogTitle>
                <DialogDescription>
                  Mettez à jour les informations générales et le contact du cabinet.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Nom du cabinet *</label>
                    <Input name="name" defaultValue={editingTenant.name} required />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Spécialité</label>
                    <select
                      name="specialty"
                      defaultValue={editingTenant.specialty || "Dentisterie"}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {SPECIALTIES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Médecin responsable</label>
                    <Input name="ownerName" defaultValue={editingTenant.owner?.name || ""} />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Email du médecin</label>
                    <Input name="ownerEmail" type="email" defaultValue={editingTenant.owner?.email || editingTenant.email || ""} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Téléphone</label>
                    <Input name="phone" defaultValue={editingTenant.phone || ""} />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Formule</label>
                    <select
                      name="plan"
                      defaultValue={editingTenant.plan || "pro"}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Entreprise</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Adresse</label>
                  <Input name="address" defaultValue={editingTenant.address || ""} />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingTenant(null)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Enregistrer les modifications
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Status / Suspension Management ───────────── */}
      <Dialog open={!!statusDialogTenant} onOpenChange={(open) => !open && setStatusDialogTenant(null)}>
        <DialogContent className="max-w-md">
          {statusDialogTenant && (
            <div>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {statusDialogTenant.status === "active" ? (
                    <>
                      <Ban className="size-5 text-amber-600" />
                      Suspendre l'accès au cabinet
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-5 text-emerald-600" />
                      Réactiver l'accès au cabinet
                    </>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Cabinet : <strong>{statusDialogTenant.name}</strong>
                </DialogDescription>
              </DialogHeader>

              {statusDialogTenant.status === "active" ? (
                <div className="space-y-4 py-4">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    ⚠️ La suspension bloque immédiatement les connexions du médecin et de son équipe. Un message d'explication leur sera affiché lors de leur tentative de connexion.
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground">Motif de la suspension</label>
                    <select
                      value={suspensionReason}
                      onChange={(e) => setSuspensionReason(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                    >
                      <option value="Retard de paiement">Retard de paiement (Facture impayée)</option>
                      <option value="Période d'essai expirée">Période d'essai expirée</option>
                      <option value="Demande du client">Demande du client</option>
                      <option value="Maintenance / Révision administrative">Maintenance / Révision</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <p className="text-sm text-foreground">
                    En réactivant l'accès, le médecin et ses collaborateurs pourront à nouveau se connecter et utiliser l'ensemble des modules (agenda, IA, patients).
                  </p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setStatusDialogTenant(null)}>
                  Annuler
                </Button>
                <Button
                  variant={statusDialogTenant.status === "active" ? "destructive" : "default"}
                  disabled={statusMutation.isPending}
                  onClick={() => {
                    const newStatus = statusDialogTenant.status === "active" ? "suspended" : "active";
                    statusMutation.mutate({
                      id: statusDialogTenant._id,
                      status: newStatus,
                      suspensionReason: newStatus === "suspended" ? suspensionReason : undefined,
                    });
                  }}
                >
                  {statusMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {statusDialogTenant.status === "active" ? "Confirmer la suspension" : "Réactiver l'accès"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Reset Password ────────────────────────────── */}
      <Dialog open={!!resetPwdTenant} onOpenChange={(open) => !open && setResetPwdTenant(null)}>
        <DialogContent className="max-w-md">
          {resetSuccessData ? (
            <div className="space-y-4 py-2 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="size-6" />
              </div>
              <DialogTitle>Nouveau mot de passe prêt !</DialogTitle>
              <div className="rounded-lg border border-border bg-muted/50 p-4 text-left space-y-2">
                <p className="text-xs text-muted-foreground">Email : <strong className="text-foreground">{resetSuccessData.email}</strong></p>
                <div className="flex items-center justify-between bg-background p-2 rounded border border-border">
                  <span className="font-mono text-sm font-semibold">{resetSuccessData.password}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="size-7 p-0"
                    onClick={() => copyToClipboard(resetSuccessData.password, "Mot de passe")}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setResetPwdTenant(null)}>Terminer</Button>
              </DialogFooter>
            </div>
          ) : resetPwdTenant ? (
            <div>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <KeyRound className="size-5 text-primary" />
                  Réinitialiser le mot de passe
                </DialogTitle>
                <DialogDescription>
                  Pour le médecin du cabinet <strong>{resetPwdTenant.name}</strong> ({resetPwdTenant.owner?.email || resetPwdTenant.email})
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Nouveau mot de passe</label>
                  <Input
                    type="text"
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    placeholder="Entrez un nouveau mot de passe"
                    required
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setResetPwdTenant(null)}>
                  Annuler
                </Button>
                <Button
                  disabled={resetPwdMutation.isPending || !newPasswordValue}
                  onClick={() => {
                    resetPwdMutation.mutate({
                      id: resetPwdTenant._id,
                      newPassword: newPasswordValue,
                    });
                  }}
                >
                  {resetPwdMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Appliquer le mot de passe
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
