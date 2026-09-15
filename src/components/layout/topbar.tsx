import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, ChevronDown, HelpCircle, Search, Sparkles } from "lucide-react";
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
  const { notifications, unreadNotifications, markAllNotificationsRead, language, setLanguage } =
    useAppState();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  const userInitials = user?.initials ?? "??";
  const userName = user ? `${user.firstName} ${user.lastName}` : "";
  const userRole = user?.role ?? "";

  const { data: patients = [] } = useQuery<any[]>({
    queryKey: ["patients"],
    queryFn: () => api.get("/patients"),
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
          placeholder="Rechercher un patient, un rendez-vous…"
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
              <p className="text-sm font-semibold">Notifications</p>
              <button
                onClick={markAllNotificationsRead}
                className="text-xs font-medium text-accent hover:underline"
              >
                Tout marquer comme lu
              </button>
            </div>
            <div className="scroll-slim max-h-[360px] divide-y divide-border overflow-y-auto">
              {notifications.map((n) => (
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
              ))}
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
            <DropdownMenuLabel>Aide</DropdownMenuLabel>
            <DropdownMenuItem>Guide de démarrage</DropdownMenuItem>
            <DropdownMenuItem>Comment fonctionne la récupération</DropdownMenuItem>
            <DropdownMenuItem>Contacter le support</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="hidden h-9 gap-1.5 px-2 text-sm sm:flex">
              <Sparkles className="size-3.5 text-accent" />
              <span className="max-w-[140px] truncate">{user?.tenantName || "Cabinet"}</span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>Cabinets</DropdownMenuLabel>
            <DropdownMenuItem>{user?.tenantName || "Cabinet"} — Actuel</DropdownMenuItem>
            <DropdownMenuItem>Cabinet Ariana (bientôt)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Langue de l'interface</DropdownMenuLabel>
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
                className={cn(language === code && "font-semibold text-accent")}
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

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
              <Link to="/settings/clinic">Réglages du cabinet</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings/team">Équipe</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>Se déconnecter</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
