import React, { useState } from "react";
import { Patient } from "@/types";
import { SectionCard } from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Stethoscope, Plus, Trash2, Thermometer, Weight, Ruler, HeartPulse } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface GeneralMetric {
  id: string;
  date: string;
  weight: number;
  height: number;
  temp: number;
  sys: number;
  dia: number;
  notes: string;
}

const getBMICategory = (bmi: number) => {
  if (bmi < 18.5) return { label: "Insuffisance pondérale", color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30", bar: "bg-blue-500", progress: 20 };
  if (bmi < 25) return { label: "Corpulence normale", color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/30", bar: "bg-emerald-500", progress: 50 };
  if (bmi < 30) return { label: "Surpoids", color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30", bar: "bg-amber-500", progress: 75 };
  return { label: "Obésité", color: "text-rose-500", bg: "bg-rose-100 dark:bg-rose-900/30", bar: "bg-rose-500", progress: 95 };
};

export function GeneralChart({ patient, onUpdate, isUpdating }: { patient: Patient; onUpdate: (data: Partial<Patient>) => void; isUpdating: boolean; }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<GeneralMetric | null>(null);

  const specialtyData = patient.specialtyData || {};
  const metrics: GeneralMetric[] = specialtyData["generalMetrics"] || [];

  const handleOpenModal = () => {
    setEditingMetric({ id: crypto.randomUUID(), date: new Date().toISOString().split("T")[0] as string, weight: 70, height: 170, temp: 37.2, sys: 120, dia: 80, notes: "" });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMetric) return;

    const newMetrics = [editingMetric as GeneralMetric, ...metrics].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    onUpdate({ specialtyData: { ...specialtyData, generalMetrics: newMetrics } });
    setIsModalOpen(false);
  };

  const latest = metrics[0];
  let bmi = 0;
  let bmiCategory = null;

  if (latest && latest.height > 0) {
    bmi = latest.weight / Math.pow(latest.height / 100, 2);
    bmiCategory = getBMICategory(bmi);
  }

  return (
    <SectionCard title="Biométrie & Constantes" description="Tableau de bord de santé globale et IMC.">
      <div className="flex justify-end mb-6">
        <Button onClick={handleOpenModal} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm">
          <Plus className="size-4" /> Nouvelle mesure
        </Button>
      </div>

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* LATEST VITALS DASHBOARD */}
        {latest && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* IMC Card */}
            <div className={cn("rounded-2xl p-5 border relative overflow-hidden flex flex-col justify-between h-full shadow-sm", bmiCategory?.bg, "border-white/20 dark:border-white/10")}>
              <div className="flex justify-between items-start mb-4">
                 <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-widest mb-1">IMC Actuel</p>
                    <div className="flex items-baseline gap-1.5">
                       <span className={cn("text-3xl font-black", bmiCategory?.color)}>{bmi.toFixed(1)}</span>
                    </div>
                 </div>
                 <div className={cn("p-2 rounded-xl bg-white/50 dark:bg-black/20", bmiCategory?.color)}>
                    <Weight className="size-5" />
                 </div>
              </div>
              <div>
                 <p className={cn("text-xs font-bold mb-2", bmiCategory?.color)}>{bmiCategory?.label}</p>
                 <div className="h-1.5 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", bmiCategory?.bar)} style={{ width: `${bmiCategory?.progress}%` }} />
                 </div>
                 <div className="flex justify-between text-[8px] text-muted-foreground mt-1 uppercase font-bold">
                    <span>18.5</span>
                    <span>25</span>
                    <span>30</span>
                 </div>
              </div>
            </div>

            {/* Tension Card */}
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-2xl p-5 shadow-sm">
               <div className="flex justify-between items-start mb-4">
                 <div>
                    <p className="text-[10px] uppercase font-bold text-rose-800/60 dark:text-rose-400/60 tracking-widest mb-1">Tension (TA)</p>
                    <div className="flex items-baseline gap-1 text-rose-600 dark:text-rose-400">
                       <span className="text-3xl font-black">{latest.sys}</span>
                       <span className="text-xl font-bold opacity-50">/</span>
                       <span className="text-3xl font-black">{latest.dia}</span>
                    </div>
                 </div>
                 <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600">
                    <HeartPulse className="size-5" />
                 </div>
              </div>
              <p className="text-[10px] font-bold text-rose-800/60 dark:text-rose-400/60 uppercase tracking-widest">mmHg</p>
            </div>

            {/* Temperature Card */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl p-5 shadow-sm">
               <div className="flex justify-between items-start mb-4">
                 <div>
                    <p className="text-[10px] uppercase font-bold text-amber-800/60 dark:text-amber-400/60 tracking-widest mb-1">Température</p>
                    <div className="flex items-baseline gap-1 text-amber-600 dark:text-amber-400">
                       <span className="text-3xl font-black">{latest.temp}</span>
                       <span className="text-lg font-bold">°C</span>
                    </div>
                 </div>
                 <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600">
                    <Thermometer className="size-5" />
                 </div>
              </div>
              <p className="text-[10px] font-bold text-amber-800/60 dark:text-amber-400/60 uppercase tracking-widest">
                {latest.temp > 37.8 ? "Fièvre détectée" : "Normale"}
              </p>
            </div>
            
            {/* Height/Weight Info */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
               <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Poids</p>
                    <p className="text-xl font-black text-foreground">{latest.weight} <span className="text-sm font-medium text-muted-foreground">kg</span></p>
                  </div>
                  <Weight className="size-4 text-muted-foreground/50" />
               </div>
               <div className="w-full h-px bg-border my-2" />
               <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Taille</p>
                    <p className="text-xl font-black text-foreground">{latest.height} <span className="text-sm font-medium text-muted-foreground">cm</span></p>
                  </div>
                  <Ruler className="size-4 text-muted-foreground/50" />
               </div>
            </div>

          </div>
        )}

        {metrics.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed rounded-xl bg-muted/20">
            <Stethoscope className="size-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Aucune constante enregistrée.</p>
          </div>
        ) : (
          <div className="grid gap-3">
             <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 mt-4 flex items-center gap-2">
              <Stethoscope className="size-4" /> Historique des Constantes
            </h3>
            {metrics.map((m, i) => i !== 0 && (
              <div key={m.id} className="p-4 rounded-xl border bg-card shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-1">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Date</p>
                    <p className="font-semibold text-sm mt-0.5">{new Date(m.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Poids / Taille</p>
                    <p className="font-semibold text-sm mt-0.5">
                      {m.weight} kg / {m.height} cm 
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Température</p>
                    <p className="font-semibold text-sm mt-0.5 flex items-center gap-1">
                      {m.temp}°C {m.temp > 37.8 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Tension (SYS/DIA)</p>
                    <p className="font-bold text-sm text-rose-500 mt-0.5">{m.sys}/{m.dia}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Notes</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5" title={m.notes}>{m.notes || "—"}</p>
                  </div>
                </div>
                <Button variant="outline" size="icon" className="size-8 text-rose-500 ml-4 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                  if(window.confirm("Supprimer cet enregistrement ?")) onUpdate({ specialtyData: { ...specialtyData, generalMetrics: metrics.filter(x => x.id !== m.id) } });
                }}><Trash2 className="size-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-2xl">Nouvelles Constantes</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-6 mt-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <label className="text-sm font-bold">Date de la prise</label>
                 <Input type="date" value={editingMetric?.date} onChange={e => setEditingMetric({...editingMetric!, date: e.target.value})} required className="h-12" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-sm font-bold text-amber-600">Température (°C)</label>
                 <div className="relative">
                    <Input type="number" step="0.1" value={editingMetric?.temp} onChange={e => setEditingMetric({...editingMetric!, temp: Number(e.target.value)})} className="h-12 pl-10 font-bold" />
                    <Thermometer className="size-5 absolute left-3 top-3.5 text-amber-500" />
                 </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <label className="text-sm font-bold">Poids (kg)</label>
                 <Input type="number" step="0.5" value={editingMetric?.weight} onChange={e => setEditingMetric({...editingMetric!, weight: Number(e.target.value)})} className="font-bold" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-sm font-bold">Taille (cm)</label>
                 <Input type="number" step="0.5" value={editingMetric?.height} onChange={e => setEditingMetric({...editingMetric!, height: Number(e.target.value)})} className="font-bold" />
              </div>
            </div>

            <div className="bg-rose-50/50 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-100 dark:border-rose-900/50 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <label className="text-sm font-bold text-rose-600">Tension Systolique</label>
                 <Input type="number" value={editingMetric?.sys} onChange={e => setEditingMetric({...editingMetric!, sys: Number(e.target.value)})} className="font-bold text-rose-600" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-sm font-bold text-rose-600">Tension Diastolique</label>
                 <Input type="number" value={editingMetric?.dia} onChange={e => setEditingMetric({...editingMetric!, dia: Number(e.target.value)})} className="font-bold text-rose-600" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold">Observations (Optionnel)</label>
              <Textarea 
                placeholder="État général du patient..."
                value={editingMetric?.notes} 
                onChange={e => setEditingMetric({...editingMetric!, notes: e.target.value})} 
                className="resize-none h-20" 
              />
            </div>
            
            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isUpdating}>Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
