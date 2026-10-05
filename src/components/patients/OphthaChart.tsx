import React, { useMemo, useState } from "react";
import { Patient } from "@/types";
import { SectionCard } from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Activity, CalendarDays, Check, CircleDot, ClipboardList, Eye, FileText, Focus, Plus, ScanEye, Sparkles, Target, Trash2, TrendingUp, UserRound, X } from "lucide-react";

interface EyeData { sphere: string; cylinder: string; axis: string; acuity: string; pio: string; }
interface OphthaMetric { id: string; date: string; od: EyeData; og: EyeData; notes: string; }

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function EyeLensSvg({ isLeft }: { isLeft?: boolean | undefined }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("size-16 drop-shadow-[0_0_18px_rgba(56,189,248,.22)]", isLeft ? "" : "scale-x-[-1]")} aria-hidden="true">
      <path d="M5 50C20 20 80 20 95 50C80 80 20 80 5 50Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="50" r="19" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 4" />
      <circle cx="50" cy="50" r="8" fill="currentColor" />
      <circle cx="45" cy="45" r="3" fill="white" className="animate-pulse" />
    </svg>
  );
}

function acuityScore(acuity: string) {
  const match = acuity.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) / Number(match[2]) : null;
}

function PioStatus({ value }: { value: string }) {
  const numeric = Number.parseFloat(value);
  const status = Number.isFinite(numeric) && numeric > 21 ? "À revoir" : Number.isFinite(numeric) && numeric < 10 ? "Bas" : "Dans la plage";
  const tone =
    status === "À revoir"
      ? "text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-300/10 border-amber-200 dark:border-amber-200/20"
      : status === "Bas"
        ? "text-sky-700 dark:text-sky-200 bg-sky-50 dark:bg-sky-300/10 border-sky-200 dark:border-sky-200/20"
        : "text-emerald-700 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-300/10 border-emerald-200 dark:border-emerald-200/20";
  return <span className={cn("rounded-full border px-2 py-1 text-[10px] font-bold", tone)}>{status}</span>;
}

