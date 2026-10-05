import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertTriangle, Users, CalendarDays, UserCheck, Crown, Star, Package } from 'lucide-react';

interface QuotaItem { current: number; max: number; percent: number; exceeded: boolean; }
interface Feature { key: string; label: string; enabled: boolean; }
interface PlanUsageData {
  plan: string;
  limits: Record<string, any>;
  quotas: { patients: QuotaItem; users: QuotaItem; appointmentsThisMonth: QuotaItem; };
  features: Feature[];
}

const PLAN_META: Record<string, { label: string; color: string; bg: string; border: string; icon: any; price: number }> = {
  starter:    { label: 'Starter',    color: 'text-slate-600',  bg: 'bg-slate-50 dark:bg-slate-900/40',   border: 'border-slate-200 dark:border-slate-700',  icon: Package, price: 49  },
  pro:        { label: 'Pro',        color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-700', icon: Star,    price: 99  },
  enterprise: { label: 'Enterprise', color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20',   border: 'border-amber-200 dark:border-amber-700',  icon: Crown,   price: 249 },
};

function QuotaBar({ label, icon: Icon, current, max, percent, exceeded }: {
  label: string; icon: any; current: number; max: number; percent: number; exceeded: boolean;
}) {
  const isUnlimited = max === -1;
  const barColor = exceeded ? 'bg-red-500' : percent > 80 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
          <Icon className="size-3.5" />{label}
        </div>
        <span className={cn('font-bold', exceeded ? 'text-red-600' : 'text-foreground')}>
          {current.toLocaleString()}{!isUnlimited && ` / ${max.toLocaleString()}`}
          {isUnlimited && <span className="ml-1 text-emerald-600 text-[10px] font-bold">Illimité</span>}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all duration-700', barColor)} style={{ width: `${percent}%` }} />
        </div>
      )}
      {exceeded && <p className="text-[10px] text-red-600 font-semibold">Limite atteinte — passez au plan superieur</p>}
      {!exceeded && !isUnlimited && percent > 80 && <p className="text-[10px] text-amber-600">Proche de la limite ({percent}%)</p>}
    </div>
  );
}

export function PlanUsageWidget() {
  const { data, isLoading } = useQuery<PlanUsageData>({
    queryKey: ['plan-usage'],
    queryFn: () => api.get('/tenants/plan-usage'),
    refetchInterval: 60000,
  });

  if (isLoading || !data) return null;

  const meta = PLAN_META[data.plan] ?? PLAN_META['pro']!;
  const Icon = meta.icon;
  const anyExceeded = Object.values(data.quotas).some(q => q.exceeded);

  return (
    <div className={cn('rounded-2xl border-2 p-5 space-y-5', meta.border, meta.bg)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn('flex size-8 items-center justify-center rounded-lg border', meta.border)}>
            <Icon className={cn('size-4', meta.color)} />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Plan {meta.label}</p>
            <p className="text-[10px] text-muted-foreground">{meta.price} TND / mois</p>
          </div>
        </div>
        {anyExceeded && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 border border-red-200">
            <AlertTriangle className="size-3" /> Limite depassee
          </span>
        )}
      </div>

      <div className="space-y-4">
        <QuotaBar label="Patients" icon={Users} {...data.quotas.patients} />
        <QuotaBar label="Utilisateurs" icon={UserCheck} {...data.quotas.users} />
        <QuotaBar label="RDV ce mois-ci" icon={CalendarDays} {...data.quotas.appointmentsThisMonth} />
      </div>

      <div className="pt-3 border-t border-border/50">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">Fonctionnalites</p>
        <div className="grid grid-cols-2 gap-y-1 gap-x-2">
          {data.features.map(f => (
            <div key={f.key} className="flex items-center gap-1.5 text-[10px]">
              {f.enabled
                ? <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
                : <XCircle className="size-3 text-muted-foreground/30 shrink-0" />}
              <span className={f.enabled ? 'text-foreground' : 'text-muted-foreground/40 line-through'}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
