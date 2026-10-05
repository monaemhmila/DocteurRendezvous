import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Patient } from "@/types";
import { SectionCard } from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Check,
  CircleDot,
  ClipboardList,
  Edit2,
  Eye,
  Layers3,
  Maximize,
  Plus,
  ScanLine,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

const DERMA_ZONES = [
  { id: "head", label: "Tête & visage", short: "VISAGE" },
  { id: "torso", label: "Torse / abdomen", short: "TORSE" },
  { id: "back", label: "Dos", short: "DOS" },
  { id: "left_arm", label: "Bras gauche", short: "BRAS G" },
  { id: "right_arm", label: "Bras droit", short: "BRAS D" },
  { id: "left_leg", label: "Jambe gauche", short: "JAMBE G" },
  { id: "right_leg", label: "Jambe droite", short: "JAMBE D" },
];

const LESION_TYPES = [
  { id: "melanome", label: "Mélanome suspect", short: "Suspect", tone: "rose", color: "bg-rose-50 dark:bg-rose-300/10 text-rose-700 dark:text-rose-200 border-rose-200 dark:border-rose-200/20", dot: "bg-rose-500 dark:bg-rose-300", priority: "Revue prioritaire" },
  { id: "carcinome", label: "Carcinome", short: "Carcinome", tone: "orange", color: "bg-orange-50 dark:bg-orange-300/10 text-orange-700 dark:text-orange-200 border-orange-200 dark:border-orange-200/20", dot: "bg-orange-500 dark:bg-orange-300", priority: "Revue recommandée" },
  { id: "naevus", label: "Nævus / grain de beauté", short: "Nævus", tone: "emerald", color: "bg-emerald-50 dark:bg-emerald-300/10 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-200/20", dot: "bg-emerald-500 dark:bg-emerald-300", priority: "Suivi standard" },
  { id: "eczema", label: "Eczéma / psoriasis", short: "Inflammatoire", tone: "sky", color: "bg-sky-50 dark:bg-sky-300/10 text-sky-700 dark:text-sky-200 border-sky-200 dark:border-sky-200/20", dot: "bg-sky-500 dark:bg-sky-300", priority: "Suivi clinique" },
  { id: "acne", label: "Acné", short: "Acné", tone: "violet", color: "bg-violet-50 dark:bg-violet-300/10 text-violet-700 dark:text-violet-200 border-violet-200 dark:border-violet-200/20", dot: "bg-violet-500 dark:bg-violet-300", priority: "Suivi clinique" },
  { id: "kyste", label: "Kyste / lipome", short: "Kyste", tone: "slate", color: "bg-slate-100 dark:bg-slate-300/10 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-200/20", dot: "bg-slate-500 dark:bg-slate-300", priority: "Suivi standard" },
];

interface Lesion {
  id: string;
  zoneId: string;
  type: string;
  description: string;
  date: string;
  sizeMm?: number | undefined;
  x?: number | undefined;
  y?: number | undefined;
}