export function OphthaChart({ patient, onUpdate, isUpdating }: { patient: Patient; onUpdate: (data: Partial<Patient>) => void; isUpdating: boolean }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<OphthaMetric | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "history">("overview");

  const specialtyData = patient.specialtyData || {};
  const metrics: OphthaMetric[] = specialtyData["ophthaMetrics"] || [];
  const sortedMetrics = useMemo(() => [...metrics].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [metrics]);
  const latest = sortedMetrics[0];
  const previous = sortedMetrics[1];
  const averagePio = latest ? Math.round(((Number(latest.od.pio) || 0) + (Number(latest.og.pio) || 0)) / 2) : 0;
  const acuityDifference =
    latest && acuityScore(latest.od.acuity) !== null && acuityScore(latest.og.acuity) !== null
      ? Math.abs((acuityScore(latest.od.acuity) || 0) - (acuityScore(latest.og.acuity) || 0))
      : 0;

  const openModal = () => {
    const defaultEye: EyeData = { sphere: "0.00", cylinder: "0.00", axis: "0", acuity: "10/10", pio: "15" };
    setEditingMetric({ id: crypto.randomUUID(), date: todayIso(), od: defaultEye, og: { ...defaultEye }, notes: "" });
    setIsModalOpen(true);
  };

  const saveMetric = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingMetric) return;
    const nextMetrics = [editingMetric, ...metrics.filter((metric) => metric.id !== editingMetric.id)].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    onUpdate({ specialtyData: { ...specialtyData, ophthaMetrics: nextMetrics } });
    setIsModalOpen(false);
    setEditingMetric(null);
  };

  const deleteMetric = (id: string) => {
    if (!window.confirm("Supprimer cet examen de l'historique ?")) return;
    onUpdate({ specialtyData: { ...specialtyData, ophthaMetrics: metrics.filter((metric) => metric.id !== id) } });
  };

  const updateEye = (eye: "od" | "og", field: keyof EyeData, value: string) =>
    setEditingMetric((current) => (current ? { ...current, [eye]: { ...current[eye], [field]: value } } : current));

  const tabClass = (active: boolean) =>
    cn(
      "rounded-xl px-4 py-2 text-xs font-bold transition-all",
      active
        ? "bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white dark:shadow-none"
        : "text-slate-500 hover:text-slate-900 dark:hover:text-white",
    );

  return (
    <SectionCard title="Suivi ophtalmologique" description="Réfraction, acuité visuelle, pression intraoculaire et observations du fond d'œil dans une seule vue.">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl shadow-slate-200 dark:border-slate-800 dark:bg-[#07101d] dark:text-white dark:shadow-slate-950/20 sm:p-7">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(56,189,248,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,.05)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="pointer-events-none absolute -left-40 -top-40 size-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 right-1/4 size-96 rounded-full bg-indigo-500/10 blur-3xl" />

        {/* Header */}
        <div className="relative flex flex-col justify-between gap-5 border-b border-slate-200 pb-6 dark:border-white/10 sm:flex-row sm:items-start">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-sky-600 dark:text-sky-200/70">
              <CircleDot className="size-3 text-emerald-500 dark:text-emerald-300" /> Vision intelligence layer <span className="text-slate-400 dark:text-slate-600">/</span> dossier actif
            </div>
            <h3 className="text-2xl font-black tracking-[-.04em] sm:text-3xl">Vision command center</h3>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <UserRound className="size-4" /> Patient : <strong className="text-slate-700 dark:text-slate-200">{patient.firstName} {patient.lastName}</strong>
            </p>
          </div>
          <Button onClick={openModal} className="h-11 rounded-xl bg-sky-600 px-4 font-black text-white shadow-[0_0_28px_rgba(14,165,233,.22)] hover:bg-sky-700 dark:bg-sky-300 dark:text-slate-950 dark:shadow-[0_0_28px_rgba(125,211,252,.18)] dark:hover:bg-sky-200">
            <Plus className="mr-2 size-4" /> Nouvel examen
          </Button>
        </div>

        {/* KPIs */}
        <div className="relative grid gap-3 py-6 sm:grid-cols-2 xl:grid-cols-4">
          <OverviewCard icon={Eye} label="Examens enregistrés" value={`${metrics.length}`} helper="historique du dossier" tone="sky" />
          <OverviewCard icon={Focus} label="Acuité OD / OG" value={latest ? `${latest.od.acuity} · ${latest.og.acuity}` : "—"} helper="dernier examen" tone="indigo" />
          <OverviewCard icon={Activity} label="PIO moyenne" value={latest ? `${averagePio}` : "—"} helper="mmHg · dernier examen" tone={averagePio > 21 ? "amber" : "emerald"} />
          <OverviewCard icon={CalendarDays} label="Dernière visite" value={latest ? formatDate(latest.date).replace(/\s+\d{4}$/, "") : "—"} helper={latest?.notes ? "note clinique disponible" : "à compléter"} tone="slate" />
        </div>

        {/* Tabs */}
        <div className="relative mb-5 flex rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-white/10 dark:bg-black/15 sm:w-fit">
          <button type="button" onClick={() => setActiveTab("overview")} className={tabClass(activeTab === "overview")}>Vue binoculaire</button>
          <button type="button" onClick={() => setActiveTab("history")} className={tabClass(activeTab === "history")}>Historique des examens</button>
        </div>

        {activeTab === "overview" ? (
          <div className="relative space-y-5">
            {!latest ? (
              <div className="rounded-[2rem] border border-dashed border-sky-300 bg-sky-50/60 p-12 text-center dark:border-sky-200/20 dark:bg-sky-300/[.04]">
                <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-300/10 dark:text-sky-200">
                  <ScanEye className="size-8" />
                </div>
                <h4 className="mt-5 text-xl font-black">Le dossier visuel est prêt</h4>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">Ajoutez le premier examen pour créer la comparaison OD/OG, la réfraction et le suivi de la PIO.</p>
                <Button onClick={openModal} variant="outline" className="mt-5 rounded-full border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
                  <Plus className="mr-2 size-4" /> Initialiser le suivi
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-[2rem] border border-sky-200 bg-gradient-to-br from-sky-50 via-indigo-50/60 to-white p-5 dark:border-sky-200/15 dark:from-sky-300/[.12] dark:via-indigo-500/[.06] dark:to-transparent sm:p-7">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-sky-600 dark:text-sky-200/70"><Target className="size-4" /> Réfraction actuelle</div>
                      <h4 className="mt-2 text-2xl font-black">Lecture binoculaire</h4>
                      <p className="mt-1 text-xs text-slate-500">Examen du {formatDate(latest.date)}</p>
                    </div>
                    {latest.notes && (
                      <div className="max-w-xs rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs text-slate-600 dark:border-white/10 dark:bg-black/15 dark:text-slate-300">
                        <span className="text-emerald-500 dark:text-emerald-300">●</span> {latest.notes}
                      </div>
                    )}
                  </div>
                  <div className="mt-7 grid gap-4 lg:grid-cols-2">
                    <EyePanel label="Œil droit" abbreviation="OD" data={latest.od} side="right" previous={previous?.od} />
                    <EyePanel label="Œil gauche" abbreviation="OG" data={latest.og} side="left" previous={previous?.og} />
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
                  <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[.035] sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="flex items-center gap-2 font-black"><TrendingUp className="size-4 text-sky-600 dark:text-sky-200" /> Synthèse de l'examen</h4>
                        <p className="mt-1 text-xs text-slate-500">Lecture comparative du dernier relevé</p>
                      </div>
                      <Sparkles className="size-4 text-sky-600 dark:text-sky-200" />
                    </div>
                    <div className="mt-5 space-y-3">
                      <SummaryRow label="Différence d'acuité OD / OG" value={acuityDifference === 0 ? "Équilibrée" : `${acuityDifference.toFixed(2)}`} hint={acuityDifference === 0 ? "" : "écart relatif"} />
                      <SummaryRow label="Pression intraoculaire OD" value={`${latest.od.pio}`} hint="mmHg" />
                      <SummaryRow label="Pression intraoculaire OG" value={`${latest.og.pio}`} hint="mmHg" />
                      <SummaryRow label="Observation fond d'œil" value={latest.notes ? "Disponible" : "Non renseignée"} hint="note clinique" />
                    </div>
                  </div>
                  <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[.035] sm:p-6">
                    <h4 className="flex items-center gap-2 font-black"><ClipboardList className="size-4 text-indigo-600 dark:text-indigo-200" /> Repères de lecture</h4>
                    <div className="mt-5 space-y-3">
                      <LegendRow color="bg-sky-500 dark:bg-sky-300" label="Réfraction" description="Sphère · cylindre · axe" />
                      <LegendRow color="bg-indigo-500 dark:bg-indigo-300" label="Acuité" description="Lecture fonctionnelle" />
                      <LegendRow color="bg-emerald-500 dark:bg-emerald-300" label="PIO" description="Pression intraoculaire" />
                      <LegendRow color="bg-violet-500 dark:bg-violet-300" label="Fond d'œil" description="Observation clinique" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <HistoryView metrics={sortedMetrics} onDelete={deleteMetric} onEdit={(metric) => { setEditingMetric(metric); setIsModalOpen(true); }} />
        )}
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl overflow-hidden border-slate-200 bg-white text-slate-900 dark:border-slate-200/20 dark:bg-[#0a1220] dark:text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-black">
              <span className="flex size-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-300/10 dark:text-sky-200"><ScanEye className="size-5" /></span>
              Examen ophtalmologique
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={saveMetric} className="mt-4 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date de l'examen</label>
              <Input
                type="date"
                value={editingMetric?.date || ""}
                onChange={(event) => setEditingMetric((current) => (current ? { ...current, date: event.target.value } : null))}
                required
                className="h-11 max-w-xs border-slate-200 bg-slate-50 text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white dark:[color-scheme:dark]"
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <EyeForm title="Œil droit (OD)" data={editingMetric?.od} onChange={(field, value) => updateEye("od", field, value)} />
              <EyeForm title="Œil gauche (OG)" data={editingMetric?.og} onChange={(field, value) => updateEye("og", field, value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fond d'œil &amp; observations</label>
              <Textarea
                value={editingMetric?.notes || ""}
                onChange={(event) => setEditingMetric((current) => (current ? { ...current, notes: event.target.value } : null))}
                className="min-h-24 resize-none border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-600"
                placeholder="Papille, macula, rétine, symptômes, recommandations..."
              />
            </div>
            <DialogFooter className="border-t border-slate-200 pt-5 dark:border-white/10">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:text-white dark:hover:bg-white/10">
                <X className="mr-2 size-4" /> Annuler
              </Button>
              <Button type="submit" disabled={isUpdating} className="bg-sky-600 font-black text-white hover:bg-sky-700 dark:bg-sky-300 dark:text-slate-950 dark:hover:bg-sky-200">
                <Check className="mr-2 size-4" /> {isUpdating ? "Sauvegarde..." : "Enregistrer le bilan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

function EyePanel({ label, abbreviation, data, side, previous }: { label: string; abbreviation: string; data: EyeData; side: "left" | "right"; previous?: EyeData | undefined }) {
  return (
    <div className="relative rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-black/15 dark:shadow-none sm:p-5">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="text-sky-500 dark:text-sky-200"><EyeLensSvg isLeft={side === "left"} /></div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">{abbreviation}</p>
            <h5 className="text-lg font-black">{label}</h5>
          </div>
        </div>
        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-bold text-sky-700 dark:border-sky-200/15 dark:bg-sky-300/10 dark:text-sky-100">Dernier relevé</span>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <ValueBox label="Sphère" value={data.sphere} />
        <ValueBox label="Cylindre" value={data.cylinder} />
        <ValueBox label="Axe" value={`${data.axis}°`} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-200/15 dark:bg-sky-300/10">
          <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-200/70">Acuité visuelle</p>
          <p className="mt-2 text-xl font-black text-sky-700 dark:text-sky-100">{data.acuity}</p>
          {previous?.acuity && <p className="mt-1 text-[10px] text-slate-500">Précédent : {previous.acuity}</p>}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[.04]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">PIO</p>
              <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{data.pio} <span className="text-xs font-normal text-slate-500">mmHg</span></p>
            </div>
            <Activity className="size-4 text-emerald-500 dark:text-emerald-200" />
          </div>
          <div className="mt-2"><PioStatus value={data.pio} /></div>
        </div>
      </div>
    </div>
  );
}

function EyeForm({ title, data, onChange }: { title: string; data?: EyeData | undefined; onChange: (field: keyof EyeData, value: string) => void }) {
  const fields: { key: keyof EyeData; label: string; placeholder: string }[] = [
    { key: "sphere", label: "Sphère", placeholder: "0.00" },
    { key: "cylinder", label: "Cylindre", placeholder: "0.00" },
    { key: "axis", label: "Axe (°)", placeholder: "0" },
    { key: "acuity", label: "Acuité", placeholder: "10/10" },
    { key: "pio", label: "PIO (mmHg)", placeholder: "15" },
  ];
  return (
    <div className="rounded-3xl border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-200/15 dark:bg-sky-300/[.05] sm:p-5">
      <h4 className="mb-4 flex items-center gap-2 text-sm font-black text-sky-700 dark:text-sky-100"><Eye className="size-4" /> {title}</h4>
      <div className="grid grid-cols-3 gap-3">
        {fields.slice(0, 3).map((field) => (
          <Field key={field.key} label={field.label} value={data?.[field.key] || ""} placeholder={field.placeholder} onChange={(value) => onChange(field.key, value)} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-sky-200/70 pt-4 dark:border-white/10">
        {fields.slice(3).map((field) => (
          <Field key={field.key} label={field.label} value={data?.[field.key] || ""} placeholder={field.placeholder} onChange={(value) => onChange(field.key, value)} accent={field.key === "acuity"} />
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, placeholder, onChange, accent }: { label: string; value: string; placeholder: string; onChange: (value: string) => void; accent?: boolean | undefined }) {
  return (
    <div className="space-y-1.5">
      <label className={cn("text-[10px] font-bold uppercase tracking-wider", accent ? "text-sky-600 dark:text-sky-200" : "text-slate-500")}>{label}</label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-10 border-slate-200 bg-white text-center font-mono font-bold text-slate-900 placeholder:text-slate-300 dark:border-white/10 dark:bg-slate-950/30 dark:text-white dark:placeholder:text-slate-700",
          accent && "border-sky-300 dark:border-sky-200/20",
        )}
      />
    </div>
  );
}

function ValueBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-white/10 dark:bg-white/[.04]">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 font-mono text-lg font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-sm last:border-0 last:pb-0 dark:border-white/5">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right font-black text-slate-900 dark:text-white">{value} <small className="font-normal text-slate-500">{hint}</small></span>
    </div>
  );
}

function LegendRow({ color, label, description }: { color: string; label: string; description: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("size-2.5 rounded-full", color)} />
      <div className="flex flex-1 items-center justify-between">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{label}</span>
        <span className="text-[11px] text-slate-500">{description}</span>
      </div>
    </div>
  );
}

function HistoryView({ metrics, onDelete, onEdit }: { metrics: OphthaMetric[]; onDelete: (id: string) => void; onEdit: (metric: OphthaMetric) => void }) {
  return (
    <div className="relative rounded-[2rem] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[.035] sm:p-7">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h4 className="flex items-center gap-2 text-xl font-black"><ClipboardList className="size-5 text-sky-600 dark:text-sky-200" /> Historique des examens</h4>
          <p className="mt-1 text-xs text-slate-500">Comparaison des relevés ophtalmologiques dans le temps.</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          {metrics.length} examen{metrics.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="space-y-3">
        {metrics.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-white/10">Aucun examen enregistré.</div>
        ) : (
          metrics.map((metric) => (
            <div key={metric.id} className="group rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 dark:border-white/5 dark:bg-black/10 dark:hover:border-white/15">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-300/10 dark:text-sky-200"><CircleDot className="size-4" /></span>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">Examen du {formatDate(metric.date)}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{metric.notes || "Aucune note clinique"}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button type="button" onClick={() => onEdit(metric)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white" aria-label="Modifier"><FileText className="size-4" /></button>
                  <button type="button" onClick={() => onDelete(metric.id)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-400/10 dark:hover:text-rose-200" aria-label="Supprimer"><Trash2 className="size-4" /></button>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <HistoryEye eye="OD" data={metric.od} />
                <HistoryEye eye="OG" data={metric.og} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function HistoryEye({ eye, data }: { eye: string; data: EyeData }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/5 dark:bg-white/[.03]">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-200">Œil {eye}</span>
        <span className="text-xs font-black text-slate-900 dark:text-white">{data.acuity}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span>Sph. <strong className="text-slate-800 dark:text-slate-200">{data.sphere}</strong></span>
        <span>Cyl. <strong className="text-slate-800 dark:text-slate-200">{data.cylinder}</strong></span>
        <span>Axe <strong className="text-slate-800 dark:text-slate-200">{data.axis}°</strong></span>
        <span>PIO <strong className="text-slate-800 dark:text-slate-200">{data.pio}</strong></span>
      </div>
    </div>
  );
}

function OverviewCard({ icon: Icon, label, value, helper, tone }: { icon: React.ElementType; label: string; value: string; helper: string; tone: "sky" | "indigo" | "amber" | "emerald" | "slate" }) {
  const styles = {
    sky: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-200/15 dark:bg-sky-300/10 dark:text-sky-100",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-200/15 dark:bg-indigo-300/10 dark:text-indigo-100",
    amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-200/15 dark:bg-amber-300/10 dark:text-amber-100",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-200/15 dark:bg-emerald-300/10 dark:text-emerald-100",
    slate: "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/[.04] dark:text-slate-200",
  };
  return (
    <div className={cn("relative overflow-hidden rounded-3xl border p-4 transition-transform duration-300 hover:-translate-y-0.5", styles[tone])}>
      <div className="absolute -right-6 -top-6 size-24 rounded-full bg-current opacity-[.07] blur-2xl" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] opacity-60">{label}</p>
          <p className="mt-3 text-2xl font-black tracking-[-.04em]">{value}</p>
          <p className="mt-2 text-[11px] opacity-55">{helper}</p>
        </div>
        <Icon className="size-5 opacity-80" />
      </div>
    </div>
  );
}
