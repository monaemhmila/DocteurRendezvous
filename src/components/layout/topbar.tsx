import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Check, ChevronDown, HelpCircle, Languages, Search, Sparkles, Building2 } from "lucide-react";
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
import { useAppState } from "@/hooks/use-app-state";
import { useAuth } from "@/contexts/auth-context";
import { PatientAvatar } from "@/components/shared/ui-kit";
import { cn } from "@/lib/utils";

export function Topbar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { notifications, unreadNotifications, markAllNotificationsRead, language, setLanguage, t } =
    useAppState();
  const { user, logout } = useAuth();

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
                notifications.map((n: any) => (
                  <div
                    key={n.id}
                    className={cn("px-4 py-3", !n.read && "bg-ai-soft/40")}
                  >
                    <p className="text-[13px] leading-snug font-medium text-foreground">
                      {n.title}
                    </p>
                    {n.detail && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{n.detail}</p>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">{n.time}</p>
                  </div>
                ))
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
            <DropdownMenuItem>{t.topbar.gettingStarted}</DropdownMenuItem>
            <DropdownMenuItem>{t.topbar.howRecoveryWorks}</DropdownMenuItem>
            <DropdownMenuItem>{t.topbar.contactSupport}</DropdownMenuItem>
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
            <DropdownMenuItem asChild>
              <Link to="/settings/clinic">{t.topbar.clinicSettings}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings/team">{t.topbar.team}</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleLogout}>
              {t.topbar.logout}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
