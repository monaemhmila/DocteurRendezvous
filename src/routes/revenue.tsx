import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader, SectionCard, StatCard } from "@/components/shared/ui-kit";
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, ArrowRight, Loader2 } from "lucide-react";
import { money, relativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/revenue")({
  component: RevenuePage,
});

function RevenuePage() {
  const { data: stats, isLoading: isLoadingStats, isError: isErrorStats } = useQuery<any>({
    queryKey: ["recovery-stats"],
    queryFn: () => api.get("/recovery/stats"),
  });

  const { data: opportunities = [], isLoading: isLoadingOpps, isError: isErrorOpps } = useQuery<any[]>({
    queryKey: ["recovery"],
    queryFn: () => api.get("/recovery"),
  });

  const isLoading = isLoadingStats || isLoadingOpps;
  const isError = isErrorStats || isErrorOpps;

  const recoveredValue = stats?.financials?.recoveredValue || 0;
  const potentialValue = stats?.financials?.estimatedValue || 0;
  const recoveredAppts = stats?.completed || 0;
  const bookedAppts = stats?.booked || 0;

  // Derive timeline from real recoveries
  const timeline = opportunities
    .filter((o) => ["booked", "visited"].includes(o.status))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10)
    .map((o) => ({
      label: o.patientId?.firstName ? `${o.patientId.firstName} ${o.patientId.lastName} - ${o.reason || o.type}` : o.type,
      date: o.updatedAt,
      amount: o.status === "visited" ? (o.recoveredValue || o.bookedValue || 0) : (o.bookedValue || o.estimatedValue || 0),
      type: o.status === "visited" ? "recovered" : "potential",
    }));

  if (isError) {
    return (
      <div className="p-12 text-center text-destructive">
        Impossible de charger les données de revenus.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center text-muted-foreground animate-pulse">
        <Loader2 className="inline mr-2 size-4 animate-spin" />
        Chargement...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-6 pb-20">
      <PageHeader
        title="Revenue Recovery"
        subtitle="Mesurez les rendez-vous et opportunités récupérés grâce à Dental AI."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="RDV récupérés (Venu)"
          value={recoveredAppts}
          hint="Total récupéré"
          tone="success"
        />
        <StatCard
          label="Traitements acceptés"
          value={bookedAppts}
          hint="RDV pris"
          tone="accent"
        />
        <div className="col-span-1 lg:col-span-2">
           <div className="panel h-full p-5 flex flex-col justify-center relative overflow-hidden bg-success-soft/30 border-success/30">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-success">
                 <Wallet className="size-24" />
              </div>
              <p className="text-[13px] font-medium text-muted-foreground">Valeur estimée récupérée</p>
              <div className="mt-2 flex items-baseline gap-3">
                 <p className="num text-4xl font-bold text-success">{money(recoveredValue)}</p>
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">Potentiel restant à récupérer : <span className="text-warning">{money(potentialValue)}</span></p>
           </div>
        </div>
      </div>

      <SectionCard title="Chronologie des récupérations" description="Historique récent des gains générés">
         <div className="relative border-l border-border ml-4 pl-8 space-y-8 py-2 mt-4">
            {timeline.length === 0 ? (
               <p className="text-sm text-muted-foreground">Aucun historique récent.</p>
            ) : (
               timeline.map((item, i) => (
                 <div key={i} className="relative">
                    <span className={cn(
                      "absolute -left-[41px] top-1 flex size-5 items-center justify-center rounded-full ring-4 ring-surface",
                      item.type === "recovered" ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"
                    )}>
                       {item.type === "recovered" ? <ArrowDownRight className="size-3" /> : <ArrowRight className="size-3" />}
                    </span>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                       <div>
                          <p className="text-sm font-semibold text-foreground">{item.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{relativeDay(item.date)}</p>
                       </div>
                       <div className={cn(
                         "text-lg font-bold num",
                         item.type === "recovered" ? "text-success" : "text-muted-foreground"
                       )}>
                          {item.type === "recovered" ? "+" : ""}{money(item.amount)}
                       </div>
                    </div>
                 </div>
               ))
            )}
         </div>
      </SectionCard>
    </div>
  );
}
