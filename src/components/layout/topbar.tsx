import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Check, ChevronDown, HelpCircle, Languages, Search, Sparkles, Building2, Mail, Phone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAppState } from "@/hooks/use-app-state";
import { useAuth } from "@/contexts/auth-context";
import { PatientAvatar } from "@/components/shared/ui-kit";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";

export function Topbar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [helpModal, setHelpModal] = useState<"none" | "getting_started" | "recovery" | "support">("none");
  const navigate = useNavigate();
  const { notifications, unreadNotifications, markAllNotificationsRead, language, setLanguage, t } =
    useAppState();
  const { user, logout, hasPermission } = useAuth();

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  const userInitials = user?.initials ?? "??";
  const userName = user ? `${user.firstName} ${user.lastName}` : "";
  const userRole = user?.role ?? "";

  // Fetch real current tenant info
  const { data: tenant } = useQuery<any>({
    queryKey: ["currentTenant"],
    queryFn: () => api.get("/tenants/current"),
  });

  const clinicName = tenant?.name || user?.tenantName || "Cabinet Médical";
  const clinicSpecialty = tenant?.specialty || "Cabinet Spécialisé";

  const { data: patients = [] } = useQuery<any[]>({
    queryKey: ["patients"],
    queryFn: async () => {
      const res = await api.get("/patients?limit=1000");
      return Array.isArray(res) ? res : (res.data || []);
    },
  });

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return patients
      .filter((p) => {
        const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
        return fullName.includes(q) || (p.phone && p.phone.replace(/\s/g, "").includes(q));
      })
      .slice(0, 6);
  }, [query, patients]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md sm:px-5">
      <SidebarTrigger className="text-muted-foreground" />

      <div className="relative mx-1 max-w-md flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder={t.topbar.searchPlaceholder}
          className="h-9 border-border bg-surface pl-9 text-sm"
        />
        {open && results.length > 0 && (
          <div className="panel absolute top-11 left-0 z-40 w-full overflow-hidden p-1 shadow-[var(--shadow-overlay)]">
            {results.map((p) => {
              const pInitials = `${p.firstName[0] || ""}${p.lastName[0] || ""}`;
              const pName = `${p.firstName} ${p.lastName}`;
              return (
                <button
                  key={p.id}
                  onMouseDown={() => navigate({ to: "/patients/$id", params: { id: p.id } })}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
                >
                  <PatientAvatar initials={pInitials} id={p.id} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {pName}
                    </span>
                    <span className="block text-xs text-muted-foreground">{p.phone}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground">
              <Bell className="size-4" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold text-destructive-foreground">
                  {unreadNotifications}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[340px] p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">{t.topbar.notifications}</p>
              <button
                onClick={markAllNotificationsRead}
                className="text-xs font-medium text-accent hover:underline"
              >
                {t.topbar.markAllRead}
              </button>
            </div>
            <div className="scroll-slim max-h-[360px] divide-y divide-border overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  {t.topbar.noNotifications}
                </div>
              ) : (
                notifications.map((n: any) => {
                  const content = (
                    <>
                      <p className="text-[13px] leading-snug font-medium text-foreground">
                        {n.title}
                      </p>
                      {n.detail && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{n.detail}</p>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground">{n.time}</p>
                    </>
                  );

                  return n.link ? (
                    <Link
                      key={n.id}
                      to={n.link}
                      className={cn("block px-4 py-3 transition-colors hover:bg-muted/50 cursor-pointer", !n.read && "bg-ai-soft/40")}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div
                      key={n.id}
                      className={cn("px-4 py-3", !n.read && "bg-ai-soft/40")}
                    >
                      {content}
                    </div>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <HelpCircle className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t.topbar.help}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setHelpModal("getting_started")} className="cursor-pointer">{t.topbar.gettingStarted}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setHelpModal("recovery")} className="cursor-pointer">{t.topbar.howRecoveryWorks}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setHelpModal("support")} className="cursor-pointer">{t.topbar.contactSupport}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Dynamic Cabinet & Language Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="hidden h-9 gap-1.5 px-2 text-sm sm:flex">
              <Sparkles className="size-3.5 text-accent" />
              <span className="max-w-[160px] truncate font-medium">{clinicName}</span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2">
            {/* Active Cabinet Card */}
            <div className="mb-2 rounded-lg border border-border/80 bg-muted/40 p-2.5">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Building2 className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{clinicName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{clinicSpecialty}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {t.topbar.active}
                </span>
              </div>
            </div>

            <DropdownMenuItem asChild>
              <Link to="/settings/clinic" className="cursor-pointer text-xs font-medium">
                {t.topbar.clinicSettings}
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1.5" />

            <DropdownMenuLabel className="flex items-center gap-1.5 px-2 text-xs font-semibold text-muted-foreground">
              <Languages className="size-3.5" />
              {t.topbar.interfaceLanguage}
            </DropdownMenuLabel>

            {(
              [
                ["fr", "Français"],
                ["en", "English"],
                ["ar", "العربية / Tunisien"],
              ] as const
            ).map(([code, label]) => (
              <DropdownMenuItem
                key={code}
                onClick={() => setLanguage(code)}
                className={cn(
                  "flex items-center justify-between cursor-pointer text-xs py-1.5",
                  language === code && "font-semibold text-accent bg-accent/10"
                )}
              >
                <span>{label}</span>
                {language === code && <Check className="size-3.5 text-accent" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Avatar Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex size-8 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
              {userInitials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <span className="block text-sm">{userName}</span>
              <span className="block text-xs font-normal text-muted-foreground">
                {userRole}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {hasPermission("settings") && (
              <>
                <DropdownMenuItem asChild>
                  <Link to="/settings/clinic">{t.topbar.clinicSettings}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings/team">{t.topbar.team}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleLogout}>
              {t.topbar.logout}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Help Modals */}
      <Dialog open={helpModal === "getting_started"} onOpenChange={(o) => setHelpModal(o ? "getting_started" : "none")}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Guide de Démarrage 🚀</DialogTitle>
            <DialogDescription>Bienvenue dans l'avenir de la gestion de votre cabinet.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 text-sm mt-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">🌟 Des Fonctionnalités Inédites pour vos Patients</h3>
              <p className="mt-2 text-muted-foreground">L'expérience patient n'a jamais été aussi fluide. Sur WhatsApp, votre IA est capable d'interagir avec le naturel d'un véritable assistant humain :</p>
              <ul className="mt-3 space-y-4">
                <li>
                  <strong className="text-foreground">Prise de Rendez-vous Intelligente</strong><br />
                  Le patient demande un créneau, l'IA vérifie vos disponibilités, qualifie l'urgence, et réserve directement.
                </li>
                <li>
                  <strong className="text-foreground">Gestion de la Famille (Proches)</strong><br />
                  Un patient peut prendre rendez-vous pour lui-même, mais aussi pour un proche ou un enfant. L'IA comprend le contexte.
                </li>
                <li>
                  <strong className="text-foreground">Suivi du Dossier Médical</strong><br />
                  L'IA est capable de répondre aux questions des patients concernant leur dossier médical ou recommandations post-opératoires.
                </li>
                <li>
                  <strong className="text-foreground">Multilingue & Naturelle</strong><br />
                  Elle s'adapte au ton et à la langue de votre patient (Français, Anglais, Arabe...) pour créer un lien de confiance.
                </li>
              </ul>
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold text-foreground">⚙️ Configuration Initiale</h3>
              <p className="mt-2 text-muted-foreground">Pour que l'IA puisse travailler, il lui suffit de connaître les règles de votre maison.</p>
              <ul className="mt-3 space-y-3 text-muted-foreground">
                <li><strong className="text-foreground">1. Réglages du cabinet :</strong> Vos coordonnées et horaires d'ouverture.</li>
                <li><strong className="text-foreground">2. Équipe :</strong> Ajoutez vos collaborateurs avec un système de rôles ultra-sécurisé.</li>
                <li><strong className="text-foreground">3. Assistant IA :</strong> Définissez votre catalogue de soins (durée, prix) et vos consignes (directives).</li>
              </ul>
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold text-foreground">2️⃣ Superviser les Conversations & Intervention</h3>
              <p className="mt-2 text-muted-foreground">Allez dans l'onglet <span className="font-medium text-foreground">Conversations</span> pour suivre l'activité de l'IA.</p>
              <ul className="mt-3 space-y-3 text-muted-foreground">
                <li><strong className="text-foreground">100% Automatique :</strong> Dans la majorité des cas, l'IA qualifie le besoin et confirme le rendez-vous sans aucune intervention de votre part.</li>
                <li><strong className="text-foreground">Escalade Intelligente vers l'Humain :</strong> L'IA détecte ses propres limites et vous passe le relais (avec une alerte visuelle) dans des cas précis :
                   <ul className="list-disc pl-5 mt-1 space-y-1">
                     <li>Questions purement médicales (diagnostics, symptômes complexes).</li>
                     <li>Demandes de devis lourds (implants, orthodontie globale).</li>
                     <li>Patients frustrés ou mécontents.</li>
                     <li>Incompréhension ou doute de la part de l'IA.</li>
                   </ul>
                </li>
                <li><strong className="text-foreground">Supervision en temps réel :</strong> Vous lisez tout en direct. En cas d'escalade, le secrétariat ou le médecin reprend la main de façon fluide.</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={helpModal === "recovery"} onOpenChange={(o) => setHelpModal(o ? "recovery" : "none")}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comment fonctionne la récupération ? 💸</DialogTitle>
            <DialogDescription>Le moteur de récupération de revenus (Revenue Recovery) de votre IA.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 text-sm mt-4">
            <div>
              <p className="text-muted-foreground mb-4">
                C'est ici que votre IA se transforme en un <strong>générateur de chiffre d'affaires</strong>. Elle traque chaque opportunité perdue pour la transformer en rendez-vous confirmé, sans que vous n'ayez rien à faire.
              </p>
              <h4 className="font-semibold text-base text-foreground">1. Bouclier Anti-Absences (No-Shows)</h4>
              <ol className="mt-3 space-y-3 text-muted-foreground list-decimal pl-5">
                <li><strong className="text-foreground">Détection :</strong> Lorsqu'un patient annule à la dernière minute ou ne se présente pas.</li>
                <li><strong className="text-foreground">Action Immédiate :</strong> L'IA le contacte automatiquement via WhatsApp avec bienveillance pour comprendre la raison et proposer de replanifier.</li>
                <li><strong className="text-foreground">Remplissage Instantané (Waitlist) :</strong> Si un créneau se libère aujourd'hui, l'IA contacte instantanément les patients sur votre <span className="font-medium text-foreground">Liste d'attente</span>. Votre agenda reste toujours plein !</li>
              </ol>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold text-base text-foreground">2. Les Campagnes de Relances (Follow-ups)</h4>
              <p className="mt-2 text-muted-foreground mb-3">L'IA gère 5 types de relances proactives pour ne perdre aucun patient :</p>
              <ul className="space-y-2 text-muted-foreground list-disc pl-5">
                <li><strong className="text-foreground">Absences & Annulations :</strong> Reprogrammation immédiate.</li>
                <li><strong className="text-foreground">Proposition de créneau :</strong> Envoi d'alertes à la liste d'attente (Waitlist).</li>
                <li><strong className="text-foreground">Rappel de contrôle :</strong> Convocation automatique des patients pour leur suivi annuel ou semestriel.</li>
                <li><strong className="text-foreground">Réengagement :</strong> Recontact bienveillant des patients inactifs depuis longtemps.</li>
              </ul>
            </div>
            <div className="bg-emerald-500/10 p-4 rounded-lg mt-4 border border-emerald-500/20">
              <p className="text-xs text-foreground">
                <strong>💡 Astuce Pro :</strong> Suivez les performances de l'IA (Revenus sauvés, Heures gagnées) en temps réel dans l'onglet <span className="font-bold text-emerald-600 dark:text-emerald-400">Insights &gt; Revenus</span>.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={helpModal === "support"} onOpenChange={(o) => setHelpModal(o ? "support" : "none")}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contacter le Support 📞</DialogTitle>
            <DialogDescription>Nous sommes là pour vous accompagner.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Mail className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Email</p>
                <p className="text-sm text-muted-foreground">support@medical-ai.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-success/10 text-success">
                <Phone className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">WhatsApp Direct</p>
                <p className="text-sm text-muted-foreground">+216 XX XXX XXX (9h-18h)</p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => setHelpModal("none")}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
