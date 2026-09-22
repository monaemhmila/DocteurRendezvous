import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings/integrations")({
  component: IntegrationsSettings,
});

const integrations = [
  { id: "whatsapp", name: "WhatsApp Cloud API", detail: "Configuration Meta gérée côté serveur.", status: "server_config" },
  { id: "ai", name: "Fournisseur IA", detail: "Configuration via les variables d'environnement du backend.", status: "server_config" },
] as const;

function IntegrationsSettings() {
  return (
    <div className="mx-auto max-w-[800px] space-y-6">
      <PageHeader title="Intégrations" subtitle="Connectez Dental AI à vos outils." />
      <div className="grid gap-4 sm:grid-cols-2">
         {integrations.map(i => (
            <SectionCard key={i.id} title={i.name} description={i.detail}>
               <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                     {i.status === "server_config" ? "Configuration serveur" : "Non disponible"}
                  </span>
                  <Button variant="outline" size="sm" disabled>
                    Géré côté serveur
                  </Button>
               </div>
            </SectionCard>
         ))}
      </div>
    </div>
  );
}
