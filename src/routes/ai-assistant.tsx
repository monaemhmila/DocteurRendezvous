import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Languages, MessageCircle, AlertTriangle, Check, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SectionCard, AIStatusBadge } from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/ai-assistant")({
  head: () => ({
    meta: [
      { title: "Assistant IA — Dental AI" },
      { name: "description", content: "Paramètres de votre assistant IA Dental AI." },
    ],
  }),
  component: AIAssistantPage,
});

function AIAssistantPage() {
  const handleSave = () => toast.success("Paramètres enregistrés.");

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <PageHeader
        title="Assistant IA"
        subtitle="Votre assistant répond automatiquement aux demandes administratives des patients."
        actions={
          <Button onClick={handleSave}>Enregistrer</Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <SectionCard 
            title="Capacités actives" 
            description="L'IA est autorisée à gérer les cas suivants en toute autonomie"
          >
            <div className="grid grid-cols-2 gap-4">
              {[
                "Disponibilités de rendez-vous",
                "Prise de rendez-vous",
                "Report et annulation",
                "Confirmation de rendez-vous",
                "Informations du cabinet",
                "Horaires d'ouverture",
                "Accès et localisation",
                "Relances et suivis",
              ].map((cap, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded bg-success-soft text-success">
                    <Check className="size-3.5" />
                  </span>
                  <span className="text-sm font-medium">{cap}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-6 rounded-lg bg-warning/10 p-4 border border-warning/20 flex items-start gap-3">
               <AlertTriangle className="size-5 text-warning shrink-0" />
               <div className="text-sm text-warning-foreground">
                  <p className="font-semibold">Important : L'IA ne donne jamais d'avis médical.</p>
                  <p className="mt-1">Si un patient pose une question médicale ou décrit des symptômes, l'IA lui indique qu'elle ne peut pas répondre et transfère la conversation à l'équipe.</p>
               </div>
            </div>
          </SectionCard>

          <SectionCard title="Personnalité et Langues">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                 <Languages className="size-5 text-muted-foreground mt-0.5" />
                 <div className="flex-1">
                    <h4 className="text-sm font-semibold">Langues gérées</h4>
                    <p className="text-sm text-muted-foreground mb-3">L'IA s'adapte automatiquement à la langue du patient.</p>
                    <div className="flex flex-wrap gap-2">
                      {["Français", "Arabe Tunisien", "Arabizi", "Anglais"].map(l => (
                        <span key={l} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                          {l}
                        </span>
                      ))}
                    </div>
                 </div>
              </div>
              <Separator />
              <div className="flex items-start gap-4">
                 <MessageCircle className="size-5 text-muted-foreground mt-0.5" />
                 <div className="flex-1">
                    <h4 className="text-sm font-semibold">Ton de la voix</h4>
                    <select className="mt-2 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm">
                      <option>Amical et professionnel</option>
                      <option>Strictement professionnel</option>
                      <option>Chaleureux et empathique</option>
                    </select>
                 </div>
              </div>
            </div>
          </SectionCard>
          
          <SectionCard title="Escalade humaine" description="Quand l'IA doit-elle passer le relais à la réception ?">
             <div className="space-y-4">
               {[
                 { label: "Question d'ordre médical ou de diagnostic", enabled: true },
                 { label: "Patient frustré ou en colère", enabled: true },
                 { label: "Demande complexe ou devis spécifique", enabled: true },
                 { label: "Confiance de l'IA jugée faible (< 90%)", enabled: true },
               ].map((rule, i) => (
                 <div key={i} className="flex items-center justify-between">
                   <span className="text-sm font-medium">{rule.label}</span>
                   <Switch checked={rule.enabled} />
                 </div>
               ))}
             </div>
          </SectionCard>

          <SectionCard className="border-muted bg-muted/30 opacity-70">
            <div className="flex items-center gap-3 mb-2">
              <Volume2 className="size-5 text-muted-foreground" />
              <h3 className="font-semibold">AI Voice Receptionist</h3>
              <span className="rounded-full bg-muted-foreground/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Bientôt</span>
            </div>
            <p className="text-sm text-muted-foreground">Répondez automatiquement aux appels téléphoniques, prenez les rendez-vous et gérez les demandes administratives par la voix.</p>
          </SectionCard>
        </div>

        <div className="space-y-6">
           <SectionCard title="Statut" className="bg-ai-soft/20 border-ai/20">
              <div className="flex items-center justify-between mb-4">
                 <span className="font-semibold">Assistant IA</span>
                 <AIStatusBadge active={true} />
              </div>
              <p className="text-sm text-muted-foreground mb-4">L'assistant est actif sur WhatsApp. Il traite les messages entrants 24/7.</p>
              <Button className="w-full" variant="outline">Mettre en pause</Button>
           </SectionCard>
           
           <SectionCard title="Mode de réponse">
              <div className="space-y-3">
                 <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <input type="radio" name="mode" className="mt-1" defaultChecked />
                    <div>
                       <p className="font-medium text-sm">Automatique</p>
                       <p className="text-xs text-muted-foreground">L'IA répond directement aux patients.</p>
                    </div>
                 </label>
                 <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <input type="radio" name="mode" className="mt-1" />
                    <div>
                       <p className="font-medium text-sm">Approbation requise</p>
                       <p className="text-xs text-muted-foreground">L'IA rédige des brouillons que vous validez.</p>
                    </div>
                 </label>
              </div>
           </SectionCard>
        </div>
      </div>
    </div>
  );
}
