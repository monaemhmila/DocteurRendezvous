import { createFileRoute, Link } from "@tanstack/react-router";
import { Megaphone, Play, RefreshCw, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  PageHeader,
  PatientAvatar,
  PriorityBadge,
  ProgressBar,
  ReasonBadge,
  SectionCard,
} from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { relativeDay } from "@/lib/format";

import { useAppState } from "@/hooks/use-app-state";

export const Route = createFileRoute("/recovery")({
  head: () => ({
    meta: [
      { title: "Récupération patients — Dental AI" },
      {
        name: "description",
        content: "Identifiez automatiquement les patients que votre cabinet risque de perdre.",
      },
    ],
  }),
  component: RecoveryPage,
});

/* Recovery type label mapping */
const typeLabel: Record<string, string> = {
  inactive_patient: "Patient inactif",
  interrupted_treatment: "Traitement interrompu",
  pending_quote: "Devis en attente",
  no_show: "Rendez-vous manqué",
  cancellation: "Annulation",
  overdue_checkup: "Contrôle dépassé",
  follow_up_required: "Suivi",
};

const statusLabel: Record<string, string> = {
  identified: "Identifié",
  queued: "En file",
  contacted: "Contacté",
  responded: "A répondu",
  booked: "RDV pris",
  visited: "Venu",
  no_response: "Sans réponse",
  dismissed: "Écarté",
};