function typeConfig(type: string) {
  return LESION_TYPES.find((item) => item.id === type) || LESION_TYPES[0]!;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function BodyMap({ lesions, selectedZone, onZoneClick }: { lesions: Lesion[]; selectedZone: string | null; onZoneClick: (zoneId: string) => void }) {
  const countForZone = (id: string) => lesions.filter((lesion) => lesion.zoneId === id).length;
  const isSelected = (id: string) => selectedZone === id;
  const fill = (id: string) => isSelected(id) ? "#173b55" : "#0e1b2c";
  const stroke = (id: string) => isSelected(id) ? "#67e8f9" : "#334c65";
  const zoneClass = "cursor-pointer outline-none transition-all";

  const ZoneMarker = ({ id, cx, cy }: { id: string; cx: number; cy: number }) => countForZone(id) > 0 ? <g><circle cx={cx} cy={cy} r="11" fill="#fb7185" opacity=".16" className="animate-pulse" /><circle cx={cx} cy={cy} r="4" fill="#fda4af" /><text x={cx + 13} y={cy + 4} fill="#fecdd3" fontSize="9" fontWeight="700">{countForZone(id)}</text></g> : null;

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 dark:border-slate-200 dark:border-white/10 bg-white dark:bg-[#07101d] p-4 shadow-2xl shadow-slate-200 dark:shadow-slate-950/30 sm:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(6,182,212,.08) dark:rgba(103,232,249,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,.08) dark:rgba(103,232,249,.05)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="relative mb-6 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-600 dark:text-cyan-200/60">Anatomical coordinate system</p><h3 className="mt-1 text-xl font-black">Cartographie corporelle</h3></div><div className="flex items-center gap-2 rounded-full border border-cyan-200 dark:border-cyan-200/15 bg-cyan-50 dark:bg-cyan-600 text-white hover:bg-cyan-700 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-100"><ScanLine className="size-3.5" /> {lesions.length} signal{lesions.length > 1 ? "s" : ""}</div></div>
      <div className="relative flex flex-col items-center justify-center gap-8 md:flex-row md:gap-12">
        <div className="relative"><p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[.2em] text-slate-600 dark:text-slate-500">Face antérieure</p><svg viewBox="0 0 200 400" className="h-[350px] w-[175px] drop-shadow-[0_0_22px_rgba(34,211,238,.08)] sm:h-[390px] sm:w-[195px]" role="img" aria-label="Carte anatomique face antérieure">
          <g onClick={() => onZoneClick("head")} className={zoneClass}><rect x="80" y="10" width="40" height="50" rx="20" fill={fill("head")} stroke={stroke("head")} strokeWidth={isSelected("head") ? 3 : 1.5} /><ZoneMarker id="head" cx={100} cy={35} /></g>
          <g onClick={() => onZoneClick("torso")} className={zoneClass}><path d="M65 70C65 70 135 70 135 70C140 110 135 160 130 190C130 190 70 190 70 190C65 160 60 110 65 70Z" fill={fill("torso")} stroke={stroke("torso")} strokeWidth={isSelected("torso") ? 3 : 1.5} /><ZoneMarker id="torso" cx={100} cy={130} /></g>
          <g onClick={() => onZoneClick("right_arm")} className={zoneClass}><path d="M55 75C40 85 30 120 25 160C20 180 35 180 40 160C45 120 55 90 60 80Z" fill={fill("right_arm")} stroke={stroke("right_arm")} strokeWidth={isSelected("right_arm") ? 3 : 1.5} /><ZoneMarker id="right_arm" cx={40} cy={130} /></g>
          <g onClick={() => onZoneClick("left_arm")} className={zoneClass}><path d="M145 75C160 85 170 120 175 160C180 180 165 180 160 160C155 120 145 90 140 80Z" fill={fill("left_arm")} stroke={stroke("left_arm")} strokeWidth={isSelected("left_arm") ? 3 : 1.5} /><ZoneMarker id="left_arm" cx={160} cy={130} /></g>
          <g onClick={() => onZoneClick("left_leg")} className={zoneClass}><path d="M102 195C128 195 125 260 120 330C118 350 100 350 102 330C105 270 105 210 102 195Z" fill={fill("left_leg")} stroke={stroke("left_leg")} strokeWidth={isSelected("left_leg") ? 3 : 1.5} /><ZoneMarker id="left_leg" cx={112} cy={270} /></g>
          <g onClick={() => onZoneClick("right_leg")} className={zoneClass}><path d="M98 195C72 195 75 260 80 330C82 350 100 350 98 330C95 270 95 210 98 195Z" fill={fill("right_leg")} stroke={stroke("right_leg")} strokeWidth={isSelected("right_leg") ? 3 : 1.5} /><ZoneMarker id="right_leg" cx={88} cy={270} /></g>
        </svg></div>
        <div className="hidden h-64 w-px bg-gradient-to-b from-transparent via-cyan-200/20 to-transparent md:block" />
        <div className="relative"><p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[.2em] text-slate-600 dark:text-slate-500">Face postérieure</p><svg viewBox="0 0 200 400" className="h-[350px] w-[175px] drop-shadow-[0_0_22px_rgba(34,211,238,.08)] sm:h-[390px] sm:w-[195px]" role="img" aria-label="Carte anatomique face postérieure">
          <g onClick={() => onZoneClick("head")} className={zoneClass}><rect x="80" y="10" width="40" height="50" rx="20" fill={fill("head")} stroke={stroke("head")} strokeWidth={isSelected("head") ? 3 : 1.5} /><ZoneMarker id="head" cx={100} cy={35} /></g>
          <g onClick={() => onZoneClick("back")} className={zoneClass}><path d="M65 70C65 70 135 70 135 70C140 110 135 160 130 190C130 190 70 190 70 190C65 160 60 110 65 70Z" fill={fill("back")} stroke={stroke("back")} strokeWidth={isSelected("back") ? 3 : 1.5} /><ZoneMarker id="back" cx={100} cy={130} /></g>
          <g onClick={() => onZoneClick("left_arm")} className={zoneClass}><path d="M55 75C40 85 30 120 25 160C20 180 35 180 40 160C45 120 55 90 60 80Z" fill={fill("left_arm")} stroke={stroke("left_arm")} strokeWidth={isSelected("left_arm") ? 3 : 1.5} /><ZoneMarker id="left_arm" cx={40} cy={130} /></g>
          <g onClick={() => onZoneClick("right_arm")} className={zoneClass}><path d="M145 75C160 85 170 120 175 160C180 180 165 180 160 160C155 120 145 90 140 80Z" fill={fill("right_arm")} stroke={stroke("right_arm")} strokeWidth={isSelected("right_arm") ? 3 : 1.5} /><ZoneMarker id="right_arm" cx={160} cy={130} /></g>
          <g onClick={() => onZoneClick("left_leg")} className={zoneClass}><path d="M98 195C72 195 75 260 80 330C82 350 100 350 98 330C95 270 95 210 98 195Z" fill={fill("left_leg")} stroke={stroke("left_leg")} strokeWidth={isSelected("left_leg") ? 3 : 1.5} /><ZoneMarker id="left_leg" cx={88} cy={270} /></g>
          <g onClick={() => onZoneClick("right_leg")} className={zoneClass}><path d="M102 195C128 195 125 260 120 330C118 350 100 350 102 330C105 270 105 210 102 195Z" fill={fill("right_leg")} stroke={stroke("right_leg")} strokeWidth={isSelected("right_leg") ? 3 : 1.5} /><ZoneMarker id="right_leg" cx={112} cy={270} /></g>
        </svg></div>
      </div>
      <div className="relative mt-6 flex flex-wrap justify-center gap-2 border-t border-slate-200 dark:border-slate-200 dark:border-white/10 pt-5">{DERMA_ZONES.map((zone) => <button key={zone.id} onClick={() => onZoneClick(zone.id)} className={cn("rounded-full border px-3 py-1.5 text-[10px] font-bold transition-all", selectedZone === zone.id ? "border-cyan-400 dark:border-cyan-200/40 bg-cyan-100 dark:bg-cyan-600 text-white hover:bg-cyan-700 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200/15 text-cyan-800 dark:text-cyan-100" : "border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[.03] text-slate-500 dark:text-slate-400 hover:bg-white/[.08] hover:text-slate-900 dark:text-white")}>{zone.short}<span className="ml-1.5 text-cyan-600 dark:text-cyan-200/70">{countForZone(zone.id)}</span></button>)}</div>
    </div>
  );
}

export function DermaChart({ patient, onUpdate, isUpdating }: { patient: Patient; onUpdate: (data: Partial<Patient>) => void; isUpdating: boolean }) {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLesion, setEditingLesion] = useState<Lesion | null>(null);
  const [filter, setFilter] = useState("all");

  const specialtyData = patient.specialtyData || {};
  const lesions: Lesion[] = specialtyData["lesions"] || [];
  const sortedLesions = useMemo(() => [...lesions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [lesions]);
  const filteredLesions = filter === "all" ? sortedLesions : sortedLesions.filter((lesion) => lesion.type === filter);
  const priorityCount = lesions.filter((lesion) => ["melanome", "carcinome"].includes(lesion.type)).length;
  const zonesWithLesions = new Set(lesions.map((lesion) => lesion.zoneId)).size;

  const openLesionModal = (zoneId: string, lesion?: Lesion) => {
    setSelectedZone(zoneId);
    setEditingLesion(lesion || { id: crypto.randomUUID(), zoneId, type: "naevus", description: "", date: new Date().toISOString().split("T")[0] as string });
    setIsModalOpen(true);
  };

  const saveLesion = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingLesion) return;
    const index = lesions.findIndex((lesion) => lesion.id === editingLesion.id);
    const next = [...lesions];
    if (index >= 0) next[index] = editingLesion;
    else next.push(editingLesion);
    onUpdate({ specialtyData: { ...specialtyData, lesions: next } });
    setIsModalOpen(false);
    setEditingLesion(null);
  };

  const deleteLesion = (id: string) => {
    if (!window.confirm("Supprimer cette lésion de l'historique ?")) return;
    onUpdate({ specialtyData: { ...specialtyData, lesions: lesions.filter((lesion) => lesion.id !== id) } });
  };

  const selectedZoneLesions = selectedZone ? lesions.filter((lesion) => lesion.zoneId === selectedZone) : [];

  return (
    <SectionCard title="Suivi dermatologique" description="Cartographie anatomique, classification des lésions et historique clinique centralisé.">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#07101d] p-5 text-slate-900 dark:text-white shadow-2xl shadow-slate-200 dark:shadow-slate-950/20 sm:p-7">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(148,163,184,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.04)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="pointer-events-none absolute -right-40 -top-40 size-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 size-96 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 border-b border-slate-200 dark:border-white/10 pb-6 sm:flex-row sm:items-start"><div><div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-cyan-600 dark:text-cyan-200/70"><CircleDot className="size-3 text-emerald-500 dark:text-emerald-300" /> Dermal intelligence layer <span className="text-slate-600">/</span> dossier actif</div><h3 className="text-2xl font-black tracking-[-.04em] sm:text-3xl">Atlas clinique de la peau</h3><p className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><UserRound className="size-4" /> Patient : <strong className="text-slate-700 dark:text-slate-200">{patient.firstName} {patient.lastName}</strong></p></div><Button onClick={() => openLesionModal(selectedZone || "head")} className="h-11 rounded-xl bg-cyan-600 text-white hover:bg-cyan-700 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200 px-4 font-black shadow-[0_0_28px_rgba(103,232,249,.18)]"><Plus className="mr-2 size-4" /> Nouvelle lésion</Button></div>

        <div className="relative grid gap-3 py-6 sm:grid-cols-2 xl:grid-cols-4"><OverviewCard icon={Layers3} label="Lésions documentées" value={`${lesions.length}`} helper="total dossier" tone="cyan" /><OverviewCard icon={Eye} label="Zones explorées" value={`${zonesWithLesions} / ${DERMA_ZONES.length}`} helper="cartographie active" tone="violet" /><OverviewCard icon={AlertTriangle} label="À revoir" value={`${priorityCount}`} helper="priorité clinique" tone={priorityCount > 0 ? "rose" : "emerald"} /><OverviewCard icon={CalendarDays} label="Dernière mise à jour" value={sortedLesions[0] ? formatDate(sortedLesions[0].date) : "—"} helper="dernier événement" tone="slate" /></div>

        <div className="relative grid gap-5 xl:grid-cols-[1.12fr_.88fr]">
          <BodyMap lesions={lesions} selectedZone={selectedZone} onZoneClick={setSelectedZone} />
          <div className="space-y-5">
            <div className="rounded-[2rem] border border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[.035] p-5"><div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-600 dark:text-slate-500">Zone active</p><h4 className="mt-1 text-xl font-black">{selectedZone ? DERMA_ZONES.find((zone) => zone.id === selectedZone)?.label : "Sélectionnez une zone"}</h4></div><Maximize className="size-5 text-slate-600" /></div>{selectedZone ? <div className="space-y-3">{selectedZoneLesions.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/10 p-6 text-center"><ShieldAlert className="mx-auto size-8 text-slate-600" /><p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Aucune lésion documentée sur cette zone.</p><Button onClick={() => openLesionModal(selectedZone)} variant="outline" className="mt-4 rounded-full border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10"><Plus className="mr-2 size-4" /> Documenter cette zone</Button></div> : selectedZoneLesions.map((lesion) => <MiniLesion key={lesion.id} lesion={lesion} onEdit={() => openLesionModal(selectedZone, lesion)} onDelete={() => deleteLesion(lesion.id)} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/10 p-8 text-center"><ScanLine className="mx-auto size-9 text-cyan-600 dark:text-cyan-200/60" /><p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">Cliquez sur une région de la carte pour ouvrir sa vue clinique.</p></div>}</div>
            <div className="rounded-[2rem] border border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[.035] p-5"><div className="flex items-center justify-between"><h4 className="flex items-center gap-2 font-black"><ClipboardList className="size-4 text-violet-600 dark:text-violet-200" /> Légende de suivi</h4><Sparkles className="size-4 text-cyan-600 dark:text-cyan-200" /></div><div className="mt-4 space-y-2">{LESION_TYPES.map((type) => <div key={type.id} className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/10 px-3 py-2.5"><span className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"><span className={cn("size-2.5 rounded-full", type.dot)} /> {type.label}</span><span className="text-[10px] font-bold text-slate-600 dark:text-slate-500">{lesions.filter((lesion) => lesion.type === type.id).length}</span></div>)}</div></div>
          </div>
        </div>

        <div className="relative mt-5 rounded-[2rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[.035] p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h4 className="flex items-center gap-2 font-black"><Activity className="size-4 text-cyan-600 dark:text-cyan-200" /> Historique clinique</h4><p className="mt-1 text-xs text-slate-600 dark:text-slate-500">Une ligne temporelle des observations enregistrées</p></div><div className="flex flex-wrap gap-2">{[{ id: "all", label: "Toutes" }, ...LESION_TYPES.map((type) => ({ id: type.id, label: type.short }))].map((item) => <button key={item.id} onClick={() => setFilter(item.id)} className={cn("rounded-full border px-3 py-1.5 text-[10px] font-bold transition-all", filter === item.id ? "border-cyan-300 dark:border-cyan-200/30 bg-cyan-100 dark:bg-cyan-300/15 text-cyan-800 dark:text-cyan-100" : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[.02] text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:text-white")}>{item.label}</button>)}</div></div><div className="mt-5 space-y-2">{filteredLesions.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-8 text-center text-sm text-slate-600 dark:text-slate-500">Aucun événement dans ce filtre.</div> : filteredLesions.map((lesion, index) => <div key={lesion.id} className="group flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/10 p-3.5 transition-colors hover:border-slate-300 dark:border-white/15"><div className="relative mt-1 flex size-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-300/10 text-cyan-600 dark:text-cyan-200"><CircleDot className="size-4" />{index < filteredLesions.length - 1 && <span className="absolute left-1/2 top-full h-4 w-px bg-white/10" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={cn("rounded-full border px-2 py-1 text-[10px] font-bold", typeConfig(lesion.type).color)}><span className={cn("mr-1.5 inline-block size-1.5 rounded-full", typeConfig(lesion.type).dot)} />{typeConfig(lesion.type).short}</span><span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-500">{DERMA_ZONES.find((zone) => zone.id === lesion.zoneId)?.label}</span>{lesion.sizeMm && <span className="text-[10px] text-slate-600 dark:text-slate-500">∅ {lesion.sizeMm} mm</span>}</div><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{lesion.description || "Observation clinique à compléter."}</p><p className="mt-1 text-[11px] text-slate-600">{formatDate(lesion.date)} · {typeConfig(lesion.type).priority}</p></div><div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"><button onClick={() => openLesionModal(lesion.zoneId, lesion)} className="rounded-lg p-2 text-slate-600 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:text-white" aria-label="Modifier"><Edit2 className="size-4" /></button><button onClick={() => deleteLesion(lesion.id)} className="rounded-lg p-2 text-slate-600 dark:text-slate-500 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-400/10 dark:hover:text-rose-200" aria-label="Supprimer"><Trash2 className="size-4" /></button></div></div>)}</div></div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}><DialogContent className="max-w-xl overflow-hidden border-slate-300 dark:border-slate-200/20 bg-white dark:bg-[#0a1220] text-slate-900 dark:text-white"><DialogHeader><DialogTitle className="flex items-center gap-3 text-2xl font-black"><span className="flex size-10 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-300/10 text-cyan-600 dark:text-cyan-200"><ScanLine className="size-5" /></span> Documenter une lésion</DialogTitle></DialogHeader><form onSubmit={saveLesion} className="mt-4 space-y-5"><div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[.035] p-4"><p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Classification de suivi</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{LESION_TYPES.map((type) => <button key={type.id} type="button" onClick={() => setEditingLesion((current) => current ? { ...current, type: type.id } : null)} className={cn("rounded-xl border px-3 py-3 text-left text-xs font-bold transition-all", editingLesion?.type === type.id ? cn(type.color, "ring-2 ring-cyan-200/30") : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10")}><span className={cn("mr-2 inline-block size-2 rounded-full", type.dot)} />{type.label}</button>)}</div></div><div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Zone</label><select value={editingLesion?.zoneId || "head"} onChange={(event) => { setSelectedZone(event.target.value); setEditingLesion((current) => current ? { ...current, zoneId: event.target.value } : null); }} className="h-11 w-full rounded-md border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-3 text-sm text-slate-900 dark:text-white outline-none">{DERMA_ZONES.map((zone) => <option key={zone.id} value={zone.id} className="bg-white dark:bg-slate-900">{zone.label}</option>)}</select></div><div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Taille (mm)</label><Input type="number" min="0" placeholder="Ex. 5" value={editingLesion?.sizeMm || ""} onChange={(event) => setEditingLesion((current) => current ? { ...current, sizeMm: Number(event.target.value) || undefined } : null)} className="h-11 border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white" /></div><div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</label><Input type="date" value={editingLesion?.date || ""} onChange={(event) => setEditingLesion((current) => current ? { ...current, date: event.target.value } : null)} required className="h-11 border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white" /></div></div><div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Notes / aspect clinique</label><Textarea placeholder="Décrire l'aspect, l'évolution, les symptômes ou les éléments à revoir..." value={editingLesion?.description || ""} onChange={(event) => setEditingLesion((current) => current ? { ...current, description: event.target.value } : null)} className="min-h-28 resize-none border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-600" /></div><DialogFooter className="border-t border-slate-200 dark:border-white/10 pt-5"><Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="border-slate-300 dark:border-white/15 bg-transparent text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10"><X className="mr-2 size-4" /> Annuler</Button><Button type="submit" disabled={isUpdating} className="bg-cyan-600 text-white hover:bg-cyan-700 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200 font-black"><Check className="mr-2 size-4" /> {isUpdating ? "Sauvegarde..." : "Enregistrer la lésion"}</Button></DialogFooter></form></DialogContent></Dialog>
    </SectionCard>
  );
}

