import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Building2, LogOut, Plus, Settings, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Cabinets", url: "/super-admin", icon: Building2 },
  { title: "Utilisateurs", url: "/super-admin/users", icon: Users },
  { title: "Paramètres", url: "/super-admin/settings", icon: Settings },
];

export function SuperAdminShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen w-full bg-surface">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-border bg-background">
        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <div className="leading-none">
            <p className="text-sm font-bold text-foreground">Medical AI</p>
            <p className="text-[11px] font-medium text-primary">Super Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.url}
              to={item.url}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&.active]:bg-primary/10 [&.active]:text-primary"
            >
              <item.icon className="size-4 shrink-0" />
              {item.title}
            </Link>
          ))}
        </nav>

        {/* Footer user */}
        <div className="border-t border-border p-3">
          <div className="mb-2 flex items-center gap-2.5 rounded-lg bg-muted px-3 py-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              {user?.initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-muted-foreground">Super Admin</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Se déconnecter
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="min-w-0 flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