function RecoveryPage() {
  const queryClient = useQueryClient();
  const { t } = useAppState();

  const { data: rawOpportunities = [], isLoading, isError } = useQuery<any[]>({
    queryKey: ["recovery"],
    queryFn: () => api.get("/recovery"),
  });

  // Filter out dummy patients used for doctor reservations
  const opportunities = rawOpportunities.filter(
    (opp: any) => opp.patientId?.phone !== "00000000"
  );

  const { data: stats } = useQuery<any>({
    queryKey: ["recovery-stats"],
    queryFn: () => api.get("/recovery/stats"),
  });

  const detectMutation = useMutation({
    mutationFn: () => api.post("/recovery/detect", {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["recovery"] });
      queryClient.invalidateQueries({ queryKey: ["recovery-stats"] });
      toast.success(t.recoveryPage.detectionComplete.replace("{count}", data.createdCount || 0));
    },
    onError: () => toast.error(t.recoveryPage.detectionError),
  });

  const summary = stats || {
    analyzed: 0,
    toRecover: 0,
    contacted: 0,
    replied: 0,
    booked: 0,
    completed: 0,
  };

  const funnel = [
    { stage: t.recoveryPage.funnelIdentified, value: summary.toRecover },
    { stage: t.recoveryPage.funnelContacted, value: summary.contacted },
    { stage: t.recoveryPage.funnelReplied, value: summary.replied },
    { stage: t.recoveryPage.funnelBooked, value: summary.booked },
    { stage: t.recoveryPage.funnelVisited, value: summary.completed },
  ];

  const maxFunnel = funnel[0]?.value || 1;

  /* Dynamically map using translation values */
  const typeLabel: Record<string, string> = {
    inactive_patient: t.recoveryPage.typeInactive,
    interrupted_treatment: t.recoveryPage.typeInterrupted,
    pending_quote: t.recoveryPage.typePendingQuote,
    no_show: t.recoveryPage.typeNoShow,
    cancellation: t.recoveryPage.typeCancellation,
    overdue_checkup: t.recoveryPage.typeOverdue,
    follow_up_required: t.recoveryPage.typeFollowUp,
  };

  const statusLabel: Record<string, string> = {
    identified: t.recoveryPage.statusIdentified,
    queued: t.recoveryPage.statusQueued,
    contacted: t.recoveryPage.statusContacted,
    responded: t.recoveryPage.statusResponded,
    booked: t.recoveryPage.statusBooked,
    visited: t.recoveryPage.statusVisited,
    no_response: t.recoveryPage.statusNoResponse,
    dismissed: t.recoveryPage.statusDismissed,
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title={t.recoveryPage.title}
        subtitle={t.recoveryPage.subtitle}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => detectMutation.mutate()}
              disabled={detectMutation.isPending}
            >
              {detectMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              {t.recoveryPage.detect}
            </Button>
            <Button>
              <Play className="mr-2 size-4" />
              {t.recoveryPage.launchCampaign}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: t.recoveryPage.analyzed, value: summary.analyzed },
          { label: t.recoveryPage.toRecover, value: summary.toRecover },
          { label: t.recoveryPage.contacted, value: summary.contacted },
          { label: t.recoveryPage.replied, value: summary.replied },
          { label: t.recoveryPage.recoveredAppts, value: summary.booked },
          { label: t.recoveryPage.completed, value: summary.completed },
        ].map((stat) => (
          <div key={stat.label} className="panel p-4 text-center">
            <p className="num text-2xl font-semibold text-foreground">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {stats?.financials && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="panel p-4 text-center">
            <p className="num text-2xl font-semibold text-foreground">{stats.financials.estimatedValue} DT</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.recoveryPage.estimatedValue}</p>
          </div>
          <div className="panel p-4 text-center">
            <p className="num text-2xl font-semibold text-foreground">{stats.financials.bookedValue} DT</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.recoveryPage.bookedValue}</p>
          </div>
          <div className="panel p-4 text-center">
            <p className="num text-2xl font-semibold text-accent">{stats.financials.recoveredValue} DT</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.recoveryPage.recoveredValue}</p>
          </div>
        </div>
      )}

      <SectionCard title={t.recoveryPage.funnelTitle} description={t.recoveryPage.funnelSubtitle}>
        <div className="grid gap-6 md:grid-cols-5">
          {funnel.map((s, i) => (
            <div key={s.stage} className="relative">
              {i > 0 && (
                <div className="absolute top-4 -left-3 hidden h-[2px] w-6 bg-border md:block" />
              )}
              <div className="flex flex-col items-center text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-ai-soft text-ai">
                  <span className="num text-lg font-semibold">{s.value}</span>
                </span>
                <p className="mt-3 text-[13px] font-medium text-foreground">{s.stage}</p>
                <div className="mt-2 w-full max-w-[120px]">
                  <ProgressBar
                    value={(s.value / maxFunnel) * 100}
                    tone="ai"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title={t.recoveryPage.opportunitiesTitle}
        description={t.recoveryPage.opportunitiesSubtitle.replace("{count}", opportunities.length.toString())}
        bodyClassName="p-0"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Megaphone className="mr-2 size-3.5" />
              {t.recoveryPage.campaigns}
            </Button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 font-medium text-muted-foreground">{t.recoveryPage.colPatient}</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">{t.recoveryPage.colType}</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">{t.recoveryPage.colReason}</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">{t.recoveryPage.colPriority}</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">{t.recoveryPage.colEstValue}</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">{t.recoveryPage.colStatus}</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">{t.recoveryPage.colDetectedOn}</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {opportunities.map((opp: any) => {
                const patient = opp.patientId;
                const patientName = patient
                  ? `${patient.firstName} ${patient.lastName}`
                  : t.recoveryPage.unknownPatient;
                const patientInitials = patient
                  ? `${patient.firstName?.[0] || ""}${patient.lastName?.[0] || ""}`
                  : "??";
                const patientPhone = patient?.phone || "";
                const patientId = patient?._id || opp.patientId;

                return (
                  <tr key={opp._id} className="transition-colors hover:bg-muted/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <PatientAvatar initials={patientInitials} id={String(patientId)} size="sm" />
                        <div>
                          <Link
                            to="/patients/$id"
                            params={{ id: String(patientId) }}
                            className="font-medium hover:underline"
                          >
                            {patientName}
                          </Link>
                          <p className="text-xs text-muted-foreground">{patientPhone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap bg-secondary text-secondary-foreground">
                        {typeLabel[opp.type] || opp.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[13px] text-muted-foreground max-w-[200px] truncate">
                      {opp.reason || "—"}
                    </td>
                    <td className="px-5 py-3">
                      {opp.priority && <PriorityBadge priority={opp.priority} />}
                    </td>
                    <td className="px-5 py-3 font-medium">
                      {opp.estimatedValue > 0 ? `${opp.estimatedValue} DT` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className="capitalize text-xs font-medium text-foreground">
                        {statusLabel[opp.status] || opp.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">
                      {opp.detectedAt ? new Date(opp.detectedAt).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/patients/$id" params={{ id: String(patientId) }}>
                          {t.recoveryPage.viewBtn}
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {isError && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-destructive">
                    {t.recoveryPage.errorLoading}
                  </td>
                </tr>
              )}
              {!isLoading && !isError && opportunities.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">
                    {t.recoveryPage.noOpportunities}
                  </td>
                </tr>
              )}
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">
                    <Loader2 className="inline mr-2 size-4 animate-spin" />
                    {t.common.loading}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