function OverviewCard({ icon: Icon, label, value, helper, tone }: { icon: React.ElementType; label: string; value: string; helper: string; tone: "cyan" | "violet" | "rose" | "emerald" | "slate" }) {
  const styles = { cyan: "border-cyan-200 dark:border-cyan-200/15 bg-cyan-50 dark:bg-cyan-300/10 text-cyan-800 dark:text-cyan-100", violet: "border-violet-200 dark:border-violet-200/15 bg-violet-50 dark:bg-violet-300/10 text-violet-800 dark:text-violet-100", rose: "border-rose-200 dark:border-rose-200/15 bg-rose-50 dark:bg-rose-300/10 text-rose-800 dark:text-rose-100", emerald: "border-emerald-200 dark:border-emerald-200/15 bg-emerald-50 dark:bg-emerald-300/10 text-emerald-800 dark:text-emerald-100", slate: "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[.04] text-slate-700 dark:text-slate-200" };
  return <div className={cn("relative overflow-hidden rounded-3xl border p-4", styles[tone])}><div className="absolute -right-6 -top-6 size-24 rounded-full bg-current opacity-[.07] blur-2xl" /><div className="relative flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] opacity-60">{label}</p><p className="mt-3 text-2xl font-black tracking-[-.04em]">{value}</p><p className="mt-2 text-[11px] opacity-55">{helper}</p></div><Icon className="size-5 opacity-80" /></div></div>;
}

function MiniLesion({ lesion, onEdit, onDelete }: { lesion: Lesion; onEdit: () => void; onDelete: () => void }) {
  const type = typeConfig(lesion.type);
  return <div className="group rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/15 p-3.5"><div className="flex items-start justify-between gap-3"><div><span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold", type.color)}><span className={cn("size-1.5 rounded-full", type.dot)} />{type.short}</span><p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">{lesion.description || "Observation à compléter"}</p><p className="mt-1 text-[11px] text-slate-600 dark:text-slate-500">{formatDate(lesion.date)} {lesion.sizeMm ? `· ∅ ${lesion.sizeMm} mm` : ""}</p></div><div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"><button onClick={onEdit} className="rounded-lg p-2 text-slate-600 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:text-white" aria-label="Modifier"><Edit2 className="size-3.5" /></button><button onClick={onDelete} className="rounded-lg p-2 text-slate-600 dark:text-slate-500 hover:bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-400 dark:text-slate-950 dark:hover:bg-rose-300/10 hover:text-rose-600 dark:text-rose-200" aria-label="Supprimer"><Trash2 className="size-3.5" /></button></div></div></div>;
}
