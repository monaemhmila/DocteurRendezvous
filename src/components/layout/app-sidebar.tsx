import { useMemo } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppState } from "@/hooks/use-app-state";
import { useAuth } from "@/contexts/auth-context";
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

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { user } = useAuth();
  const { t } = useAppState();

  const { data: tenant } = useQuery<any>({
    queryKey: ["currentTenant"],
    queryFn: () => api.get("/tenants/current"),
  });

  const displayName = user ? `${user.firstName} ${user.lastName}` : "—";
  const displayInitials = user?.initials ?? "??";
  const displayRole = user?.role ?? "";
  const tenantName = tenant?.name || user?.tenantName || "Cabinet Médical";

  const groups = useMemo(
    () => [
      {
        label: t.nav.workspace,
        items: [
          { title: t.nav.dashboard, url: "/", icon: LayoutDashboard },
          { title: t.nav.agenda, url: "/agenda", icon: CalendarDays },
          { title: t.nav.patients, url: "/patients", icon: Users },
          { title: t.nav.conversations, url: "/conversations", icon: MessagesSquare },
          { title: t.nav.recovery, url: "/recovery", icon: HeartPulse },
        ],
      },
      {
        label: t.nav.automation,
        items: [
          { title: t.nav.aiAssistant, url: "/ai-assistant", icon: Sparkles },
          { title: t.nav.followups, url: "/follow-ups", icon: Repeat2 },
          { title: t.nav.waitlist, url: "/waitlist", icon: ListOrdered },
          { title: t.nav.noShows, url: "/no-shows", icon: Inbox },
        ],
      },
      {
        label: t.nav.insights,
        items: [
          { title: t.nav.analytics, url: "/analytics", icon: BarChart3 },
          { title: t.nav.revenue, url: "/revenue", icon: Wallet },
        ],
      },
      {
        label: t.nav.settings,
        items: [
          { title: t.nav.clinic, url: "/settings/clinic", icon: Stethoscope },
          { title: t.nav.team, url: "/settings/team", icon: UserCog },
          { title: t.nav.aiSettings, url: "/settings/ai", icon: Cog },
          { title: t.nav.communication, url: "/settings/communication", icon: Activity },
          { title: t.nav.integrations, url: "/settings/integrations", icon: Plug },
        ],
      },
    ],
    [t],
  );

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
                {t.nav.patientRecovery}
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
              <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                {t.nav.aiAssistant}
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
