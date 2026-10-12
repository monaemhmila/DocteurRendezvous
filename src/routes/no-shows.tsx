import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAppState } from "@/hooks/use-app-state";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader, SectionCard, PatientAvatar, EmptyState } from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Calendar,
  MessageCircle,
  Clock,
  Sparkles,
  Search,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  CalendarPlus,
  X,
} from "lucide-react";
import { relativeDay, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/no-shows")({
  head: () => ({
    meta: [
      { title: "Gestion des No-Shows & Lapins — Sanovia AI" },
      {
        name: "description",
        content: "Détection, relance automatique WhatsApp et récupération des patients absents.",
      },
    ],
  }),
  component: NoShowsPage,
});

interface INoShowAppointment {
  id: string;
  _id?: string;
  patientId: string;
  patientName: string;
  phone?: string;
  noShowCount: number;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  treatment: string;
  status: string;
  recoveryStatus?: "identified" | "contacted" | "responded" | "booked" | "visited" | "no_response" | "dismissed" | string;
  recoveryId?: string;
}

const getRecoveryStatusConfig = (t: any): Record<string, { label: string; color: string }> => ({
  identified: { label: t.noShowsPage.statusIdentified, color: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" },
  contacted: { label: t.noShowsPage.statusContacted, color: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" },
  responded: { label: t.noShowsPage.statusResponded, color: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800" },
  booked: { label: t.noShowsPage.statusBooked, color: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800" },
  visited: { label: t.noShowsPage.statusVisited, color: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800" },
  no_response: { label: t.noShowsPage.statusNoResponse, color: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800" },
  dismissed: { label: t.noShowsPage.statusDismissed, color: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800" },
});

function NoShowsPage() {
  const { t } = useAppState();
  const [filterPeriod, setFilterPeriod] = useState<"all" | "today" | "week" | "pending_recovery">("all");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: noShows = [], isLoading: isLoadingNoShows, isError: isErrorNoShows } = useQuery<INoShowAppointment[]>({
    queryKey: ["no-shows"],
    queryFn: () => api.get("/appointments/no-shows"),
  });

  const { data: dashboardStats, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get("/stats/dashboard"),
  });

  const { data: analyticsStats, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["analytics-stats"],
    queryFn: () => api.get("/stats/analytics/overview"),
  });

  // Calculate stats
  const todayIso = new Date().toISOString().split("T")[0];
  const recoveredCount = useMemo(() => {
    return noShows.filter((n) => n.recoveryStatus === "booked" || n.recoveryStatus === "visited").length;
  }, [noShows]);

  // Filtered items
  const filteredNoShows = useMemo(() => {
    return noShows.filter((item) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = item.patientName.toLowerCase().includes(q);
        const matchPhone = (item.phone || "").toLowerCase().includes(q);
        const matchTreat = (item.treatment || "").toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchTreat) return false;
      }

      // Period / category filter
      if (filterPeriod === "today") {
        return item.date === todayIso;
      }
      if (filterPeriod === "pending_recovery") {
        return item.recoveryStatus === "identified" || item.recoveryStatus === "contacted";
      }
      return true;
    });
  }, [noShows, search, filterPeriod, todayIso]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-20">
      <PageHeader
        title={t.pages.noShowsTitle}
        subtitle={t.pages.noShowsSubtitle}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <Link to="/agenda">
                <Calendar className="size-3.5" /> {t.noShowsPage.viewAgenda}
              </Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
              <Link to="/recovery">
                <Sparkles className="size-3.5" /> {t.noShowsPage.recoveryModule}
              </Link>
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-muted-foreground">{t.noShowsPage.absencesToday}</p>
            <span className="p-2 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/30">
              <AlertCircle className="size-4" />
            </span>
          </div>
          {isLoadingDashboard ? (
            <p className="mt-2 text-3xl font-bold text-muted-foreground animate-pulse">...</p>
          ) : (
            <p className="mt-2 text-3xl font-bold text-foreground">{dashboardStats?.noShowsToday ?? 0}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">{t.noShowsPage.missedToday}</p>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-muted-foreground">{t.noShowsPage.thisWeek}</p>
            <span className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/30">
              <Calendar className="size-4" />
            </span>
          </div>
          {isLoadingDashboard ? (
            <p className="mt-2 text-3xl font-bold text-muted-foreground animate-pulse">...</p>
          ) : (
            <p className="mt-2 text-3xl font-bold text-foreground">{dashboardStats?.noShowsThisWeek ?? 0}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">{t.noShowsPage.weekTotal}</p>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-muted-foreground">{t.noShowsPage.recoveredPatients}</p>
            <span className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/30">
              <CheckCircle2 className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-purple-600 dark:text-purple-400">{recoveredCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t.noShowsPage.recoveredDesc}</p>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-muted-foreground">{t.noShowsPage.recoveryRate}</p>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
              <RotateCcw className="size-4" />
            </span>
          </div>
          {isLoadingAnalytics ? (
            <p className="mt-2 text-3xl font-bold text-muted-foreground animate-pulse">...</p>
          ) : (
            <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {analyticsStats?.noShowRecoveryRate != null ? Math.round(analyticsStats.noShowRecoveryRate) : 0}%
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">{t.noShowsPage.recoveryRateDesc}</p>
        </div>
      </div>

      {/* Main Table Section */}
      <SectionCard
        title={t.noShowsPage.historyTitle}
        description={t.noShowsPage.historyDesc}
        bodyClassName="p-0"
      >
        {/* Filter Bar */}
        <div className="p-4 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/20">
          {/* Quick tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { key: "all", label: `${t.noShowsPage.filterAll} (${noShows.length})` },
              { key: "today", label: t.noShowsPage.filterToday },
              { key: "pending_recovery", label: t.noShowsPage.filterPending },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterPeriod(tab.key as any)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                  filterPeriod === tab.key
                    ? "bg-background text-foreground shadow-2xs border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t.noShowsPage.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full pl-8 pr-3 rounded-lg border border-input bg-background text-xs shadow-2xs focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {isLoadingNoShows ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse">
            {t.noShowsPage.loading}
          </div>
        ) : isErrorNoShows ? (
          <div className="p-12 text-center text-destructive">
            {t.noShowsPage.errorLoading}
          </div>
        ) : filteredNoShows.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={t.noShowsPage.noAbsencesTitle}
            description={
              search || filterPeriod !== "all"
                ? t.noShowsPage.noAbsencesDescFilter
                : t.noShowsPage.noAbsencesDesc
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="px-5 py-3">{t.noShowsPage.colPatient}</th>
                  <th className="px-5 py-3">{t.noShowsPage.colDate}</th>
                  <th className="px-5 py-3">{t.noShowsPage.colSlot}</th>
                  <th className="px-5 py-3">{t.noShowsPage.colTreatment}</th>
                  <th className="px-5 py-3 text-center">{t.noShowsPage.colScore}</th>
                  <th className="px-5 py-3">{t.noShowsPage.colStatus}</th>
                  <th className="px-5 py-3 text-right">{t.noShowsPage.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredNoShows.map((n) => {
                  const recoveryStatusConfig = getRecoveryStatusConfig(t);
                  const statusKey = (n.recoveryStatus && recoveryStatusConfig[n.recoveryStatus]) ? n.recoveryStatus : "identified";
                  const statusConf = recoveryStatusConfig[statusKey] ?? recoveryStatusConfig["identified"]!;
                  const cleanPhone = (n.phone || "").replace(/[^0-9]/g, "");
                  const waUrl = cleanPhone
                    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Bonjour ${n.patientName}, suite à votre rendez-vous manqué au cabinet dentaire, nous restons à votre disposition pour vous reprogrammer un créneau.`)}`
                    : null;

                  return (
                    <tr key={n.id || n._id} className="transition-colors hover:bg-muted/30">
                      {/* Patient */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <PatientAvatar
                            initials={n.patientName.substring(0, 2).toUpperCase()}
                            id={n.patientId}
                            size="sm"
                          />
                          <div>
                            <Link
                              to="/patients/$id"
                              params={{ id: n.patientId }}
                              className="font-bold text-foreground hover:underline"
                            >
                              {n.patientName}
                            </Link>
                            {n.phone && (
                              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                {n.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-3.5 font-medium text-foreground">
                        {relativeDay(n.date)}
                        <span className="block text-[11px] text-muted-foreground font-mono">
                          {n.date}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="px-5 py-3.5 font-mono text-foreground font-semibold">
                        {n.startTime} - {n.endTime}
                      </td>

                      {/* Treatment */}
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-foreground">
                          {n.treatment || "Consultation dentaire"}
                        </span>
                      </td>

                      {/* Absences count */}
                      <td className="px-5 py-3.5 text-center">
                        {n.noShowCount > 1 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 px-2.5 py-0.5 rounded-full text-[11px]">
                            <AlertCircle className="size-3" /> {t.noShowsPage.multipleAbsences.replace("{count}", n.noShowCount.toString())}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full text-[11px]">
                            {t.noShowsPage.firstAbsence}
                          </span>
                        )}
                      </td>

                      {/* Recovery status */}
                      <td className="px-5 py-3.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border",
                            statusConf.color
                          )}
                        >
                          {statusConf.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {waUrl && (
                            <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800">
                              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="size-3" /> WhatsApp
                              </a>
                            </Button>
                          )}
                          <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1">
                            <Link to="/agenda">
                              <CalendarPlus className="size-3" /> {t.noShowsPage.btnReschedule}
                            </Link>
                          </Button>
                          <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                            <Link to="/patients/$id" params={{ id: n.patientId }}>
                              Dossier
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
