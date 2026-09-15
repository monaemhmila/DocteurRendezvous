import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/shared/ui-kit";
import { integrations } from "@/data/mock";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings/integrations")({
  component: IntegrationsSettings,
});

function IntegrationsSettings() {
  return (
    <div className="mx-auto max-w-[800px] space-y-6">
      <PageHeader title="Intégrations" subtitle="Connectez Dental AI à vos outils." />
      <div className="grid gap-4 sm:grid-cols-2">
         {integrations.map(i => (
            <SectionCard key={i.id} title={i.name} description={i.detail}>
               <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                     {i.status === "connected" ? "Connecté" : i.status === "not_connected" ? "Déconnecté" : "Bientôt"}
                  </span>
                  {i.status === "connected" ? (
                     <Button variant="outline" size="sm">Gérer</Button>
                  ) : i.status === "not_connected" ? (
                     <Button size="sm">Connecter</Button>
                  ) : null}
               </div>
            </SectionCard>
         ))}
      </div>
    </div>
  );
}
