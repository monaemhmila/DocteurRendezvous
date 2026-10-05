import React, { useMemo, useState } from "react";
import { Patient } from "@/types";
import { SectionCard } from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  Droplets,
  HeartPulse,
  Info,
  Plus,
  ShieldCheck,
  Stethoscope,
  Trash2,
  TrendingUp,
  UserRound,
  Waves,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Area, AreaChart, CartesianGrid, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

interface CardioMetric {
  id: string;
  date: string;
  systolic: number;
  diastolic: number;
  heartRate: number;
  notes: string;
  oxygenSaturation?: number;
  symptoms?: string;
  context?: "Repos" | "Après effort" | "Matin" | "Soir";
}

type PressureStatus = "optimal" | "surveillance" | "elevated";

function getPressureStatus(systolic?: number, diastolic?: number): PressureStatus {
  if (!systolic || !diastolic) return "surveillance";
  if (systolic >= 140 || diastolic >= 90) return "elevated";
  if (systolic >= 130 || diastolic >= 85) return "surveillance";
  return "optimal";
}

function getStatusLabel(status: PressureStatus) {
  return {
    optimal: "Zone maîtrisée",
    surveillance: "À surveiller",
    elevated: "Revue recommandée",
  }[status];
}

function getStatusStyles(status: PressureStatus) {
  return {
    optimal: "border-emerald-200 dark:border-emerald-300/20 bg-emerald-50 dark:bg-emerald-300/10 text-emerald-700 dark:text-emerald-200",
    surveillance: "border-amber-200 dark:border-amber-300/20 bg-amber-50 dark:bg-amber-300/10 text-amber-700 dark:text-amber-200",
    elevated: "border-rose-200 dark:border-rose-300/20 bg-rose-50 dark:bg-rose-300/10 text-rose-700 dark:text-rose-200",
  }[status];
}

function formatDate(date: string, options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" }) {
  return new Date(date).toLocaleDateString("fr-FR", options);
}

function daysSince(date?: string) {
  if (!date) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000));
}

