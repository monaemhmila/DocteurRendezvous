import React, { useMemo, useState } from "react";
import { Patient } from "@/types";
import { SectionCard } from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Baby,
  CalendarCheck2,
  CalendarHeart,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  FileText,
  HeartHandshake,
  Info,
  Plus,
  Sparkles,
  Stethoscope,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

interface GynecoMetric {
  id: string;
  date: string;
  ddr: string;
  sa: number;
  notes: string;
}

const PREGNANCY_TOTAL_DAYS = 280;

function formatDate(date: Date | string, options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }) {
  return new Date(date).toLocaleDateString("fr-FR", options);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getTrimester(sa: number) {
  if (sa < 14) return { number: 1, label: "1er trimestre", tone: "cyan" as const };
  if (sa < 28) return { number: 2, label: "2ème trimestre", tone: "violet" as const };
  return { number: 3, label: "3ème trimestre", tone: "rose" as const };
}

export function GynecoChart({ patient, onUpdate, isUpdating }: { patient: Patient; onUpdate: (data: Partial<Patient>) => void; isUpdating: boolean }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<GynecoMetric | null>(null);
  const [activeView, setActiveView] = useState<"overview" | "history">("overview");

  const specialtyData = patient.specialtyData || {};
  const metrics: GynecoMetric[] = specialtyData["gynecoMetrics"] || [];
  const sortedMetrics = useMemo(() => [...metrics].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [metrics]);
  const latest = sortedMetrics[0];
  const latestPregnancy = sortedMetrics.find((metric) => metric.ddr);

  const pregnancyData = useMemo(() => {
    if (!latestPregnancy?.ddr) return null;
    const ddr = new Date(latestPregnancy.ddr);
    const today = new Date();
    const daysSinceDdr = Math.floor((today.getTime() - ddr.getTime()) / 86_400_000);
    if (daysSinceDdr < 0 || daysSinceDdr > 300) return null;
    const currentSA = Math.floor(daysSinceDdr / 7);
    const currentSADays = daysSinceDdr % 7;
    const term = addDays(ddr, PREGNANCY_TOTAL_DAYS);
    const trimester = getTrimester(currentSA);
    return {
      ddr,
      term,
      daysSinceDdr,
      currentSA,
      currentSADays,
      trimester,
      progressPercent: Math.min(Math.max((daysSinceDdr / PREGNANCY_TOTAL_DAYS) * 100, 0), 100),
      remainingDays: Math.max(PREGNANCY_TOTAL_DAYS - daysSinceDdr, 0),
    };
  }, [latestPregnancy]);

  const openNewConsultation = () => {
    setEditingMetric({ id: crypto.randomUUID(), date: new Date().toISOString().split("T")[0] as string, ddr: latestPregnancy?.ddr || "", sa: 0, notes: "" });
    setIsModalOpen(true);
  };

  const saveConsultation = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingMetric) return;
    let finalSA = editingMetric.sa;
    if (!finalSA && editingMetric.ddr) {
      const ddrDate = new Date(editingMetric.ddr);
      const examDate = new Date(editingMetric.date);
      const diffDays = Math.floor((examDate.getTime() - ddrDate.getTime()) / 86_400_000);
      finalSA = Math.max(0, Math.floor(diffDays / 7));
    }
    const nextMetric = { ...editingMetric, sa: finalSA };
    const nextMetrics = [nextMetric, ...metrics.filter((metric) => metric.id !== nextMetric.id)].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    onUpdate({ specialtyData: { ...specialtyData, gynecoMetrics: nextMetrics } });
    setIsModalOpen(false);
    setEditingMetric(null);
  };

  const deleteConsultation = (id: string) => {
    if (!window.confirm("Supprimer cette consultation de l'historique ?")) return;
    onUpdate({ specialtyData: { ...specialtyData, gynecoMetrics: metrics.filter((metric) => metric.id !== id) } });
  };

  return (
    <SectionCard title="Suivi gynécologique & obstétrical" description="Un espace clinique pour lire la grossesse, le calendrier gestationnel et les comptes rendus au même endroit.">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#07101d] p-5 text-slate-900 dark:text-white shadow-2xl shadow-slate-200 dark:shadow-slate-950/20 sm:p-7">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(148,163,184,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.04)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="pointer-events-none absolute -right-40 -top-40 size-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 size-96 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 border-b border-slate-200 dark:border-white/10 pb-6 sm:flex-row sm:items-start"><div><div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-fuchsia-600 dark:text-fuchsia-200/70"><CircleDot className="size-3 text-emerald-500 dark:text-emerald-300" /> Obstetric intelligence layer <span className="text-slate-600">/</span> dossier actif</div><h3 className="text-2xl font-black tracking-[-.04em] sm:text-3xl">Maternal care command center</h3><p className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><UserRound className="size-4" /> Patiente : <strong className="text-slate-700 dark:text-slate-200">{patient.firstName} {patient.lastName}</strong></p></div><Button onClick={openNewConsultation} className="h-11 rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-700 dark:bg-fuchsia-300 px-4 font-black dark:text-slate-950 shadow-[0_0_28px_rgba(232,121,249,.18)] dark:hover:bg-fuchsia-200"><Plus className="mr-2 size-4" /> Nouvelle consultation</Button></div>

        <div className="relative grid gap-3 py-6 sm:grid-cols-2 xl:grid-cols-4"><OverviewCard icon={HeartHandshake} label="Consultations" value={`${metrics.length}`} helper="événements enregistrés" tone="fuchsia" /><OverviewCard icon={CalendarHeart} label="Grossesse active" value={pregnancyData ? "Active" : "À initialiser"} helper={pregnancyData ? `${pregnancyData.currentSA} SA + ${pregnancyData.currentSADays}j` : "DDR nécessaire"} tone="cyan" /><OverviewCard icon={CalendarCheck2} label="Terme prévu" value={pregnancyData ? formatDate(pregnancyData.term, { day: "numeric", month: "short" }) : "—"} helper={pregnancyData ? `${pregnancyData.remainingDays} jours estimés` : "—"} tone="violet" /><OverviewCard icon={FileText} label="Dernière note" value={latest ? formatDate(latest.date, { day: "numeric", month: "short" }) : "—"} helper={latest?.notes ? "Observation disponible" : "À compléter"} tone="slate" /></div>

        <div className="relative mb-5 flex rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/15 p-1 sm:w-fit"><button onClick={() => setActiveView("overview")} className={cn("rounded-xl px-4 py-2 text-xs font-bold transition-all", activeView === "overview" ? "bg-slate-200 text-slate-900 dark:bg-white/10 dark:text-white" : "text-slate-500 hover:text-slate-900 dark:hover:text-white")}>Vue grossesse</button><button onClick={() => setActiveView("history")} className={cn("rounded-xl px-4 py-2 text-xs font-bold transition-all", activeView === "history" ? "bg-slate-200 text-slate-900 dark:bg-white/10 dark:text-white" : "text-slate-500 hover:text-slate-900 dark:hover:text-white")}>Historique clinique</button></div>

        {activeView === "overview" ? <div className="relative space-y-5">
          {pregnancyData ? <PregnancyCommand pregnancyData={pregnancyData} latest={latest} /> : <EmptyPregnancy onAdd={openNewConsultation} />}
          <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
            <div className="rounded-[2rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[.035] p-5 sm:p-6"><div className="flex items-center justify-between"><div><h4 className="flex items-center gap-2 font-black"><Clock3 className="size-4 text-cyan-600 dark:text-cyan-200" /> Dernières consultations</h4><p className="mt-1 text-xs text-slate-500">Les événements les plus récents du dossier</p></div><button onClick={() => setActiveView("history")} className="flex items-center gap-1 text-[11px] font-bold text-cyan-600 hover:text-cyan-700 dark:text-cyan-200 dark:hover:text-cyan-100">Tout voir <ChevronRight className="size-3" /></button></div><div className="mt-5 space-y-2">{sortedMetrics.slice(0, 3).map((metric, index) => <ConsultationRow key={metric.id} metric={metric} index={index} onDelete={() => deleteConsultation(metric.id)} />)}{sortedMetrics.length === 0 && <p className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-6 text-center text-sm text-slate-500">Aucune consultation enregistrée.</p>}</div></div>
            <div className="rounded-[2rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[.035] p-5 sm:p-6"><div className="flex items-center justify-between"><div><h4 className="flex items-center gap-2 font-black"><Stethoscope className="size-4 text-fuchsia-600 dark:text-fuchsia-200" /> Repères du calendrier</h4><p className="mt-1 text-xs text-slate-500">Lecture temporelle du suivi</p></div><Sparkles className="size-4 text-fuchsia-600 dark:text-fuchsia-200" /></div><div className="mt-5 space-y-3"><Milestone label="DDR" date={pregnancyData ? formatDate(pregnancyData.ddr) : "À renseigner"} state={pregnancyData ? "done" : "pending"} /><Milestone label="Fin du 1er trimestre" date={pregnancyData ? formatDate(addDays(pregnancyData.ddr, 98)) : "—"} state={pregnancyData && pregnancyData.currentSA >= 14 ? "done" : "next"} /><Milestone label="Fin du 2ème trimestre" date={pregnancyData ? formatDate(addDays(pregnancyData.ddr, 196)) : "—"} state={pregnancyData && pregnancyData.currentSA >= 28 ? "done" : "next"} /><Milestone label="Terme théorique" date={pregnancyData ? formatDate(pregnancyData.term) : "—"} state={pregnancyData ? "next" : "pending"} /></div></div>
          </div>
        </div> : <HistoryView metrics={sortedMetrics} onDelete={deleteConsultation} onEdit={(metric) => { setEditingMetric(metric); setIsModalOpen(true); }} />}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}><DialogContent className="max-w-xl overflow-hidden border-slate-200 dark:border-slate-200/20 bg-white dark:bg-[#0a1220] text-slate-900 dark:text-white"><DialogHeader><DialogTitle className="flex items-center gap-3 text-2xl font-black"><span className="flex size-10 items-center justify-center rounded-xl bg-fuchsia-50 dark:bg-fuchsia-300/10 text-fuchsia-600 dark:text-fuchsia-200"><CalendarHeart className="size-5" /></span> Consultation gynécologique</DialogTitle></DialogHeader><form onSubmit={saveConsultation} className="mt-4 space-y-5"><div className="rounded-2xl border border-fuchsia-200 dark:border-fuchsia-200/15 bg-fuchsia-50 dark:bg-fuchsia-300/[.06] p-4"><div className="mb-4 flex items-center gap-2 text-fuchsia-700 dark:text-fuchsia-200"><AlertCircle className="size-4" /><p className="text-xs font-bold uppercase tracking-wider">Calculateur d'âge gestationnel</p></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">DDR</label><Input type="date" value={editingMetric?.ddr || ""} onChange={(event) => setEditingMetric((current) => current ? { ...current, ddr: event.target.value } : null)} className="h-11 border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white" /></div><div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">SA manuelle</label><Input type="number" min="0" max="45" placeholder="Calculée via DDR" value={editingMetric?.sa || ""} onChange={(event) => setEditingMetric((current) => current ? { ...current, sa: Number(event.target.value) } : null)} className="h-11 border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white" /></div></div><p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-slate-500"><Info className="mt-0.5 size-3.5 shrink-0 text-cyan-600 dark:text-cyan-200" /> Si la SA manuelle est vide, elle sera calculée à partir de la DDR et de la date de consultation.</p></div><div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date de la consultation</label><Input type="date" value={editingMetric?.date || ""} onChange={(event) => setEditingMetric((current) => current ? { ...current, date: event.target.value } : null)} required className="h-11 border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white" /></div><div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Observations cliniques / échographie</label><Textarea value={editingMetric?.notes || ""} onChange={(event) => setEditingMetric((current) => current ? { ...current, notes: event.target.value } : null)} className="min-h-28 resize-none border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-500" placeholder="Ex. compte rendu, observations, mesures, éléments à revoir..." /></div><DialogFooter className="border-t border-slate-200 dark:border-white/10 pt-5"><Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="border-slate-300 dark:border-white/15 bg-transparent text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10"><X className="mr-2 size-4" /> Annuler</Button><Button type="submit" disabled={isUpdating} className="bg-fuchsia-600 text-white hover:bg-fuchsia-700 dark:bg-fuchsia-300 font-black dark:text-slate-950 dark:hover:bg-fuchsia-200"><Check className="mr-2 size-4" /> {isUpdating ? "Sauvegarde..." : "Enregistrer la consultation"}</Button></DialogFooter></form></DialogContent></Dialog>
    </SectionCard>
  );
}

