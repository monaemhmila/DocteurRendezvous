import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/shared/ui-kit";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/settings/communication")({
  component: CommunicationSettings,
});

function CommunicationSettings() {
  return (
    <div className="mx-auto max-w-[800px] space-y-6">
      <PageHeader title="Canaux de communication" />
      <SectionCard>
         <div className="space-y-6">
            <div className="flex items-center justify-between">
               <div>
                  <p className="font-medium">WhatsApp Business</p>
                  <p className="text-sm text-muted-foreground">Canal principal pour l'IA et les relances.</p>
               </div>
               <Switch checked={true} />
            </div>
            <div className="flex items-center justify-between">
               <div>
                  <p className="font-medium">SMS</p>
                  <p className="text-sm text-muted-foreground">Utilisé pour les confirmations à J-1 si WhatsApp n'est pas disponible.</p>
               </div>
               <Switch checked={true} />
            </div>
            <div className="flex items-center justify-between">
               <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">Pour l'envoi de devis et documents PDF.</p>
               </div>
               <Switch checked={false} />
            </div>
         </div>
      </SectionCard>
    </div>
  );
}
