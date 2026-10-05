import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Building2, Plus, Loader2, Search, CheckCircle2, AlertTriangle, Ban, KeyRound,
  Edit2, Trash2, Copy, Users, ShieldCheck, Stethoscope, Mail, MoreVertical,
  LayoutDashboard, Bell, CreditCard, Activity, Zap, AlertCircle, Info, Clock,
  CheckCheck, DollarSign, Percent, Bot, ChevronRight, RefreshCw, Crown, Star, Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/super-admin/")({
  component: SuperAdminDashboard,
});

interface TenantData {
  _id: string; name: string; specialty?: string; email?: string; phone?: string;
  address?: string; status: "active" | "suspended" | "trial"; suspensionReason?: string;
  plan?: "starter" | "pro" | "enterprise"; createdAt: string;
  owner?: { name: string; email: string } | null;
  metrics?: { userCount: number; patientCount: number; appointmentCount: number; aiBookingCount?: number };
  settings?: any;
}

const SPECIALTIES = ["Dentisterie","Cardiologie","Dermatologie","Ophtalmologie","Pediatrie",
  "Gynecologie","Medecine Generale","Orthopedie","ORL","Autre specialite"];

const PLAN_CONFIG = {
  starter:    { label: "Starter",    price: 49,  color: "text-slate-600",  bg: "bg-slate-100 dark:bg-slate-800",      border: "border-slate-300",  icon: Package },
  pro:        { label: "Pro",        price: 99,  color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-900/40", border: "border-violet-300", icon: Star    },
  enterprise: { label: "Enterprise", price: 249, color: "text-amber-600",  bg: "bg-amber-100 dark:bg-amber-900/40",  border: "border-amber-300",  icon: Crown   },
};

type TabId = "dashboard" | "cabinets" | "alerts" | "billing";

function Sparkline({ values, color = "bg-primary" }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {values.map((v, i) => (
        <div key={i} className={cn("flex-1 rounded-sm opacity-80 transition-all", color)}
          style={{ height: `${Math.max(4, (v / max) * 100)}%` }} />
      ))}
    </div>
  );
}

function AlertBadge({ severity }: { severity: "critical" | "warning" | "info" }) {
  const map = {
    critical: "bg-red-100 text-red-700 border-red-200",
    warning:  "bg-amber-100 text-amber-700 border-amber-200",
    info:     "bg-blue-100 text-blue-700 border-blue-200",
  };
  const labels = { critical: "Critique", warning: "Attention", info: "Info" };
  return <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", map[severity])}>{labels[severity]}</span>;
}

function SuperAdminDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string; name: string } | null>(null);
  const [autoGenPassword, setAutoGenPassword] = useState(false);
  const [customPassword, setCustomPassword] = useState("Cabinet2025!");
  const [editingTenant, setEditingTenant] = useState<TenantData | null>(null);
  const [statusDialogTenant, setStatusDialogTenant] = useState<TenantData | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("Retard de paiement");
  const [resetPwdTenant, setResetPwdTenant] = useState<TenantData | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [resetSuccessData, setResetSuccessData] = useState<{ email: string; password: string } | null>(null);
  const [planDialogTenant, setPlanDialogTenant] = useState<TenantData | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "pro" | "enterprise">("pro");
  const [configDialogTenant, setConfigDialogTenant] = useState<TenantData | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const { data: tenants = [], isLoading, isError } = useQuery<TenantData[]>({
    queryKey: ["tenants"],
    queryFn: () => api.get("/tenants"),
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/tenants", data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Cabinet cree avec succes !");
      setCreatedCredentials({ name: res.tenant?.name || "Cabinet", email: res.owner?.email || "", password: res.generatedPassword || customPassword });
    },
    onError: (err: any) => toast.error(err.message || "Erreur"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/tenants/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tenants"] }); toast.success("Mis a jour !"); setEditingTenant(null); },
    onError: (err: any) => toast.error(err.message || "Erreur"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, suspensionReason }: { id: string; status: string; suspensionReason?: string }) =>
      api.patch(`/tenants/${id}/status`, { status, suspensionReason }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tenants"] }); toast.success("Statut mis a jour !"); setStatusDialogTenant(null); },
    onError: (err: any) => toast.error(err.message || "Erreur"),
  });

  const resetPwdMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword?: string }) =>
      api.post(`/tenants/${id}/reset-password`, { newPassword }),
    onSuccess: (res) => { toast.success("Mot de passe reinitialise !"); setResetSuccessData({ email: res.email, password: res.newPassword }); },
    onError: (err: any) => toast.error(err.message || "Erreur"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tenants/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tenants"] }); toast.success("Cabinet supprime"); },
    onError: (err: any) => toast.error(err.message || "Erreur"),
  });

  const planMutation = useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: string }) => api.put(`/tenants/${id}`, { plan }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tenants"] }); toast.success("Plan mis a jour !"); setPlanDialogTenant(null); },
    onError: (err: any) => toast.error(err.message || "Erreur"),
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      clinicName: fd.get("clinicName"), specialty: fd.get("specialty"),
      ownerName: fd.get("ownerName"), ownerEmail: fd.get("ownerEmail"),
      phone: fd.get("phone"), address: fd.get("address"),
      plan: fd.get("plan") || "pro",
      ownerPassword: autoGenPassword ? undefined : customPassword,
    });
  };

  const handleUpdateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTenant) return;
    const fd = new FormData(e.currentTarget);
    updateMutation.mutate({ id: editingTenant._id, data: {
      name: fd.get("name"), specialty: fd.get("specialty"),
      ownerName: fd.get("ownerName"), ownerEmail: fd.get("ownerEmail"),
      phone: fd.get("phone"), address: fd.get("address"), plan: fd.get("plan"),
    }});
  };

  const handleConfigSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!configDialogTenant) return;
    const fd = new FormData(e.currentTarget);
    const doctorPhonesStr = fd.get("doctorPhones") as string;
    const doctorPhones = doctorPhonesStr ? doctorPhonesStr.split(",").map(s => s.trim()).filter(Boolean) : [];
    const adminPin = (fd.get("adminPin") as string) || "1234";
    
    updateMutation.mutate({ id: configDialogTenant._id, data: {
      settings: {
        ...configDialogTenant.settings,
        doctorPhones,
        adminPin,
        whatsappConfig: {
          ...configDialogTenant.settings?.whatsappConfig,
          phoneNumberId: fd.get("phoneNumberId"),
          accessToken: fd.get("accessToken"),
        }
      }
    }});
    setConfigDialogTenant(null);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text); toast.success(`${label} copie !`);
  };

  const totalTenants     = tenants.length;
  const activeTenants    = tenants.filter(t => t.status === "active").length;
  const suspendedTenants = tenants.filter(t => t.status === "suspended").length;
  const trialTenants     = tenants.filter(t => t.status === "trial").length;
  const totalPatients    = tenants.reduce((s, t) => s + (t.metrics?.patientCount || 0), 0);
  const totalAiBookings  = tenants.reduce((s, t) => s + (t.metrics?.aiBookingCount || 0), 0);
  const mrr = tenants.filter(t => t.status === "active")
    .reduce((s, t) => s + (PLAN_CONFIG[t.plan || "pro"]?.price || 99), 0);

  const planDistrib = useMemo(() => {
    const d = { starter: 0, pro: 0, enterprise: 0 };
    tenants.forEach(t => { if (t.plan && d[t.plan] !== undefined) d[t.plan]++; });
    return d;
  }, [tenants]);

  const alerts = useMemo(() => {
    const list: { id: string; severity: "critical" | "warning" | "info"; title: string; desc: string }[] = [];
    tenants.forEach(t => {
      if (t.status === "suspended") list.push({ id: `s-${t._id}`, severity: "critical", title: `Cabinet suspendu : ${t.name}`, desc: `Motif : ${t.suspensionReason || "Non precise"}. Contacter le medecin.` });
      if (t.status === "trial")     list.push({ id: `t-${t._id}`, severity: "warning",  title: `Essai en cours : ${t.name}`,    desc: "Convertir en plan payant ou suspendre." });
      if (!t.metrics?.patientCount && t.status === "active") list.push({ id: `p-${t._id}`, severity: "info", title: `${t.name} - Aucun patient`, desc: "Cabinet actif sans patients. Verifier l'onboarding." });
    });
    return list.filter(a => !dismissedAlerts.has(a.id));
  }, [tenants, dismissedAlerts]);

  const filteredTenants = tenants.filter(t => {
    const q = searchQuery.toLowerCase();
    const match = t.name.toLowerCase().includes(q) || (t.specialty || "").toLowerCase().includes(q)
      || (t.owner?.name || "").toLowerCase().includes(q) || (t.owner?.email || "").toLowerCase().includes(q);
    if (statusFilter === "active")    return match && t.status === "active";
    if (statusFilter === "suspended") return match && t.status === "suspended";
    return match;
  });

  const TABS: { id: TabId; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "dashboard", label: "Dashboard",   icon: LayoutDashboard },
    { id: "cabinets",  label: "Cabinets",    icon: Building2, badge: totalTenants },
    { id: "alerts",    label: "Alertes",     icon: Bell, badge: alerts.length },
    { id: "billing",   label: "Facturation", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Header sticky ───────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 shadow-lg">
              <ShieldCheck className="size-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-foreground">Super Admin</h1>
              <p className="text-[10px] text-muted-foreground">Panneau de controle global</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab("alerts")} className="relative size-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
              <Bell className="size-4 text-muted-foreground" />
              {alerts.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 size-4 flex items-center justify-center rounded-full bg-red-500 text-[9px] text-white font-bold">
                  {alerts.length}
                </span>
              )}
            </button>
            <Button size="sm" className="gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm text-xs"
              onClick={() => { setCreatedCredentials(null); setIsCreateOpen(true); }}>
              <Plus className="size-3.5" /> Nouveau Cabinet
            </Button>
          </div>
        </div>
        {/* Tab bar */}
        <div className="mx-auto max-w-7xl px-6 flex gap-0.5">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn("flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all",
                  activeTab === tab.id ? "border-violet-600 text-violet-600" : "border-transparent text-muted-foreground hover:text-foreground")}>
                <Icon className="size-3.5" />{tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                    tab.id === "alerts" ? "bg-red-500/10 text-red-600" : "bg-muted text-muted-foreground")}>{tab.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* ──────────────────────────────────────────────────────────
            TAB: DASHBOARD
        ────────────────────────────────────────────────────────── */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="col-span-2 lg:col-span-1 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-5 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/70">MRR</span>
                  <DollarSign className="size-4 text-white/60" />
                </div>
                <p className="mt-3 text-3xl font-bold">{mrr.toLocaleString()} TND</p>
                <p className="mt-1 text-xs text-white/70">Revenu mensuel estime</p>
                <div className="mt-3"><Sparkline values={[40,55,48,70,65,80,mrr/10||1]} color="bg-white/40" /></div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Actifs</span>
                  <CheckCircle2 className="size-4 text-emerald-600" />
                </div>
                <p className="mt-3 text-3xl font-bold text-foreground">{activeTenants}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {suspendedTenants > 0 && <span className="text-amber-600 font-medium">{suspendedTenants} susp. · </span>}
                  {trialTenants} essai
                </p>
                <div className="mt-3"><Sparkline values={[2,3,3,4,activeTenants-1||1,activeTenants,activeTenants]} color="bg-emerald-500" /></div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patients</span>
                  <Users className="size-4 text-primary" />
                </div>
                <p className="mt-3 text-3xl font-bold text-foreground">{totalPatients.toLocaleString()}</p>
                <p className="mt-1 text-xs text-muted-foreground">Total plateforme</p>
                <div className="mt-3"><Sparkline values={[100,150,200,280,350,totalPatients*0.8||1,totalPatients||1]} color="bg-blue-400" /></div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-violet-600">IA Bookings</span>
                  <Bot className="size-4 text-violet-600" />
                </div>
                <p className="mt-3 text-3xl font-bold text-foreground">{totalAiBookings.toLocaleString()}</p>
                <p className="mt-1 text-xs text-muted-foreground">RDV automatiques</p>
                <div className="mt-3"><Sparkline values={[5,12,20,35,50,70,totalAiBookings||80]} color="bg-violet-400" /></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Plan distribution */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
                  <Percent className="size-4 text-primary" />Plans
                </h3>
                <div className="space-y-3">
                  {(["enterprise", "pro", "starter"] as const).map(plan => {
                    const cfg = PLAN_CONFIG[plan]; const count = planDistrib[plan];
                    const pct = totalTenants > 0 ? Math.round((count/totalTenants)*100) : 0;
                    const Icon = cfg.icon;
                    return (
                      <div key={plan}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className={cn("flex size-5 items-center justify-center rounded", cfg.bg)}><Icon className={cn("size-3", cfg.color)} /></span>
                            <span className="text-xs font-medium">{cfg.label}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold">{count}</span>
                            <span className="text-[10px] text-muted-foreground">({pct}%)</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", plan==="enterprise"?"bg-amber-500":plan==="pro"?"bg-violet-500":"bg-slate-400")} style={{width:`${pct}%`}} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-5 pt-4 border-t border-border">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mb-2">Revenus par plan</p>
                  {(["enterprise", "pro", "starter"] as const).map(plan => {
                    const cfg = PLAN_CONFIG[plan];
                    return (
                      <div key={plan} className="flex items-center justify-between text-xs py-1">
                        <span className={cn("font-medium", cfg.color)}>{cfg.label}</span>
                        <span className="font-bold text-foreground">{(planDistrib[plan]*cfg.price).toLocaleString()} TND</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cabinet activity */}
              <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="p-5 border-b border-border flex items-center justify-between">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Activity className="size-4 text-primary" />Activite par cabinet
                  </h3>
                  <button onClick={() => setActiveTab("cabinets")} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                    Voir tous <ChevronRight className="size-3" />
                  </button>
                </div>
                <div className="divide-y divide-border">
                  {isLoading ? <div className="p-8 text-center"><Loader2 className="mx-auto size-5 animate-spin text-primary" /></div>
                  : tenants.slice(0, 6).map(tenant => {
                    const plan = PLAN_CONFIG[tenant.plan || "pro"]; const PI = plan.icon;
                    return (
                      <div key={tenant._id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                        <div className={cn("flex size-9 items-center justify-center rounded-lg shrink-0", plan.bg)}>
                          <Building2 className={cn("size-4", plan.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-xs text-foreground truncate">{tenant.name}</p>
                            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border", plan.bg, plan.color, plan.border)}>{plan.label}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{tenant.specialty || "Medecine generale"}</p>
                        </div>
                        <div className="flex items-center gap-5 text-right">
                          <div><p className="text-xs font-bold text-foreground">{tenant.metrics?.patientCount ?? 0}</p><p className="text-[10px] text-muted-foreground">patients</p></div>
                          <div><p className="text-xs font-bold text-foreground">{tenant.metrics?.appointmentCount ?? 0}</p><p className="text-[10px] text-muted-foreground">RDV</p></div>
                          <div className={cn("flex size-6 items-center justify-center rounded-full text-[9px] font-bold",
                            tenant.status==="active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                            {tenant.status==="active"?"✓":"✗"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
            TAB: CABINETS
        ────────────────────────────────────────────────────────── */}
        {activeTab === "cabinets" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-card" />
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1 text-xs font-medium">
                {[{id:"all",label:`Tous (${totalTenants})`},{id:"active",label:`Actifs (${activeTenants})`},{id:"suspended",label:`Suspendus (${suspendedTenants})`}].map(f => (
                  <button key={f.id} onClick={() => setStatusFilter(f.id as any)}
                    className={cn("rounded-lg px-3 py-1.5 transition-colors", statusFilter===f.id?"bg-background text-foreground shadow-sm font-semibold":"text-muted-foreground hover:text-foreground")}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3.5">Cabinet</th>
                      <th className="px-5 py-3.5">Medecin</th>
                      <th className="px-5 py-3.5">Statut</th>
                      <th className="px-5 py-3.5">Plan</th>
                      <th className="px-5 py-3.5">Activite</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isLoading ? <tr><td colSpan={6} className="p-12 text-center"><Loader2 className="mx-auto size-6 animate-spin text-primary" /></td></tr>
                    : isError   ? <tr><td colSpan={6} className="p-12 text-center text-destructive"><AlertTriangle className="mx-auto size-6" /><p className="mt-2 text-sm">Erreur de chargement.</p></td></tr>
                    : filteredTenants.length === 0 ? <tr><td colSpan={6} className="p-12 text-center text-muted-foreground"><Building2 className="mx-auto size-8 opacity-30 mb-2" /><p className="text-sm font-medium text-foreground">Aucun cabinet</p></td></tr>
                    : filteredTenants.map(tenant => {
                      const isSusp = tenant.status === "suspended";
                      const plan = PLAN_CONFIG[tenant.plan || "pro"]; const PI = plan.icon;
                      return (
                        <tr key={tenant._id} className={cn("transition-colors hover:bg-muted/40", isSusp && "bg-red-500/5")}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn("flex size-9 items-center justify-center rounded-xl", plan.bg)}><Building2 className={cn("size-4", plan.color)} /></div>
                              <div>
                                <p className="font-semibold text-xs text-foreground">{tenant.name}</p>
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Stethoscope className="size-3 text-primary" />{tenant.specialty || "Medecine generale"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-xs font-medium text-foreground">{tenant.owner?.name || "—"}</p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5"><Mail className="size-3" />{tenant.owner?.email || tenant.email || "—"}</p>
                          </td>
                          <td className="px-5 py-4">
                            {isSusp
                              ? <div><span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-600 border border-red-500/20"><Ban className="size-3" />Suspendu</span>{tenant.suspensionReason && <p className="text-[10px] text-amber-600 mt-1">{tenant.suspensionReason}</p>}</div>
                              : tenant.status === "trial"
                              ? <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 border border-amber-500/20"><Clock className="size-3" />Essai</span>
                              : <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 border border-emerald-500/20"><CheckCircle2 className="size-3" />Actif</span>}
                          </td>
                          <td className="px-5 py-4">
                            <span className={cn("inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold", plan.bg, plan.color, plan.border)}>
                              <PI className="size-3" />{plan.label}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-4">
                              <div><p className="font-bold text-foreground">{tenant.metrics?.patientCount ?? 0}</p><p className="text-[10px]">patients</p></div>
                              <div><p className="font-bold text-foreground">{tenant.metrics?.appointmentCount ?? 0}</p><p className="text-[10px]">RDV</p></div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="size-8 p-0"><MoreVertical className="size-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuLabel>Gestion</DropdownMenuLabel><DropdownMenuSeparator />
                                {isSusp
                                  ? <DropdownMenuItem onClick={() => setStatusDialogTenant(tenant)} className="text-emerald-600 cursor-pointer"><CheckCircle2 className="size-4 mr-2" />Reactiver</DropdownMenuItem>
                                  : <DropdownMenuItem onClick={() => { setStatusDialogTenant(tenant); setSuspensionReason("Retard de paiement"); }} className="text-amber-600 cursor-pointer"><Ban className="size-4 mr-2" />Suspendre</DropdownMenuItem>}
                                <DropdownMenuItem onClick={() => { setPlanDialogTenant(tenant); setSelectedPlan(tenant.plan || "pro"); }} className="cursor-pointer"><CreditCard className="size-4 mr-2" />Changer de plan</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setResetPwdTenant(tenant); setNewPasswordValue("Cabinet2025!"); setResetSuccessData(null); }} className="cursor-pointer"><KeyRound className="size-4 mr-2" />Reset mdp</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setEditingTenant(tenant)} className="cursor-pointer"><Edit2 className="size-4 mr-2" />Modifier</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setConfigDialogTenant(tenant)} className="cursor-pointer text-violet-600"><Bot className="size-4 mr-2" />Configurer IA / WA</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { if (window.confirm(`Supprimer "${tenant.name}" ?`)) deleteMutation.mutate(tenant._id); }} className="text-destructive cursor-pointer"><Trash2 className="size-4 mr-2" />Supprimer</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
            TAB: ALERTES
        ────────────────────────────────────────────────────────── */}
        {activeTab === "alerts" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Centre de notifications</h2>
                <p className="text-sm text-muted-foreground">{alerts.length} alerte(s) active(s)</p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => queryClient.invalidateQueries({ queryKey: ["tenants"] })}>
                <RefreshCw className="size-3.5" />Actualiser
              </Button>
            </div>
            {alerts.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-16 text-center">
                <div className="mx-auto size-16 flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4"><CheckCheck className="size-8 text-emerald-600" /></div>
                <p className="font-bold text-foreground text-lg">Tout est en ordre !</p>
                <p className="text-sm text-muted-foreground mt-1">Aucune alerte critique detectee.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map(alert => {
                  const icons  = { critical: <AlertCircle className="size-5 text-red-500 shrink-0" />, warning: <AlertTriangle className="size-5 text-amber-500 shrink-0" />, info: <Info className="size-5 text-blue-500 shrink-0" /> };
                  const bgs    = { critical: "border-red-200 bg-red-50/60 dark:border-red-800/40 dark:bg-red-950/20", warning: "border-amber-200 bg-amber-50/60 dark:border-amber-800/40 dark:bg-amber-950/20", info: "border-blue-200 bg-blue-50/60 dark:border-blue-800/40 dark:bg-blue-950/20" };
                  return (
                    <div key={alert.id} className={cn("rounded-xl border p-4 flex items-start gap-4", bgs[alert.severity])}>
                      {icons[alert.severity]}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1"><AlertBadge severity={alert.severity} /></div>
                        <p className="font-semibold text-sm text-foreground">{alert.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{alert.desc}</p>
                      </div>
                      <button onClick={() => setDismissedAlerts(s => new Set([...s, alert.id]))} className="shrink-0 text-muted-foreground hover:text-foreground text-xl leading-none font-light">&#215;</button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="rounded-2xl border border-border bg-card p-5 mt-4">
              <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2"><Zap className="size-4 text-primary" />Sante globale</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Operationnels", value: activeTenants,    total: totalTenants,          color: "bg-emerald-500" },
                  { label: "Essai",         value: trialTenants,     total: totalTenants,          color: "bg-amber-500"  },
                  { label: "Suspendus",     value: suspendedTenants, total: totalTenants,          color: "bg-red-500"    },
                  { label: "Alertes",       value: alerts.length,   total: Math.max(alerts.length,5), color: "bg-blue-500" },
                ].map(item => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-bold text-foreground">{item.value}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-700", item.color)}
                        style={{ width: `${item.total > 0 ? (item.value/item.total)*100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
            TAB: FACTURATION
        ────────────────────────────────────────────────────────── */}
        {activeTab === "billing" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-5 text-white shadow-lg">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/70">MRR Total</p>
                <p className="mt-2 text-4xl font-bold">{mrr.toLocaleString()}</p>
                <p className="text-sm text-white/70 mt-1">TND / mois</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ARR Estime</p>
                <p className="mt-2 text-4xl font-bold text-foreground">{(mrr * 12).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">TND / an</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ARPU moyen</p>
                <p className="mt-2 text-4xl font-bold text-foreground">{activeTenants > 0 ? Math.round(mrr/activeTenants) : 0}</p>
                <p className="text-sm text-muted-foreground mt-1">TND / cabinet / mois</p>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="font-bold text-sm text-foreground">Abonnements par cabinet</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Gerez les plans de chaque cabinet</p>
              </div>
              <div className="divide-y divide-border">
                {isLoading ? <div className="p-8 text-center"><Loader2 className="mx-auto size-5 animate-spin text-primary" /></div>
                : tenants.map(tenant => {
                  const plan = PLAN_CONFIG[tenant.plan || "pro"]; const PI = plan.icon;
                  return (
                    <div key={tenant._id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                      <div className={cn("flex size-9 items-center justify-center rounded-xl shrink-0", plan.bg)}><Building2 className={cn("size-4", plan.color)} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{tenant.name}</p>
                        <p className="text-[11px] text-muted-foreground">{tenant.owner?.email || "—"}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold", plan.bg, plan.color, plan.border)}>
                          <PI className="size-3" />{plan.label}
                        </span>
                        <div className="text-right min-w-[80px]">
                          <p className="font-bold text-foreground text-sm">{plan.price} TND</p>
                          <p className="text-[10px] text-muted-foreground">/ mois</p>
                        </div>
                        {tenant.status === "suspended"
                          ? <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5"><Ban className="size-2.5" />Suspendu</span>
                          : <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold px-2 py-0.5"><CheckCircle2 className="size-2.5" />Actif</span>}
                        <Button size="sm" variant="outline" className="text-xs gap-1.5 h-8"
                          onClick={() => { setPlanDialogTenant(tenant); setSelectedPlan(tenant.plan || "pro"); }}>
                          <RefreshCw className="size-3" />Changer
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ──── DIALOGS ──────────────────────────────────────────────── */}

      {/* Create */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl">
          {createdCredentials ? (
            <div className="space-y-5 py-3">
              <DialogHeader>
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2"><CheckCircle2 className="size-7" /></div>
                <DialogTitle className="text-center text-xl">Cabinet cree !</DialogTitle>
                <DialogDescription className="text-center">Transmettez ces identifiants au medecin :</DialogDescription>
              </DialogHeader>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
                {[{label:"Email",value:createdCredentials.email},{label:"Mot de passe",value:createdCredentials.password}].map(({label,value}) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-1">{label}</p>
                    <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-white px-3 py-2">
                      <span className="font-mono text-sm select-all">{value}</span>
                      <Button size="sm" variant="ghost" className="size-7 p-0 text-emerald-700" onClick={() => copyToClipboard(value, label)}><Copy className="size-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter className="gap-2">
                <Button onClick={() => copyToClipboard(`Email: ${createdCredentials.email}\nMot de passe: ${createdCredentials.password}`, "Identifiants")}><Copy className="size-4 mr-2" />Copier tout</Button>
                <Button variant="outline" onClick={() => { setCreatedCredentials(null); setIsCreateOpen(false); }}>Fermer</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleCreateSubmit}>
              <DialogHeader>
                <DialogTitle className="text-xl">Creer un nouveau cabinet</DialogTitle>
                <DialogDescription>Configurez la specialite, le medecin et les acces.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-xs font-medium">Nom du cabinet *</label><Input name="clinicName" required placeholder="Cabinet Dr. Ben Amor" /></div>
                  <div className="space-y-1.5"><label className="text-xs font-medium">Specialite *</label><select name="specialty" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-xs font-medium">Medecin *</label><Input name="ownerName" required placeholder="Dr. Sami Ben Amor" /></div>
                  <div className="space-y-1.5"><label className="text-xs font-medium">Email *</label><Input name="ownerEmail" type="email" required placeholder="docteur@cabinet.com" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-xs font-medium">Telephone</label><Input name="phone" placeholder="+216 71 000 000" /></div>
                  <div className="space-y-1.5"><label className="text-xs font-medium">Plan</label>
                    <select name="plan" defaultValue="pro" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="starter">Starter — 49 TND/mois</option>
                      <option value="pro">Pro — 99 TND/mois</option>
                      <option value="enterprise">Enterprise — 249 TND/mois</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5"><label className="text-xs font-medium">Adresse</label><Input name="address" placeholder="12 Rue de Marseille, Tunis" /></div>
                <div className="rounded-xl border border-border bg-muted/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold">Mot de passe initial</label>
                    <button type="button" onClick={() => setAutoGenPassword(!autoGenPassword)} className="text-xs text-primary hover:underline">
                      {autoGenPassword ? "Definir manuellement" : "Generer auto"}
                    </button>
                  </div>
                  {autoGenPassword
                    ? <p className="text-xs text-muted-foreground">Un mot de passe securise sera genere.</p>
                    : <Input type="text" value={customPassword} onChange={e => setCustomPassword(e.target.value)} required />}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                  {createMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}Creer le cabinet
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editingTenant} onOpenChange={open => !open && setEditingTenant(null)}>
        <DialogContent className="max-w-xl">
          {editingTenant && (
            <form onSubmit={handleUpdateSubmit}>
              <DialogHeader><DialogTitle>Modifier — {editingTenant.name}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-xs font-medium">Nom *</label><Input name="name" defaultValue={editingTenant.name} required /></div>
                  <div className="space-y-1.5"><label className="text-xs font-medium">Specialite</label><select name="specialty" defaultValue={editingTenant.specialty || "Dentisterie"} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-xs font-medium">Medecin</label><Input name="ownerName" defaultValue={editingTenant.owner?.name || ""} /></div>
                  <div className="space-y-1.5"><label className="text-xs font-medium">Email</label><Input name="ownerEmail" type="email" defaultValue={editingTenant.owner?.email || editingTenant.email || ""} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-xs font-medium">Telephone</label><Input name="phone" defaultValue={editingTenant.phone || ""} /></div>
                  <div className="space-y-1.5"><label className="text-xs font-medium">Plan</label><select name="plan" defaultValue={editingTenant.plan || "pro"} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="starter">Starter</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option></select></div>
                </div>
                <div className="space-y-1.5"><label className="text-xs font-medium">Adresse</label><Input name="address" defaultValue={editingTenant.address || ""} /></div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingTenant(null)}>Annuler</Button>
                <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}Enregistrer</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Status */}
      <Dialog open={!!statusDialogTenant} onOpenChange={open => !open && setStatusDialogTenant(null)}>
        <DialogContent className="max-w-md">
          {statusDialogTenant && (
            <div>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {statusDialogTenant.status === "active" ? <><Ban className="size-5 text-amber-600" />Suspendre</> : <><CheckCircle2 className="size-5 text-emerald-600" />Reactiver</>}
                </DialogTitle>
                <DialogDescription>Cabinet : <strong>{statusDialogTenant.name}</strong></DialogDescription>
              </DialogHeader>
              {statusDialogTenant.status === "active" ? (
                <div className="space-y-4 py-4">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">La suspension bloque immediatement les connexions.</div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Motif</label>
                    <select value={suspensionReason} onChange={e => setSuspensionReason(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="Retard de paiement">Retard de paiement</option>
                      <option value="Periode d'essai expiree">Essai expire</option>
                      <option value="Demande du client">Demande client</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="py-4"><p className="text-sm text-foreground">Le medecin pourra a nouveau se connecter.</p></div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setStatusDialogTenant(null)}>Annuler</Button>
                <Button
                  variant={statusDialogTenant.status === "active" ? "destructive" : "default"}
                  disabled={statusMutation.isPending}
                  onClick={() => {
                    const isSuspending = statusDialogTenant.status === "active";
                    const payload: { id: string; status: string; suspensionReason?: string } = {
                      id: statusDialogTenant._id,
                      status: isSuspending ? "suspended" : "active",
                    };
                    if (isSuspending) payload.suspensionReason = suspensionReason;
                    statusMutation.mutate(payload);
                  }}>
                  {statusMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {statusDialogTenant.status === "active" ? "Confirmer suspension" : "Reactiver"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Plan Change */}
      <Dialog open={!!planDialogTenant} onOpenChange={open => !open && setPlanDialogTenant(null)}>
        <DialogContent className="max-w-md">
          {planDialogTenant && (
            <div>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><CreditCard className="size-5 text-primary" />Changer de plan</DialogTitle>
                <DialogDescription>Cabinet : <strong>{planDialogTenant.name}</strong></DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-3">
                {(["starter", "pro", "enterprise"] as const).map(plan => {
                  const cfg = PLAN_CONFIG[plan]; const Icon = cfg.icon;
                  return (
                    <button key={plan} type="button" onClick={() => setSelectedPlan(plan)}
                      className={cn("w-full flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                        selectedPlan === plan ? cn(cfg.border, cfg.bg) : "border-border hover:border-muted-foreground/30")}>
                      <div className={cn("flex size-9 items-center justify-center rounded-lg", cfg.bg)}><Icon className={cn("size-4", cfg.color)} /></div>
                      <div className="flex-1">
                        <p className={cn("font-bold text-sm", selectedPlan === plan ? cfg.color : "text-foreground")}>{cfg.label}</p>
                        <p className="text-xs text-muted-foreground">{cfg.price} TND / mois</p>
                      </div>
                      {selectedPlan === plan && <CheckCircle2 className={cn("size-5", cfg.color)} />}
                    </button>
                  );
                })}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPlanDialogTenant(null)}>Annuler</Button>
                <Button disabled={planMutation.isPending} onClick={() => planMutation.mutate({ id: planDialogTenant._id, plan: selectedPlan })}>
                  {planMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Appliquer {PLAN_CONFIG[selectedPlan].label}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password */}
      <Dialog open={!!resetPwdTenant} onOpenChange={open => !open && setResetPwdTenant(null)}>
        <DialogContent className="max-w-md">
          {resetSuccessData ? (
            <div className="space-y-4 py-2 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="size-6" /></div>
              <DialogTitle>Mot de passe reinitialise !</DialogTitle>
              <div className="rounded-lg border border-border bg-muted/50 p-4 text-left space-y-2">
                <p className="text-xs text-muted-foreground">Email : <strong className="text-foreground">{resetSuccessData.email}</strong></p>
                <div className="flex items-center justify-between bg-background p-2 rounded border border-border">
                  <span className="font-mono text-sm font-semibold">{resetSuccessData.password}</span>
                  <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => copyToClipboard(resetSuccessData.password, "Mot de passe")}><Copy className="size-3.5" /></Button>
                </div>
              </div>
              <DialogFooter><Button onClick={() => setResetPwdTenant(null)}>Fermer</Button></DialogFooter>
            </div>
          ) : resetPwdTenant ? (
            <div>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><KeyRound className="size-5 text-primary" />Reinitialiser le mot de passe</DialogTitle>
                <DialogDescription>Pour : <strong>{resetPwdTenant.name}</strong> ({resetPwdTenant.owner?.email || resetPwdTenant.email})</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Nouveau mot de passe</label>
                  <Input type="text" value={newPasswordValue} onChange={e => setNewPasswordValue(e.target.value)} placeholder="Mot de passe" required />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setResetPwdTenant(null)}>Annuler</Button>
                <Button disabled={resetPwdMutation.isPending || !newPasswordValue} onClick={() => resetPwdMutation.mutate({ id: resetPwdTenant._id, newPassword: newPasswordValue })}>
                  {resetPwdMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}Appliquer
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Configurer IA / WhatsApp Dialog */}
      <Dialog open={!!configDialogTenant} onOpenChange={open => !open && setConfigDialogTenant(null)}>
        <DialogContent className="sm:max-w-md">
          {configDialogTenant && (
            <>
              <DialogHeader>
                <DialogTitle>Configuration IA & WhatsApp</DialogTitle>
                <DialogDescription>Variables techniques pour le cabinet "{configDialogTenant.name}"</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleConfigSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Numéros Médecins (séparés par virgule)</label>
                  <Input name="doctorPhones" defaultValue={(configDialogTenant.settings?.doctorPhones || []).join(", ")} placeholder="ex: 216XXXXXXXX, 336XXXXXXXX" />
                  <p className="text-[10px] text-muted-foreground">Numéros autorisés à chatter avec l'IA.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Code PIN Administrateur (Furtif)</label>
                  <Input name="adminPin" defaultValue={configDialogTenant.settings?.adminPin || "1234"} placeholder="ex: 1234" maxLength={4} />
                  <p className="text-[10px] text-muted-foreground">Code pour déverrouiller l'accès aux revenus côté clinique.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">WhatsApp Phone Number ID</label>
                  <Input name="phoneNumberId" defaultValue={configDialogTenant.settings?.whatsappConfig?.phoneNumberId || ""} placeholder="ex: 4212555..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">System Access Token</label>
                  <Input name="accessToken" type="password" defaultValue={configDialogTenant.settings?.whatsappConfig?.accessToken || ""} placeholder="EAA..." />
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setConfigDialogTenant(null)}>Annuler</Button>
                  <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Enregistrer"}</Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
