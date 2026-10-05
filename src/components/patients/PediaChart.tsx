import React, { useMemo, useState } from "react";
import { Patient } from "@/types";
import { SectionCard } from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { Baby, CalendarDays, Check, CircleDot, ClipboardList, Info, Plus, Ruler, Scaling, Sparkles, Trash2, TrendingUp, UserRound, Weight, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PediaMetric { id: string; date: string; weight: number; height: number; headCirc: number; notes: string; }
type Tone = "amber" | "emerald" | "sky";

function formatDate(date: string, options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }) {
  return new Date(date).toLocaleDateString("fr-FR", options);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function delta(current?: number | undefined, previous?: number | undefined) {
  if (current === undefined || previous === undefined) return null;
  return Number((current - previous).toFixed(2));
}

const TONE_TEXT: Record<Tone, string> = {
  amber: "text-amber-600 dark:text-amber-200",
  emerald: "text-emerald-600 dark:text-emerald-200",
  sky: "text-sky-600 dark:text-sky-200",
};

export function PediaChart({ patient, onUpdate, isUpdating }: { patient: Patient; onUpdate: (data: Partial<Patient>) => void; isUpdating: boolean }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<PediaMetric | null>(null);
  const [activeRange, setActiveRange] = useState<"all" | "recent">("all");
  const specialtyData = patient.specialtyData || {};
  const metrics: PediaMetric[] = specialtyData["pediaMetrics"] || [];
  const sortedMetrics = useMemo(() => [...metrics].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [metrics]);
  const chronological = useMemo(() => [...sortedMetrics].reverse(), [sortedMetrics]);
  const visibleChronological = activeRange === "recent" ? chronological.slice(-6) : chronological;
  const latest = sortedMetrics[0];
  const previous = sortedMetrics[1];

  const openModal = () => {
    setEditingMetric({ id: crypto.randomUUID(), date: todayIso(), weight: 0, height: 0, headCirc: 0, notes: "" });
    setIsModalOpen(true);
  };

  const saveMetric = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingMetric) return;
    const next = [editingMetric, ...metrics.filter((metric) => metric.id !== editingMetric.id)].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    onUpdate({ specialtyData: { ...specialtyData, pediaMetrics: next } });
    setIsModalOpen(false);
    setEditingMetric(null);
  };

  const deleteMetric = (id: string) => {
    if (!window.confirm("Supprimer cette mesure de l'historique ?")) return;
    onUpdate({ specialtyData: { ...specialtyData, pediaMetrics: metrics.filter((metric) => metric.id !== id) } });
  };

  const rangeClass = (active: boolean) =>
    cn("rounded-lg px-3 py-1.5 transition-all", active ? "bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white dark:shadow-none" : "hover:text-slate-900 dark:hover:text-white");

  return (
    <SectionCard title="Suivi pédiatrique" description="Une lecture claire de la trajectoire biométrique : poids, taille et périmètre crânien.">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl shadow-slate-200 dark:border-slate-800 dark:bg-[#07101d] dark:text-white dark:shadow-slate-950/20 sm:p-7">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(245,158,11,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,.05)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="pointer-events-none absolute -right-40 -top-40 size-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 size-96 rounded-full bg-emerald-500/10 blur-3xl" />

        {/* Header */}
        <div className="relative flex flex-col justify-between gap-5 border-b border-slate-200 pb-6 dark:border-white/10 sm:flex-row sm:items-start">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-amber-600 dark:text-amber-200/70">
              <CircleDot className="size-3 text-emerald-500 dark:text-emerald-300" /> Growth intelligence layer <span className="text-slate-400 dark:text-slate-600">/</span> dossier actif
            </div>
            <h3 className="text-2xl font-black tracking-[-.04em] sm:text-3xl">Pediatric growth command center</h3>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <UserRound className="size-4" /> Patient : <strong className="text-slate-700 dark:text-slate-200">{patient.firstName} {patient.lastName}</strong>
            </p>
          </div>
          <Button onClick={openModal} className="h-11 rounded-xl bg-amber-500 px-4 font-black text-white shadow-[0_0_28px_rgba(245,158,11,.25)] hover:bg-amber-600 dark:bg-amber-300 dark:text-slate-950 dark:shadow-[0_0_28px_rgba(252,211,77,.18)] dark:hover:bg-amber-200">
            <Plus className="mr-2 size-4" /> Nouvelle mesure
          </Button>
        </div>

        {/* KPIs */}
        <div className="relative grid gap-3 py-6 sm:grid-cols-2 xl:grid-cols-4">
          <OverviewCard icon={Weight} label="Dernier poids" value={latest ? `${latest.weight}` : "—"} unit="kg" helper={latest ? formatDate(latest.date) : "Aucun relevé"} tone="amber" />
          <OverviewCard icon={Ruler} label="Dernière taille" value={latest ? `${latest.height}` : "—"} unit="cm" helper="mesure longitudinale" tone="emerald" />
          <OverviewCard icon={Scaling} label="Périmètre crânien" value={latest ? `${latest.headCirc}` : "—"} unit="cm" helper="dernier relevé" tone="sky" />
          <OverviewCard icon={CalendarDays} label="Relevés disponibles" value={`${metrics.length}`} unit="" helper="historique du dossier" tone="violet" />
        </div>

        {!latest ? (
          <div className="relative rounded-[2rem] border border-dashed border-amber-300 bg-amber-50/60 p-12 text-center dark:border-amber-200/20 dark:bg-amber-300/[.04]">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-300/10 dark:text-amber-200"><Baby className="size-8" /></div>
            <h4 className="mt-5 text-xl font-black">Le carnet de croissance est prêt</h4>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">Ajoutez les premières constantes pour construire une trajectoire lisible et conserver chaque mesure dans le dossier.</p>
            <Button onClick={openModal} variant="outline" className="mt-5 rounded-full border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
              <Plus className="mr-2 size-4" /> Initialiser le suivi
            </Button>
          </div>
        ) : (
          <div className="relative space-y-5">
            <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
              {/* Charts */}
              <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[.035] sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <h4 className="flex items-center gap-2 font-black"><TrendingUp className="size-4 text-amber-600 dark:text-amber-200" /> Trajectoire biométrique</h4>
                    <p className="mt-1 text-xs text-slate-500">Les unités restent séparées pour une lecture clinique fidèle</p>
                  </div>
                  <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 text-[11px] font-bold text-slate-500 dark:border-white/10 dark:bg-black/20 dark:text-slate-400">
                    <button type="button" onClick={() => setActiveRange("recent")} className={rangeClass(activeRange === "recent")}>6 derniers</button>
                    <button type="button" onClick={() => setActiveRange("all")} className={rangeClass(activeRange === "all")}>Tout</button>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <GrowthMiniChart data={visibleChronological} dataKey="weight" color="#f59e0b" label="Poids" unit="kg" icon={Weight} />
                  <GrowthMiniChart data={visibleChronological} dataKey="height" color="#10b981" label="Taille" unit="cm" icon={Ruler} />
                  <GrowthMiniChart data={visibleChronological} dataKey="headCirc" color="#3b82f6" label="Périmètre crânien" unit="cm" icon={Scaling} />
                </div>
              </div>

              {/* Deltas */}
              <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[.035] sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="flex items-center gap-2 font-black"><Sparkles className="size-4 text-amber-600 dark:text-amber-200" /> Lecture du dernier relevé</h4>
                    <p className="mt-1 text-xs text-slate-500">Variations par rapport au précédent</p>
                  </div>
                  <Info className="size-4 text-slate-400 dark:text-slate-500" />
                </div>
                <div className="mt-5 space-y-3">
                  <DeltaRow label="Poids" value={delta(latest.weight, previous?.weight)} unit="kg" tone="amber" />
                  <DeltaRow label="Taille" value={delta(latest.height, previous?.height)} unit="cm" tone="emerald" />
                  <DeltaRow label="Périmètre crânien" value={delta(latest.headCirc, previous?.headCirc)} unit="cm" tone="sky" />
                </div>
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-3 text-[11px] leading-5 text-slate-500 dark:border-white/5 dark:bg-black/15">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Note :</span> les tendances affichées reprennent les mesures enregistrées dans le dossier et ne remplacent pas les courbes de référence adaptées à l'âge, au sexe et au contexte clinique.
                </div>
              </div>
            </div>

            {/* History */}
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[.035] sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="flex items-center gap-2 font-black"><ClipboardList className="size-4 text-amber-600 dark:text-amber-200" /> Historique des constantes</h4>
                  <p className="mt-1 text-xs text-slate-500">Timeline complète des mesures de croissance</p>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                  {metrics.length} relevé{metrics.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="mt-5 space-y-2">
                {sortedMetrics.map((metric, index) => (
                  <GrowthRow key={metric.id} metric={metric} previous={sortedMetrics[index + 1]} onDelete={() => deleteMetric(metric.id)} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl overflow-hidden border-slate-200 bg-white text-slate-900 dark:border-slate-200/20 dark:bg-[#0a1220] dark:text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-black">
              <span className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-300/10 dark:text-amber-200"><Baby className="size-5" /></span>
              Nouvelle mesure de croissance
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={saveMetric} className="mt-4 space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricInput label="Poids" unit="kg" value={editingMetric?.weight} step="0.01" icon={<Weight className="size-4" />} tone="amber" onChange={(value) => setEditingMetric((current) => (current ? { ...current, weight: Number(value) } : null))} />
              <MetricInput label="Taille" unit="cm" value={editingMetric?.height} step="0.5" icon={<Ruler className="size-4" />} tone="emerald" onChange={(value) => setEditingMetric((current) => (current ? { ...current, height: Number(value) } : null))} />
              <MetricInput label="Périmètre crânien" unit="cm" value={editingMetric?.headCirc} step="0.5" icon={<Scaling className="size-4" />} tone="sky" onChange={(value) => setEditingMetric((current) => (current ? { ...current, headCirc: Number(value) } : null))} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date de la mesure</label>
              <Input
                type="date"
                value={editingMetric?.date || ""}
                onChange={(event) => setEditingMetric((current) => (current ? { ...current, date: event.target.value } : null))}
                required
                className="h-11 max-w-xs border-slate-200 bg-slate-50 text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white dark:[color-scheme:dark]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Observation clinique</label>
              <textarea
                value={editingMetric?.notes || ""}
                onChange={(event) => setEditingMetric((current) => (current ? { ...current, notes: event.target.value } : null))}
                className="min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-300 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-600 dark:focus:border-amber-200/30"
                placeholder="Appétit, développement, observation ou commentaire du suivi..."
              />
            </div>
            <DialogFooter className="border-t border-slate-200 pt-5 dark:border-white/10">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:text-white dark:hover:bg-white/10">
                <X className="mr-2 size-4" /> Annuler
              </Button>
              <Button type="submit" disabled={isUpdating} className="bg-amber-500 font-black text-white hover:bg-amber-600 dark:bg-amber-300 dark:text-slate-950 dark:hover:bg-amber-200">
                <Check className="mr-2 size-4" /> {isUpdating ? "Sauvegarde..." : "Enregistrer la mesure"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

function GrowthMiniChart({ data, dataKey, color, label, unit, icon: Icon }: { data: PediaMetric[]; dataKey: "weight" | "height" | "headCirc"; color: string; label: string; unit: string; icon: React.ElementType }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/5 dark:bg-black/15">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300"><Icon className="size-3.5" style={{ color }} /> {label}</span>
        <span className="text-[10px] text-slate-400 dark:text-slate-600">{unit}</span>
      </div>
      {/* text-* drives the grid stroke via currentColor so it adapts to light/dark */}
      <div className="mt-3 h-24 text-slate-300 dark:text-slate-700">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 2, left: -30, bottom: 0 }}>
            <defs>
              <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="currentColor" opacity={0.5} vertical={false} />
            <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString("fr-FR", { month: "short" })} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <YAxis domain={["auto", "auto"]} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <RechartsTooltip content={<GrowthTooltip unit={unit} color={color} />} />
            <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#fill-${dataKey})`} strokeWidth={2.5} dot={{ r: 2.5, fill: color, stroke: color, strokeWidth: 1 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function GrowthTooltip({ active, payload, unit, color }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-xl dark:border-white/10 dark:bg-slate-950/95">
      <p className="mb-1 text-slate-500">{formatDate(payload[0].payload.date)}</p>
      <p className="font-black" style={{ color }}>{payload[0].value} {unit}</p>
    </div>
  );
}

function GrowthRow({ metric, previous, onDelete }: { metric: PediaMetric; previous?: PediaMetric | undefined; onDelete: () => void }) {
  const weightDelta = previous ? delta(metric.weight, previous.weight) : null;
  return (
    <div className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 transition-colors hover:border-slate-300 dark:border-white/5 dark:bg-black/10 dark:hover:border-white/15">
      <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-300/10 dark:text-amber-200"><CircleDot className="size-4" /></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-black text-slate-900 dark:text-white">{formatDate(metric.date)}</p>
          <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-300/10 dark:text-amber-200">{metric.weight} kg</span>
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-300/10 dark:text-emerald-200">{metric.height} cm</span>
          <span className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-bold text-sky-700 dark:bg-sky-300/10 dark:text-sky-200">PC {metric.headCirc} cm</span>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          {metric.notes || "Aucune observation ajoutée"}
          {weightDelta !== null ? ` · Variation poids ${weightDelta > 0 ? "+" : ""}${weightDelta} kg` : ""}
        </p>
      </div>
      <button type="button" onClick={onDelete} className="rounded-lg p-2 text-slate-400 opacity-0 transition-opacity hover:bg-rose-100 hover:text-rose-600 group-hover:opacity-100 dark:text-slate-600 dark:hover:bg-rose-400/10 dark:hover:text-rose-200" aria-label="Supprimer la mesure">
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function DeltaRow({ label, value, unit, tone }: { label: string; value: number | null; unit: string; tone: Tone }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/5 dark:bg-black/15">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <span className={cn("font-black", TONE_TEXT[tone])}>{value === null ? "—" : `${value > 0 ? "+" : ""}${value} ${unit}`}</span>
    </div>
  );
}

function MetricInput({ label, unit, value, step, icon, tone, onChange }: { label: string; unit: string; value?: number | undefined; step: string; icon: React.ReactNode; tone: Tone; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <label className={cn("text-xs font-bold", TONE_TEXT[tone])}>{label} <span className="font-normal opacity-60">({unit})</span></label>
      <div className="relative">
        <span className={cn("absolute left-3 top-3.5", TONE_TEXT[tone])}>{icon}</span>
        <Input
          type="number"
          min="0"
          step={step}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          required
          className="h-11 border-slate-200 bg-slate-50 pl-9 text-lg font-black text-slate-900 dark:border-white/10 dark:bg-slate-950/30 dark:text-white"
        />
      </div>
    </div>
  );
}

function OverviewCard({ icon: Icon, label, value, unit, helper, tone }: { icon: React.ElementType; label: string; value: string; unit: string; helper: string; tone: Tone | "violet" }) {
  const styles = {
    amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-200/15 dark:bg-amber-300/10 dark:text-amber-100",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-200/15 dark:bg-emerald-300/10 dark:text-emerald-100",
    sky: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-200/15 dark:bg-sky-300/10 dark:text-sky-100",
    violet: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-200/15 dark:bg-violet-300/10 dark:text-violet-100",
  };
  return (
    <div className={cn("relative overflow-hidden rounded-3xl border p-4 transition-transform duration-300 hover:-translate-y-0.5", styles[tone])}>
      <div className="absolute -right-6 -top-6 size-24 rounded-full bg-current opacity-[.07] blur-2xl" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] opacity-60">{label}</p>
          <p className="mt-3 text-2xl font-black tracking-[-.04em]">{value} <span className="text-xs font-bold opacity-60">{unit}</span></p>
          <p className="mt-2 text-[11px] opacity-55">{helper}</p>
        </div>
        <Icon className="size-5 opacity-80" />
      </div>
    </div>
  );
}