export function CardioChart({
  patient,
  onUpdate,
  isUpdating,
}: {
  patient: Patient;
  onUpdate: (data: Partial<Patient>) => void;
  isUpdating: boolean;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<CardioMetric | null>(null);
  const [activeRange, setActiveRange] = useState<"all" | "30d" | "90d">("all");

  const specialtyData = patient.specialtyData || {};
  const metrics: CardioMetric[] = specialtyData["cardioMetrics"] || [];

  const sortedMetrics = useMemo(
    () => [...metrics].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [metrics],
  );

  const visibleMetrics = useMemo(() => {
    if (activeRange === "all") return sortedMetrics;
    const days = activeRange === "30d" ? 30 : 90;
    const threshold = Date.now() - days * 86_400_000;
    return sortedMetrics.filter((metric) => new Date(metric.date).getTime() >= threshold);
  }, [activeRange, sortedMetrics]);

  const latest = sortedMetrics.at(-1);
  const previous = sortedMetrics.at(-2);
  const status = getPressureStatus(latest?.systolic, latest?.diastolic);
  const systolicDelta = latest && previous ? latest.systolic - previous.systolic : 0;
  const diastolicDelta = latest && previous ? latest.diastolic - previous.diastolic : 0;
  const heartRateDelta = latest && previous ? latest.heartRate - previous.heartRate : 0;
  const daysFromLast = daysSince(latest?.date);
  const average = sortedMetrics.length
    ? {
      systolic: Math.round(sortedMetrics.reduce((sum, metric) => sum + metric.systolic, 0) / sortedMetrics.length),
      diastolic: Math.round(sortedMetrics.reduce((sum, metric) => sum + metric.diastolic, 0) / sortedMetrics.length),
      heartRate: Math.round(sortedMetrics.reduce((sum, metric) => sum + metric.heartRate, 0) / sortedMetrics.length),
    }
    : null;

  const chartData = visibleMetrics.map((metric) => ({
    ...metric,
    formattedDate: formatDate(metric.date),
    pulsePressure: metric.systolic - metric.diastolic,
  }));

  const openCreateModal = () => {
    setEditingMetric({
      id: crypto.randomUUID(),
      date: new Date().toISOString().split("T")[0] as string,
      systolic: 120,
      diastolic: 80,
      heartRate: 70,
      oxygenSaturation: 98,
      notes: "",
      symptoms: "",
      context: "Repos",
    });
    setIsModalOpen(true);
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingMetric) return;
    const newMetrics = [editingMetric, ...metrics].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    onUpdate({ specialtyData: { ...specialtyData, cardioMetrics: newMetrics } });
    setIsModalOpen(false);
    setEditingMetric(null);
  };

  const removeMetric = (id: string) => {
    if (!window.confirm("Supprimer cette mesure du dossier ?")) return;
    onUpdate({ specialtyData: { ...specialtyData, cardioMetrics: metrics.filter((metric) => metric.id !== id) } });
  };

  const updateMetric = <K extends keyof CardioMetric>(key: K, value: CardioMetric[K]) => {
    setEditingMetric((current) => (current ? { ...current, [key]: value } : current));
  };

  const TooltipContent = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload as CardioMetric & { formattedDate: string };
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/95 p-4 text-xs text-slate-900 dark:text-white shadow-2xl backdrop-blur-xl">
        <p className="mb-3 font-bold text-slate-600 dark:text-slate-400">{new Date(item.date).toLocaleDateString("fr-FR", { dateStyle: "long" })}</p>
        <p className="flex items-center gap-2 font-black text-rose-600 dark:text-rose-200"><HeartPulse className="size-3.5" /> {item.systolic} / {item.diastolic} mmHg</p>
        <p className="mt-2 flex items-center gap-2 text-sky-600 dark:text-sky-200"><Activity className="size-3.5" /> {item.heartRate} bpm</p>
        {item.oxygenSaturation && <p className="mt-2 flex items-center gap-2 text-cyan-600 dark:text-cyan-200"><Droplets className="size-3.5" /> {item.oxygenSaturation}% SpO₂</p>}
      </div>
    );
  };

  return (
    <SectionCard title="Suivi cardiologique" description="Un cockpit clinique pour lire l'évolution, le contexte et les signaux à surveiller.">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#07101d] p-5 text-slate-900 dark:text-white shadow-2xl shadow-slate-200 dark:shadow-slate-950/20 sm:p-7">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(148,163,184,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.045)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="pointer-events-none absolute -right-32 -top-32 size-80 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 size-96 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 border-b border-slate-200 dark:border-white/10 pb-6 sm:flex-row sm:items-start">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-cyan-600 dark:text-cyan-200/70">
              <span className="flex items-center gap-1.5"><CircleDot className="size-3 text-emerald-500 dark:text-emerald-300" /> Dossier actif</span>
              <span className="text-slate-600">/</span>
              <span>Cardiology intelligence layer</span>
            </div>
            <h3 className="text-2xl font-black tracking-[-.04em] sm:text-3xl">Vue clinique de suivi</h3>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><UserRound className="size-4" /> Patient : <strong className="text-slate-700 dark:text-slate-200">{patient.firstName} {patient.lastName}</strong></p>
          </div>
          <Button onClick={openCreateModal} className="h-11 rounded-xl bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-400 dark:text-slate-950 dark:hover:bg-rose-300 px-4 font-black shadow-[0_0_28px_rgba(251,113,133,.2)]"><Plus className="mr-2 size-4" /> Nouvelle mesure</Button>
        </div>

        {metrics.length === 0 ? (
          <div className="relative py-16 text-center">
            <div className="mx-auto flex size-20 items-center justify-center rounded-3xl border border-cyan-200 dark:border-cyan-200/15 bg-cyan-50 dark:bg-cyan-300/10 text-cyan-600 dark:text-cyan-200"><HeartPulse className="size-10" /></div>
            <h4 className="mt-6 text-xl font-black">Le dossier est prêt à recevoir sa première mesure</h4>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">Ajoutez les constantes du jour pour initialiser la trajectoire et donner au cardiologue une lecture immédiate de l'évolution.</p>
            <Button onClick={openCreateModal} variant="outline" className="mt-6 rounded-full border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10"><Plus className="mr-2 size-4" /> Ajouter la première mesure</Button>
          </div>
        ) : (
          <div className="relative space-y-6 pt-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Dernière tension" value={`${latest?.systolic} / ${latest?.diastolic}`} unit="mmHg" icon={HeartPulse} tone="rose" delta={systolicDelta} helper={getStatusLabel(status)} />
              <MetricCard label="Fréquence cardiaque" value={`${latest?.heartRate}`} unit="bpm" icon={Activity} tone="sky" delta={heartRateDelta} helper={latest?.context || "Contexte non précisé"} />
              <MetricCard label="Moyenne du dossier" value={`${average?.systolic} / ${average?.diastolic}`} unit="mmHg" icon={Waves} tone="violet" helper={`${sortedMetrics.length} relevé${sortedMetrics.length > 1 ? "s" : ""} analysé${sortedMetrics.length > 1 ? "s" : ""}`} />
              <MetricCard label="Dernier relevé" value={daysFromLast === 0 ? "Aujourd'hui" : `J-${daysFromLast}`} unit="" icon={CalendarClock} tone="emerald" helper={latest ? formatDate(latest.date, { day: "numeric", month: "long", year: "numeric" }) : "—"} />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
              <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[.035] p-4 sm:p-6">
                <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div><div className="flex items-center gap-2"><TrendingUp className="size-4 text-cyan-600 dark:text-cyan-200" /><h4 className="font-black">Trajectoire tensionnelle</h4></div><p className="mt-1 text-xs text-slate-600 dark:text-slate-500">Lecture rapide des tendances enregistrées</p></div>
                  <div className="flex rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/20 p-1 text-[11px] font-bold text-slate-600 dark:text-slate-400"><button onClick={() => setActiveRange("30d")} className={cn("rounded-lg px-3 py-1.5", activeRange === "30d" && "bg-white/10 text-slate-900 dark:text-white")}>30 j</button><button onClick={() => setActiveRange("90d")} className={cn("rounded-lg px-3 py-1.5", activeRange === "90d" && "bg-white/10 text-slate-900 dark:text-white")}>90 j</button><button onClick={() => setActiveRange("all")} className={cn("rounded-lg px-3 py-1.5", activeRange === "all" && "bg-white/10 text-slate-900 dark:text-white")}>Tout</button></div>
                </div>
                <div className="h-[280px] w-full sm:h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                      <defs><linearGradient id="cardioSysFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fb7185" stopOpacity={.34} /><stop offset="100%" stopColor="#fb7185" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={.45} />
                      <XAxis dataKey="formattedDate" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} domain={[40, 190]} />
                      <RechartsTooltip content={<TooltipContent />} />
                      <ReferenceLine y={140} stroke="#fb7185" strokeDasharray="4 5" opacity={.45} label={{ value: "Seuil systolique", fill: "#fda4af", fontSize: 10, position: "insideTopRight" }} />
                      <ReferenceLine y={90} stroke="#fbbf24" strokeDasharray="4 5" opacity={.35} />
                      <Area type="monotone" dataKey="systolic" stroke="#fb7185" fill="url(#cardioSysFill)" strokeWidth={3} activeDot={{ r: 6, fill: "#fff", stroke: "#fb7185", strokeWidth: 3 }} />
                      <Area type="monotone" dataKey="diastolic" stroke="#fda4af" fill="none" strokeWidth={2.5} activeDot={{ r: 5, fill: "#fff", stroke: "#fda4af", strokeWidth: 2 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-slate-600 dark:text-slate-400"><span className="flex items-center gap-2"><span className="h-0.5 w-5 bg-rose-300" /> Systolique</span><span className="flex items-center gap-2"><span className="h-0.5 w-5 bg-rose-200" /> Diastolique</span><span className="flex items-center gap-2"><span className="h-0.5 w-5 border-t border-dashed border-rose-300" /> Seuil de revue</span></div>
              </div>

              <div className="space-y-4">
                <div className={cn("rounded-3xl border p-5", getStatusStyles(status))}><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] opacity-70">Lecture intelligente</p><h4 className="mt-2 text-lg font-black">{getStatusLabel(status)}</h4></div><span className="flex size-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-black/15">{status === "elevated" ? <AlertTriangle className="size-5" /> : <ShieldCheck className="size-5" />}</span></div><p className="mt-4 text-xs leading-6 opacity-80">{status === "elevated" ? "Une revue clinique est recommandée au regard de la dernière valeur enregistrée." : status === "surveillance" ? "La trajectoire mérite une observation régulière et une mise en contexte clinique." : "Les dernières constantes se situent dans une zone rassurante selon les seuils configurés."}</p><div className="mt-5 flex items-center justify-between border-t border-current/10 pt-4 text-[11px] font-bold"><span>Signal de suivi</span><span className="flex items-center gap-1">Voir détail <ChevronRight className="size-3" /></span></div></div>
                <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[.035] p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-600 dark:text-slate-500">Variation depuis le relevé précédent</p><p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">Pression artérielle</p></div><Info className="size-4 text-slate-600 dark:text-slate-500" /></div><div className="mt-5 grid grid-cols-3 gap-2"><DeltaCell label="SYS" value={systolicDelta} unit="mmHg" /><DeltaCell label="DIA" value={diastolicDelta} unit="mmHg" /><DeltaCell label="FC" value={heartRateDelta} unit="bpm" /></div></div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
              <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[.035] p-5"><div className="flex items-center justify-between"><h4 className="flex items-center gap-2 font-black"><Stethoscope className="size-4 text-cyan-600 dark:text-cyan-200" /> Synthèse du dossier</h4><span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-500">Auto-calculée</span></div><div className="mt-5 space-y-4"><SummaryRow label="Relevés disponibles" value={`${sortedMetrics.length}`} hint="mesures" /><SummaryRow label="Moyenne tensionnelle" value={`${average?.systolic}/${average?.diastolic}`} hint="mmHg" /><SummaryRow label="Moyenne fréquence" value={`${average?.heartRate}`} hint="bpm" /><SummaryRow label="Dernier contexte" value={latest?.context || "Non précisé"} hint="source" /></div></div>
              <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[.035] p-5"><div className="mb-5 flex items-center justify-between"><h4 className="flex items-center gap-2 font-black"><Clock3 className="size-4 text-violet-600 dark:text-violet-200" /> Journal des constantes</h4><span className="text-[11px] text-slate-600 dark:text-slate-500">{sortedMetrics.length} événements</span></div><div className="max-h-[270px] space-y-2 overflow-auto pr-1">{[...sortedMetrics].reverse().map((metric, index) => <div key={metric.id} className="group flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-black/15 p-3 transition-colors hover:border-slate-300 dark:border-white/15"><div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-300/10 text-rose-600 dark:text-rose-200"><HeartPulse className="size-4" />{index < sortedMetrics.length - 1 && <span className="absolute left-1/2 top-full h-3 w-px bg-white/10" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-black">{metric.systolic}/{metric.diastolic} <span className="font-normal text-slate-600 dark:text-slate-500">mmHg</span></p><span className="rounded-full bg-sky-50 dark:bg-sky-300/10 px-2 py-0.5 text-[10px] text-sky-600 dark:text-sky-200">{metric.heartRate} bpm</span>{metric.context && <span className="rounded-full bg-slate-100 dark:bg-white/5 px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-400">{metric.context}</span>}</div><p className="mt-1 text-[11px] text-slate-600 dark:text-slate-500">{formatDate(metric.date, { day: "numeric", month: "long", year: "numeric" })}{metric.notes ? ` · ${metric.notes}` : ""}</p></div><button onClick={() => removeMetric(metric.id)} className="rounded-lg p-2 text-slate-600 opacity-0 transition-opacity hover:bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-400 dark:text-slate-950 dark:hover:bg-rose-300/10 hover:text-rose-600 dark:text-rose-200 group-hover:opacity-100" aria-label="Supprimer la mesure"><Trash2 className="size-4" /></button></div>)}</div></div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl overflow-hidden border-slate-300 dark:border-slate-200/20 bg-white dark:bg-[#0a1220] text-slate-900 dark:text-white">
          <DialogHeader><DialogTitle className="flex items-center gap-3 text-2xl font-black"><span className="flex size-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-400 dark:text-slate-950 dark:hover:bg-rose-300/15 text-rose-600 dark:text-rose-200"><HeartPulse className="size-5" /></span> Nouveau relevé cardiologique</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="mt-4 space-y-5">
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-rose-200/10 bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-400 dark:text-slate-950 dark:hover:bg-rose-300/[.06] p-4 sm:grid-cols-3"><VitalInput label="Systolique" value={editingMetric?.systolic} onChange={(value) => updateMetric("systolic", value)} icon={<ArrowUpRight className="size-4" />} tone="rose" /><VitalInput label="Diastolique" value={editingMetric?.diastolic} onChange={(value) => updateMetric("diastolic", value)} icon={<ArrowDownRight className="size-4" />} tone="rose" /><VitalInput label="Fréquence" suffix="bpm" value={editingMetric?.heartRate} onChange={(value) => updateMetric("heartRate", value)} icon={<Activity className="size-4" />} tone="sky" /></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Saturation SpO₂ (%)</label><div className="relative"><Droplets className="absolute left-3 top-3.5 size-4 text-cyan-500 dark:text-cyan-300" /><Input type="number" min="50" max="100" value={editingMetric?.oxygenSaturation || ""} onChange={(event) => updateMetric("oxygenSaturation", Number(event.target.value))} className="h-11 border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 pl-10 text-slate-900 dark:text-white" placeholder="98" /></div></div><div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Date du relevé</label><Input type="date" value={editingMetric?.date || ""} onChange={(event) => updateMetric("date", event.target.value)} required className="h-11 border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white" /></div></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Contexte</label><select value={editingMetric?.context || "Repos"} onChange={(event) => updateMetric("context", event.target.value as CardioMetric["context"])} className="h-11 w-full rounded-md border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-3 text-sm text-slate-900 dark:text-white outline-none"><option className="bg-white dark:bg-slate-900">Repos</option><option className="bg-white dark:bg-slate-900">Après effort</option><option className="bg-white dark:bg-slate-900">Matin</option><option className="bg-white dark:bg-slate-900">Soir</option></select></div><div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Symptômes associés</label><Input value={editingMetric?.symptoms || ""} onChange={(event) => updateMetric("symptoms", event.target.value)} className="h-11 border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white" placeholder="Aucun / préciser" /></div></div>
            <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Note clinique</label><textarea value={editingMetric?.notes || ""} onChange={(event) => updateMetric("notes", event.target.value)} className="min-h-20 w-full resize-none rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-3 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40" placeholder="Contexte, observation ou commentaire pour le prochain suivi..." /></div>
            <DialogFooter className="border-t border-slate-200 dark:border-white/10 pt-5"><Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="border-slate-300 dark:border-white/15 bg-transparent text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10"><X className="mr-2 size-4" /> Annuler</Button><Button type="submit" disabled={isUpdating} className="bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-400 dark:text-slate-950 dark:hover:bg-rose-300 font-black"><Check className="mr-2 size-4" /> Enregistrer dans le dossier</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

function MetricCard({ label, value, unit, icon: Icon, tone, delta, helper }: { label: string; value: string; unit: string; icon: React.ElementType; tone: "rose" | "sky" | "violet" | "emerald"; delta?: number; helper: string }) {
  const toneMap = { rose: "text-rose-600 dark:text-rose-200 bg-rose-50 dark:bg-rose-300/10 border-rose-200 dark:border-rose-200/15", sky: "text-sky-600 dark:text-sky-200 bg-sky-50 dark:bg-sky-300/10 border-sky-200/15", violet: "text-violet-600 dark:text-violet-200 bg-violet-50 dark:bg-violet-300/10 border-violet-200 dark:border-violet-200/15", emerald: "text-emerald-600 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-300/10 border-emerald-200 dark:border-emerald-200/15" };
  return <div className={cn("relative overflow-hidden rounded-3xl border p-4", toneMap[tone])}><div className="absolute -right-6 -top-6 size-24 rounded-full bg-current opacity-[.06] blur-2xl" /><div className="relative flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] opacity-70">{label}</p><p className="mt-3 text-2xl font-black tracking-[-.04em]">{value} <span className="text-xs font-bold opacity-60">{unit}</span></p><p className="mt-2 truncate text-[11px] opacity-65">{helper}</p></div><Icon className="size-5 opacity-80" /></div>{typeof delta === "number" && <span className={cn("absolute bottom-4 right-4 flex items-center gap-0.5 text-[10px] font-black", delta > 0 ? "text-amber-200" : delta < 0 ? "text-emerald-600 dark:text-emerald-200" : "text-slate-600 dark:text-slate-400")}>{delta > 0 ? <ArrowUpRight className="size-3" /> : delta < 0 ? <ArrowDownRight className="size-3" /> : "="} {delta > 0 ? `+${delta}` : delta}</span>}</div>;
}

function DeltaCell({ label, value, unit }: { label: string; value: number; unit: string }) {
  const positive = value > 0;
  return <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-black/15 p-3"><p className="text-[10px] font-bold text-slate-600 dark:text-slate-500">{label}</p><p className={cn("mt-2 text-lg font-black", positive ? "text-amber-200" : value < 0 ? "text-emerald-600 dark:text-emerald-200" : "text-slate-600 dark:text-slate-300")}>{value > 0 ? `+${value}` : value}</p><p className="text-[10px] text-slate-600 dark:text-slate-500">{unit}</p></div>;
}

function SummaryRow({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-3 text-sm last:border-0 last:pb-0"><span className="text-slate-600 dark:text-slate-400">{label}</span><span className="text-right font-black text-slate-900 dark:text-white">{value} <small className="font-normal text-slate-600 dark:text-slate-500">{hint}</small></span></div>;
}

function VitalInput({ label, value, onChange, icon, tone, suffix }: { label: string; value?: number | undefined; onChange: (value: number) => void; icon: React.ReactNode; tone: "rose" | "sky"; suffix?: string }) {
  return <div className="space-y-2"><label className={cn("text-xs font-bold", tone === "rose" ? "text-rose-600 dark:text-rose-200" : "text-sky-600 dark:text-sky-200")}>{label} {suffix && <span className="font-normal opacity-60">({suffix})</span>}</label><div className="relative"><span className={cn("absolute left-3 top-3.5", tone === "rose" ? "text-rose-300" : "text-sky-300")}>{icon}</span><Input type="number" min="20" max="260" value={value || ""} onChange={(event) => onChange(Number(event.target.value))} required className="h-11 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/40 pl-9 text-lg font-black text-slate-900 dark:text-white" /></div></div>;
}
