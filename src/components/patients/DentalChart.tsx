import React, { useMemo, useState } from "react";
import { Patient, ToothChart } from "@/types";
import { SectionCard } from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, CircleDot, Crown, Eye, Grid2X2, Layers3, ScanLine, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";

type Surface = "O" | "V" | "L" | "M" | "D";
type DentalStatus = "healthy" | "caries" | "filled" | "crown" | "implant" | "extracted";

const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
const LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];

const STATUS_CONFIG: Record<DentalStatus, { label: string; color: string; fill: string; stroke: string; tone: string }> = {
  healthy: { label: "Saine", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-300/10 dark:text-emerald-200 dark:border-emerald-200/20", fill: "#f8fafc", stroke: "#94a3b8", tone: "emerald" },
  caries: { label: "Carie", color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-300/10 dark:text-rose-200 dark:border-rose-200/20", fill: "#fb7185", stroke: "#e11d48", tone: "rose" },
  filled: { label: "Composite / plombage", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-300/10 dark:text-blue-200 dark:border-blue-200/20", fill: "#60a5fa", stroke: "#2563eb", tone: "blue" },
  crown: { label: "Couronne", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-300/10 dark:text-amber-200 dark:border-amber-200/20", fill: "#fbbf24", stroke: "#d97706", tone: "amber" },
  implant: { label: "Implant", color: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-300/10 dark:text-violet-200 dark:border-violet-200/20", fill: "#a78bfa", stroke: "#7c3aed", tone: "violet" },
  extracted: { label: "Extraite", color: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-300/10 dark:text-slate-400 dark:border-slate-200/20", fill: "#334155", stroke: "#64748b", tone: "slate" },
};

function getToothKind(id: number) {
  const n = id % 10;
  if (n === 1 || n === 2) return "incisor";
  if (n === 3) return "canine";
  if (n === 4 || n === 5) return "premolar";
  return "molar";
}

/** Right-side quadrants (1x and 4x): the outer polygon is distal, the inner one mesial. */
function isRightQuadrant(id: number) {
  return (id >= 11 && id <= 18) || (id >= 41 && id <= 48);
}

function DentalTooth({
  id,
  toothData,
  isUpper,
  onClick,
  interactive = false,
  selectedSurface,
  onSurfaceClick,
}: {
  id: number;
  toothData?: ToothChart | undefined;
  isUpper: boolean;
  onClick?: (() => void) | undefined;
  interactive?: boolean | undefined;
  selectedSurface?: Surface | null | undefined;
  onSurfaceClick?: ((surface: Surface) => void) | undefined;
}) {
  const status = (toothData?.status || "healthy") as DentalStatus;
  const surfaces = toothData?.surfaces || {};
  const kind = getToothKind(id);
  const size = interactive ? 150 : 54;
  const safeId = `tooth-${id}-${interactive ? "modal" : "arch"}`;
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.healthy;
  const selected = (surface: Surface) => interactive && selectedSurface === surface;

  const fillFor = (surface: Surface) => {
    if (status === "crown" || status === "implant") return `url(#${safeId}-status)`;
    if (status === "extracted") return `url(#${safeId}-extracted)`;
    const surfaceStatus = surfaces[surface] as DentalStatus | undefined;
    return surfaceStatus && STATUS_CONFIG[surfaceStatus] ? STATUS_CONFIG[surfaceStatus].fill : `url(#${safeId}-enamel)`;
  };
  const strokeFor = () => (status === "crown" ? "#d97706" : status === "implant" ? "#7c3aed" : status === "extracted" ? "#64748b" : "#a8c1d1");

  const poly = (points: string, surface: Surface, label: string) => (
    <polygon
      points={points}
      fill={fillFor(surface)}
      // Cyan highlight stays visible on both the white (light) and navy (dark) modal backgrounds
      stroke={selected(surface) ? "#06b6d4" : strokeFor()}
      strokeWidth={selected(surface) ? 3.5 : 1.5}
      strokeLinejoin="round"
      className={cn("transition-all duration-200", (interactive || onClick) && "cursor-pointer hover:brightness-110")}
      onClick={(event) => {
        event.stopPropagation();
        if (interactive && onSurfaceClick) onSurfaceClick(surface);
        else onClick?.();
      }}
    >
      <title>{label}</title>
    </polygon>
  );

  const baseScale = kind === "molar" ? "scale-110" : kind === "premolar" ? "scale-100" : kind === "canine" ? "scale-95" : "scale-90";
  const rightQuadrant = isRightQuadrant(id);

  return (
    <div className={cn("group relative flex flex-col items-center", interactive ? "gap-3 mx-auto" : "gap-1")} onClick={!interactive ? onClick : undefined} style={{ width: size }}>
      {!interactive && (
        <span className={cn("font-mono text-[10px] font-black transition-colors", toothData ? "text-cyan-600 dark:text-cyan-200" : "text-slate-400 group-hover:text-slate-900 dark:text-slate-600 dark:group-hover:text-white")}>{id}</span>
      )}
      <div className={cn("relative transition-transform duration-200 group-hover:-translate-y-1", interactive ? "size-36" : "size-12", baseScale)}>
        <svg viewBox="0 0 100 120" className="size-full overflow-visible drop-shadow-[0_8px_8px_rgba(15,23,42,.18)] dark:drop-shadow-[0_9px_8px_rgba(0,0,0,.35)]" aria-label={`Dent ${id}`}>
          <defs>
            <linearGradient id={`${safeId}-enamel`} x1="15" y1="10" x2="80" y2="105" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" />
              <stop offset=".38" stopColor="#e8f6ff" />
              <stop offset=".72" stopColor="#b9d2df" />
              <stop offset="1" stopColor="#7893a4" />
            </linearGradient>
            <linearGradient id={`${safeId}-status`} x1="10" y1="0" x2="90" y2="120" gradientUnits="userSpaceOnUse">
              <stop stopColor={config.fill} />
              <stop offset=".5" stopColor={status === "crown" ? "#fde68a" : status === "implant" ? "#c4b5fd" : config.stroke} />
              <stop offset="1" stopColor={config.stroke} />
            </linearGradient>
            <pattern id={`${safeId}-extracted`} patternUnits="userSpaceOnUse" width="9" height="9" patternTransform="rotate(45)">
              <rect width="9" height="9" fill="#243447" />
              <line x1="0" y1="0" x2="0" y2="9" stroke="#94a3b8" strokeWidth="3" />
            </pattern>
            <radialGradient id={`${safeId}-shine`} cx="28%" cy="18%">
              <stop stopColor="#fff" stopOpacity=".95" />
              <stop offset=".5" stopColor="#fff" stopOpacity=".15" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g transform={isUpper ? "" : "translate(0 120) scale(1 -1)"}>
            {poly("6,4 94,4 78,29 22,29", isUpper ? "V" : "L", isUpper ? "Vestibulaire" : "Linguale")}
            {poly("22,91 78,91 94,116 6,116", isUpper ? "L" : "V", isUpper ? "Linguale" : "Vestibulaire")}
            {poly("6,4 22,29 22,91 6,116", rightQuadrant ? "D" : "M", rightQuadrant ? "Distale" : "Mésiale")}
            {poly("94,4 78,29 78,91 94,116", rightQuadrant ? "M" : "D", rightQuadrant ? "Mésiale" : "Distale")}
            {poly("22,29 78,29 78,91 22,91", "O", "Occlusale")}
            <rect x="22" y="29" width="56" height="62" rx="13" fill={`url(#${safeId}-shine)`} opacity=".55" pointerEvents="none" />
            {status === "implant" && (
              <>
                <circle cx="50" cy="58" r="18" fill="#e2e8f0" stroke="#64748b" strokeWidth="3" pointerEvents="none" />
                <path d="M38 58h24M40 64h20M42 70h16" stroke="#475569" strokeWidth="2" strokeLinecap="round" pointerEvents="none" />
              </>
            )}
            {status === "crown" && <path d="M28 35C35 26 65 26 72 35" fill="none" stroke="#fff7ed" strokeWidth="3" opacity=".7" pointerEvents="none" />}
            {status === "extracted" && (
              <>
                <line x1="15" y1="15" x2="85" y2="105" stroke="#fb7185" strokeWidth="5" strokeLinecap="round" pointerEvents="none" />
                <line x1="85" y1="15" x2="15" y2="105" stroke="#fb7185" strokeWidth="5" strokeLinecap="round" pointerEvents="none" />
              </>
            )}
          </g>
        </svg>
        {toothData?.notes && !interactive && <span className="absolute -right-1 -top-1 flex size-3 items-center justify-center rounded-full bg-cyan-500 ring-2 ring-white dark:bg-cyan-300 dark:ring-[#07101d]" />}
      </div>
    </div>
  );
}

export function DentalChart({ patient, onUpdate, isUpdating }: { patient: Patient; onUpdate: (data: Partial<Patient>) => void; isUpdating: boolean }) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [activeSurface, setActiveSurface] = useState<Surface | null>("O");
  const [editingTooth, setEditingTooth] = useState<ToothChart | null>(null);
  const chart = patient.dentalChart || [];
  const getTooth = (id: number) => chart.find((tooth) => tooth.toothId === id);
  const documented = chart.filter((tooth) => tooth.status !== "healthy");
  const counts = useMemo(
    () => Object.keys(STATUS_CONFIG).reduce((acc, status) => ({ ...acc, [status]: chart.filter((tooth) => tooth.status === status).length }), {} as Record<DentalStatus, number>),
    [chart],
  );

  const openTooth = (toothId: number) => {
    const existing = getTooth(toothId);
    setSelectedTooth(toothId);
    setEditingTooth(existing ? { ...existing } : { toothId, status: "healthy", surfaces: {}, notes: "" });
    setActiveSurface("O");
  };

  const closeModal = () => {
    setSelectedTooth(null);
    setEditingTooth(null);
  };

  const applyStatus = (statusKey: string) => {
    if (!editingTooth) return;
    if (["crown", "implant", "extracted", "healthy"].includes(statusKey)) {
      setEditingTooth({ ...editingTooth, status: statusKey, surfaces: {} });
    } else if (activeSurface) {
      setEditingTooth({
        ...editingTooth,
        status: editingTooth.status === "healthy" ? "mixed" : editingTooth.status,
        surfaces: { ...editingTooth.surfaces, [activeSurface]: statusKey },
      });
    }
  };

  const saveTooth = (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedTooth === null || !editingTooth) return;
    const next = [...chart];
    const index = next.findIndex((tooth) => tooth.toothId === selectedTooth);
    const empty = editingTooth.status === "healthy" && Object.keys(editingTooth.surfaces || {}).length === 0 && !editingTooth.notes;
    const stamped = { ...editingTooth, updatedAt: new Date().toISOString() };
    if (index >= 0) {
      if (empty) next.splice(index, 1);
      else next.splice(index, 1, stamped);
    } else if (!empty) {
      next.push(stamped);
    }
    onUpdate({ dentalChart: next });
    closeModal();
  };

  return (
    <SectionCard title="Odontogramme clinique" description="Arcade FDI interactive, surfaces dentaires, actes globaux et suivi des restaurations.">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl shadow-slate-200 dark:border-slate-800 dark:bg-[#07101d] dark:text-white dark:shadow-slate-950/20 sm:p-7">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(45,212,191,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,.05)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="pointer-events-none absolute -right-40 -top-40 size-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 size-96 rounded-full bg-violet-500/10 blur-3xl" />

        {/* Header */}
        <div className="relative flex flex-col justify-between gap-5 border-b border-slate-200 pb-6 dark:border-white/10 sm:flex-row sm:items-start">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-cyan-600 dark:text-cyan-200/70">
              <CircleDot className="size-3 text-emerald-500 dark:text-emerald-300" /> Dental intelligence layer <span className="text-slate-400 dark:text-slate-600">/</span> FDI 11–48
            </div>
            <h3 className="text-2xl font-black tracking-[-.04em] sm:text-3xl">Dental command center</h3>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Eye className="size-4" /> Patient : <strong className="text-slate-700 dark:text-slate-200">{patient.firstName} {patient.lastName}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:border-cyan-200/15 dark:bg-cyan-300/10 dark:text-cyan-100">
            <ScanLine className="size-4" /> Mode 3D clinique
          </div>
        </div>

        {/* KPIs */}
        <div className="relative grid gap-3 py-6 sm:grid-cols-2 xl:grid-cols-4">
          <OverviewCard icon={Grid2X2} label="Dents documentées" value={`${documented.length}`} helper="sur 32 dents FDI" tone="cyan" />
          <OverviewCard icon={ShieldCheck} label="Dents saines" value={`${32 - documented.length}`} helper="sans anomalie enregistrée" tone="emerald" />
          <OverviewCard icon={AlertTriangle} label="Lésions / actes" value={`${(counts.caries || 0) + (counts.filled || 0)}`} helper="caries et restaurations" tone="rose" />
          <OverviewCard icon={Crown} label="Prothèses / implants" value={`${(counts.crown || 0) + (counts.implant || 0)}`} helper="suivi prothétique" tone="violet" />
        </div>

        {/* Arch */}
        <div className="relative rounded-[2rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[.035] sm:p-7">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h4 className="flex items-center gap-2 font-black"><Layers3 className="size-4 text-cyan-600 dark:text-cyan-200" /> Arcade dentaire 3D</h4>
              <p className="mt-1 text-xs text-slate-500">Cliquez sur une dent pour ouvrir ses faces et son état clinique.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-500 dark:border-white/10 dark:bg-black/15 dark:text-slate-400">Système FDI · 32 unités</span>
          </div>
          <div className="overflow-x-auto pb-4">
            <div className="mx-auto flex min-w-[850px] flex-col items-center gap-8">
              <JawRow label="Maxillaire" left={UPPER_RIGHT} right={UPPER_LEFT} upper getTooth={getTooth} onOpen={openTooth} />
              <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-[.35em] text-slate-400 dark:text-slate-600">
                <span className="h-px w-24 bg-gradient-to-r from-transparent to-cyan-400/40 dark:to-cyan-200/20" /> Ligne médiane <span className="h-px w-24 bg-gradient-to-l from-transparent to-cyan-400/40 dark:to-cyan-200/20" />
              </div>
              <JawRow label="Mandibule" left={LOWER_RIGHT} right={LOWER_LEFT} getTooth={getTooth} onOpen={openTooth} />
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="relative mt-5 flex flex-wrap gap-2">
          {(Object.entries(STATUS_CONFIG) as [DentalStatus, (typeof STATUS_CONFIG)[DentalStatus]][]).map(([key, config]) => (
            <div key={key} className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold", config.color)}>
              <span className="size-2 rounded-full ring-1 ring-black/10 dark:ring-white/10" style={{ backgroundColor: config.fill }} />
              {config.label}
              <span className="opacity-60">{counts[key] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      <Dialog open={selectedTooth !== null} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="max-w-3xl overflow-hidden border-slate-200 bg-white text-slate-900 dark:border-slate-200/20 dark:bg-[#0a1220] dark:text-white">
          <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
            <div>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-2xl font-black">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600 dark:bg-cyan-300/10 dark:text-cyan-200"><Sparkles className="size-5" /></span>
                  Dent {selectedTooth}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400">Sélectionnez une face ou appliquez un état global à cette dent.</DialogDescription>
              </DialogHeader>
              {editingTooth && selectedTooth !== null && (
                <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[.035]">
                  <DentalTooth id={selectedTooth} isUpper={selectedTooth < 30} toothData={editingTooth} interactive selectedSurface={activeSurface} onSurfaceClick={setActiveSurface} />
                  <div className="mt-5 flex justify-center gap-2">
                    {(["O", "V", "L", "M", "D"] as Surface[]).map((surface) => (
                      <button
                        key={surface}
                        type="button"
                        onClick={() => setActiveSurface(surface)}
                        className={cn(
                          "size-9 rounded-xl border text-xs font-black transition-all",
                          activeSurface === surface
                            ? "border-cyan-400 bg-cyan-50 text-cyan-700 shadow-[0_0_14px_rgba(6,182,212,.2)] dark:border-cyan-200/40 dark:bg-cyan-300/15 dark:text-cyan-100 dark:shadow-[0_0_14px_rgba(103,232,249,.18)]"
                            : "border-slate-200 bg-white text-slate-500 hover:text-slate-900 dark:border-white/10 dark:bg-white/[.03] dark:hover:text-white",
                        )}
                      >
                        {surface}
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-center text-[10px] uppercase tracking-wider text-slate-500">
                    Face active : <strong className="text-cyan-600 dark:text-cyan-200">{activeSurface || "—"}</strong>
                  </p>
                </div>
              )}
            </div>

            <form onSubmit={saveTooth} className="flex flex-col gap-5">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Acte sur la face {activeSurface || "—"}</p>
                <div className="grid grid-cols-2 gap-2">
                  <ActionButton label="Carie" color="rose" onClick={() => applyStatus("caries")} />
                  <ActionButton label="Composite" color="blue" onClick={() => applyStatus("filled")} />
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">État global de la dent</p>
                <div className="grid grid-cols-2 gap-2">
                  <ActionButton label="Couronne" color="amber" icon={<Crown className="size-3.5" />} onClick={() => applyStatus("crown")} />
                  <ActionButton label="Implant" color="violet" icon={<CircleDot className="size-3.5" />} onClick={() => applyStatus("implant")} />
                  <ActionButton label="Extraction" color="rose" icon={<Trash2 className="size-3.5" />} onClick={() => applyStatus("extracted")} />
                  <ActionButton label="Remettre saine" color="emerald" icon={<ShieldCheck className="size-3.5" />} onClick={() => applyStatus("healthy")} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Notes cliniques</label>
                <Textarea
                  value={editingTooth?.notes || ""}
                  onChange={(event) => setEditingTooth((current) => (current ? { ...current, notes: event.target.value } : null))}
                  className="min-h-28 resize-none border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-600"
                  placeholder="Ex. composite occlusal teinte A2, sensibilité, contrôle recommandé..."
                />
              </div>
              <DialogFooter className="mt-auto border-t border-slate-200 pt-5 dark:border-white/10">
                <Button type="button" variant="outline" onClick={closeModal} className="border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:text-white dark:hover:bg-white/10">
                  <X className="mr-2 size-4" /> Annuler
                </Button>
                <Button type="submit" disabled={isUpdating} className="bg-cyan-600 font-black text-white hover:bg-cyan-700 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200">
                  <Check className="mr-2 size-4" /> {isUpdating ? "Sauvegarde..." : "Valider l'odontogramme"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

function JawRow({ label, left, right, upper = false, getTooth, onOpen }: { label: string; left: number[]; right: number[]; upper?: boolean; getTooth: (id: number) => ToothChart | undefined; onOpen: (id: number) => void }) {
  return (
    <div className="w-full">
      <div className="mb-3 flex items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">{label}</span>
        <span className="h-px flex-1 bg-slate-200 dark:bg-white/5" />
      </div>
      <div className="flex items-end justify-center gap-2 border-b border-slate-200 pb-5 dark:border-white/10 sm:gap-3">
        <div className="flex items-end gap-1 sm:gap-2">
          {left.map((id) => <DentalTooth key={id} id={id} isUpper={upper} toothData={getTooth(id)} onClick={() => onOpen(id)} />)}
        </div>
        <div className="h-28 w-px bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent dark:via-cyan-200/20" />
        <div className="flex items-end gap-1 sm:gap-2">
          {right.map((id) => <DentalTooth key={id} id={id} isUpper={upper} toothData={getTooth(id)} onClick={() => onOpen(id)} />)}
        </div>
      </div>
    </div>
  );
}

type ActionColor = "rose" | "blue" | "amber" | "violet" | "emerald";

const ACTION_HOVER: Record<ActionColor, string> = {
  rose: "hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:hover:border-rose-300/40 dark:hover:bg-rose-300/10 dark:hover:text-rose-100",
  blue: "hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:border-blue-300/40 dark:hover:bg-blue-300/10 dark:hover:text-blue-100",
  amber: "hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:hover:border-amber-300/40 dark:hover:bg-amber-300/10 dark:hover:text-amber-100",
  violet: "hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:hover:border-violet-300/40 dark:hover:bg-violet-300/10 dark:hover:text-violet-100",
  emerald: "hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:border-emerald-300/40 dark:hover:bg-emerald-300/10 dark:hover:text-emerald-100",
};

const ACTION_DOT: Record<ActionColor, string> = {
  rose: "bg-rose-500 dark:bg-rose-300",
  blue: "bg-blue-500 dark:bg-blue-300",
  amber: "bg-amber-500 dark:bg-amber-300",
  violet: "bg-violet-500 dark:bg-violet-300",
  emerald: "bg-emerald-500 dark:bg-emerald-300",
};

function ActionButton({ label, color, icon, onClick }: { label: string; color: ActionColor; icon?: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-xs font-bold text-slate-600 transition-all dark:border-white/10 dark:bg-white/[.03] dark:text-slate-400", ACTION_HOVER[color])}
    >
      {icon || <span className={cn("size-2.5 rounded-full", ACTION_DOT[color])} />} {label}
    </button>
  );
}

function OverviewCard({ icon: Icon, label, value, helper, tone }: { icon: React.ElementType; label: string; value: string; helper: string; tone: "cyan" | "emerald" | "rose" | "violet" }) {
  const styles = {
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-200/15 dark:bg-cyan-300/10 dark:text-cyan-100",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-200/15 dark:bg-emerald-300/10 dark:text-emerald-100",
    rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-200/15 dark:bg-rose-300/10 dark:text-rose-100",
    violet: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-200/15 dark:bg-violet-300/10 dark:text-violet-100",
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
