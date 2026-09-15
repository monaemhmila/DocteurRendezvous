import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Cog,
  HeartPulse,
  Inbox,
  LayoutDashboard,
  ListOrdered,
  MessagesSquare,
  Plug,
  Repeat2,
  Sparkles,
  Stethoscope,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import { useAppState } from "@/hooks/use-app-state";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const groups: {
  label: string;
  items: { title: string; url: string; icon: React.ComponentType<{ className?: string }> }[];
}[] = [
  {
    label: "Workspace",
    items: [
      { title: "Tableau de bord", url: "/", icon: LayoutDashboard },
      { title: "Agenda", url: "/agenda", icon: CalendarDays },
      { title: "Patients", url: "/patients", icon: Users },
      { title: "Conversations", url: "/conversations", icon: MessagesSquare },
      { title: "Récupération patients", url: "/recovery", icon: HeartPulse },
    ],
  },
  {
    label: "Automatisation",
    items: [
      { title: "Assistant IA", url: "/ai-assistant", icon: Sparkles },
      { title: "Relances", url: "/follow-ups", icon: Repeat2 },
      { title: "Liste d'attente", url: "/waitlist", icon: ListOrdered },
      { title: "Absences", url: "/no-shows", icon: Inbox },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
      { title: "Revenus récupérés", url: "/revenue", icon: Wallet },
    ],
  },
  {
    label: "Réglages",
    items: [
      { title: "Cabinet", url: "/settings/clinic", icon: Stethoscope },
      { title: "Équipe", url: "/settings/team", icon: UserCog },
      { title: "Paramètres IA", url: "/settings/ai", icon: Cog },
      { title: "Communication", url: "/settings/communication", icon: Activity },
      { title: "Intégrations", url: "/settings/integrations", icon: Plug },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { aiGlobalActive } = useAppState();
  const { user } = useAuth();

  // Use auth user data if available, fallback to mock clinic name
  const displayName = user ? `${user.firstName} ${user.lastName}` : "—";
  const displayInitials = user?.initials ?? "??";
  const displayRole = user?.role ?? "";
  const tenantName = user?.tenantName ?? "Espace Pro";

  const isActive = (url: string) =>
    url === "/" ? pathname === "/" : pathname.startsWith(url);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="px-3 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          {!collapsed && (
            <span className="flex flex-col leading-none">
              <span className="text-sm font-semibold text-sidebar-foreground">Medical AI</span>
              <span className="mt-0.5 text-[11px] text-muted-foreground">
                Récupération patients
              </span>
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="scroll-slim">
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2.5">
                        <item.icon className="size-4 shrink-0" />
                        {!collapsed && <span className="truncate">{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-3 py-3">
        {collapsed ? (
          <span className="mx-auto flex size-8 items-center justify-center rounded-full bg-sidebar-accent text-[11px] font-semibold text-sidebar-accent-foreground">
            {displayInitials}
          </span>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="truncate text-[13px] font-medium text-sidebar-foreground">
                {tenantName}
              </p>
              <p
                className={cn(
                  "mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium",
                  aiGlobalActive ? "text-accent" : "text-muted-foreground",
                )}
              >
                <span className="size-1.5 rounded-full bg-current" />
                {aiGlobalActive ? "IA active" : "IA en pause"}
              </p>
            </div>
            <div className="flex items-center gap-2.5 rounded-lg bg-sidebar-accent px-2.5 py-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-sidebar text-[11px] font-semibold text-sidebar-foreground">
                {displayInitials}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium text-sidebar-accent-foreground">
                  {displayName}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {displayRole}
                </span>
              </span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