function PregnancyCommand({ pregnancyData, latest }: { pregnancyData: { ddr: Date; term: Date; currentSA: number; currentSADays: number; trimester: { number: number; label: string; tone: "cyan" | "violet" | "rose" }; progressPercent: number; remainingDays: number }; latest?: GynecoMetric | undefined }) {
  return <div className="relative overflow-hidden rounded-[2rem] border border-fuchsia-200 dark:border-fuchsia-200/15 bg-gradient-to-br from-fuchsia-100 via-violet-100 to-cyan-100 dark:from-fuchsia-300/[.14] dark:via-violet-500/[.07] dark:to-cyan-400/[.08] p-5 sm:p-7"><Baby className="pointer-events-none absolute -bottom-8 -right-8 size-44 text-fuchsia-500/10 dark:text-fuchsia-200/[.07]" /><div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-fuchsia-800 dark:text-fuchsia-100/70"><CalendarHeart className="size-4" /> Grossesse en cours</div><h4 className="mt-2 text-2xl font-black tracking-[-.04em]">Calendrier obstétrical</h4><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Lecture temporelle basée sur la DDR enregistrée</p></div><span className="flex items-center gap-2 rounded-full border border-emerald-300 dark:border-emerald-200/20 bg-emerald-50 dark:bg-emerald-300/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-100"><span className="size-1.5 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-300" /> Suivi actif</span></div><div className="relative mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><InfoCard label="DDR" value={formatDate(pregnancyData.ddr, { day: "numeric", month: "short", year: "numeric" })} /><InfoCard label="Âge gestationnel" value={`${pregnancyData.currentSA} SA`} accent={`${pregnancyData.currentSADays} jours`} highlight /><InfoCard label="Trimestre" value={pregnancyData.trimester.label} /><InfoCard label="Terme théorique" value={formatDate(pregnancyData.term, { day: "numeric", month: "short", year: "numeric" })} /></div><div className="relative mt-8"><div className="mb-3 flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400"><span>DDR · 0 SA</span><span>14 SA</span><span>28 SA</span><span>Terme · 40 SA</span></div><div className="relative h-3 overflow-visible rounded-full bg-slate-200 dark:bg-black/25"><div className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-400 dark:from-fuchsia-300 dark:via-violet-300 dark:to-cyan-200 shadow-[0_0_20px_rgba(232,121,249,.35)] transition-all duration-700" style={{ width: `${pregnancyData.progressPercent}%` }} /><span className="absolute left-[35%] top-0 h-full w-px bg-slate-400 dark:bg-white/30" /><span className="absolute left-[70%] top-0 h-full w-px bg-slate-400 dark:bg-white/30" /><span className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white dark:border-[#10182a] bg-fuchsia-500 dark:bg-white shadow-[0_0_20px_rgba(232,121,249,.6)] dark:shadow-[0_0_20px_rgba(255,255,255,.6)] transition-all duration-700" style={{ left: `${pregnancyData.progressPercent}%` }} /></div><div className="mt-4 flex items-center justify-between text-xs"><span className="text-fuchsia-800 dark:text-fuchsia-100">Progression : <strong>{Math.round(pregnancyData.progressPercent)}%</strong></span><span className="text-slate-500 dark:text-slate-400">Environ <strong className="text-slate-900 dark:text-white">{pregnancyData.remainingDays} jours</strong> restants</span></div></div>{latest?.notes && <div className="relative mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/15 p-4"><FileText className="mt-0.5 size-4 shrink-0 text-cyan-600 dark:text-cyan-200" /><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dernière observation</p><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{latest.notes}</p></div></div>}</div>;
}

function EmptyPregnancy({ onAdd }: { onAdd: () => void }) {
  return <div className="rounded-[2rem] border border-dashed border-fuchsia-200 dark:border-fuchsia-200/20 bg-fuchsia-50 dark:bg-fuchsia-300/[.04] p-10 text-center"><div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-fuchsia-100 dark:bg-fuchsia-300/10 text-fuchsia-600 dark:text-fuchsia-200"><CalendarHeart className="size-8" /></div><h4 className="mt-5 text-xl font-black">Le calendrier obstétrical est prêt</h4><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">Ajoutez une consultation avec la DDR pour initialiser la timeline, calculer l'âge gestationnel et visualiser le terme théorique.</p><Button onClick={onAdd} variant="outline" className="mt-5 rounded-full border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10"><Plus className="mr-2 size-4" /> Initialiser le suivi</Button></div>;
}

function HistoryView({ metrics, onDelete, onEdit }: { metrics: GynecoMetric[]; onDelete: (id: string) => void; onEdit: (metric: GynecoMetric) => void }) {
  return <div className="relative rounded-[2rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[.035] p-5 sm:p-7"><div className="mb-6 flex items-center justify-between"><div><h4 className="flex items-center gap-2 text-xl font-black"><HeartHandshake className="size-5 text-fuchsia-600 dark:text-fuchsia-200" /> Historique clinique complet</h4><p className="mt-1 text-xs text-slate-500">Chaque consultation reste reliée à sa chronologie obstétricale.</p></div><span className="rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-3 py-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">{metrics.length} événement{metrics.length > 1 ? "s" : ""}</span></div><div className="space-y-3">{metrics.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-10 text-center text-sm text-slate-500">Aucune consultation enregistrée.</div> : metrics.map((metric, index) => <ConsultationRow key={metric.id} metric={metric} index={index} onDelete={() => onDelete(metric.id)} onEdit={() => onEdit(metric)} />)}</div></div>;
}

function ConsultationRow({ metric, index, onDelete, onEdit }: { metric: GynecoMetric; index: number; onDelete: () => void; onEdit?: () => void }) {
  return <div className="group flex items-start gap-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/10 p-4 transition-colors hover:border-slate-300 dark:hover:border-white/15"><div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-50 dark:bg-fuchsia-300/10 text-fuchsia-600 dark:text-fuchsia-200"><CircleDot className="size-4" />{index > 0 && <span className="absolute left-1/2 bottom-full h-4 w-px bg-slate-200 dark:bg-white/10" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-black text-slate-900 dark:text-white">Consultation du {formatDate(metric.date)}</p>{metric.sa > 0 && <span className="rounded-full bg-fuchsia-100 dark:bg-fuchsia-300/10 px-2 py-1 text-[10px] font-bold text-fuchsia-700 dark:text-fuchsia-200">{metric.sa} SA</span>}{metric.ddr && <span className="rounded-full bg-cyan-100 dark:bg-cyan-300/10 px-2 py-1 text-[10px] font-bold text-cyan-700 dark:text-cyan-200">DDR renseignée</span>}</div><div className="mt-2 grid gap-2 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2"><span>DDR : <strong className="text-slate-700 dark:text-slate-300">{metric.ddr ? formatDate(metric.ddr) : "Non renseignée"}</strong></span><span className="line-clamp-2">Observation : <strong className="font-normal text-slate-700 dark:text-slate-300">{metric.notes || "À compléter"}</strong></span></div></div><div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"><button onClick={onEdit} className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white" aria-label="Modifier"><FileText className="size-4" /></button><button onClick={onDelete} className="rounded-lg p-2 text-slate-500 hover:bg-rose-100 dark:hover:bg-rose-400/10 hover:text-rose-600 dark:hover:text-rose-200" aria-label="Supprimer"><Trash2 className="size-4" /></button></div></div>;
}

function InfoCard({ label, value, accent, highlight }: { label: string; value: string; accent?: string; highlight?: boolean }) {
  return <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/15 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p><p className={cn("mt-2 font-black", highlight ? "text-2xl text-fuchsia-600 dark:text-fuchsia-100" : "text-sm text-slate-900 dark:text-white")}>{value} {accent && <span className="text-xs font-bold text-fuchsia-600/70 dark:text-fuchsia-200/70">+ {accent}</span>}</p></div>;
}

function Milestone({ label, date, state }: { label: string; date: string; state: "done" | "next" | "pending" }) {
  return <div className="flex items-center gap-3"><span className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl border", state === "done" ? "border-emerald-200 dark:border-emerald-200/20 bg-emerald-50 dark:bg-emerald-300/10 text-emerald-600 dark:text-emerald-200" : state === "next" ? "border-fuchsia-200 dark:border-fuchsia-200/20 bg-fuchsia-50 dark:bg-fuchsia-300/10 text-fuchsia-600 dark:text-fuchsia-200" : "border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600")}>{state === "done" ? <Check className="size-4" /> : <CircleDot className="size-4" />}</span><div className="flex min-w-0 flex-1 items-center justify-between gap-3"><span className="truncate text-xs text-slate-600 dark:text-slate-300">{label}</span><span className="shrink-0 text-[11px] font-bold text-slate-500">{date}</span></div></div>;
}

function OverviewCard({ icon: Icon, label, value, helper, tone }: { icon: React.ElementType; label: string; value: string; helper: string; tone: "fuchsia" | "cyan" | "violet" | "slate" }) {
  const styles = { fuchsia: "border-fuchsia-200 dark:border-fuchsia-200/15 bg-fuchsia-50 dark:bg-fuchsia-300/10 text-fuchsia-700 dark:text-fuchsia-100", cyan: "border-cyan-200 dark:border-cyan-200/15 bg-cyan-50 dark:bg-cyan-300/10 text-cyan-700 dark:text-cyan-100", violet: "border-violet-200 dark:border-violet-200/15 bg-violet-50 dark:bg-violet-300/10 text-violet-700 dark:text-violet-100", slate: "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[.04] text-slate-700 dark:text-slate-200" };
  return <div className={cn("relative overflow-hidden rounded-3xl border p-4", styles[tone])}><div className="absolute -right-6 -top-6 size-24 rounded-full bg-current opacity-[.07] blur-2xl" /><div className="relative flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] opacity-60">{label}</p><p className="mt-3 text-2xl font-black tracking-[-.04em]">{value}</p><p className="mt-2 text-[11px] opacity-55">{helper}</p></div><Icon className="size-5 opacity-80" /></div></div>;
}
