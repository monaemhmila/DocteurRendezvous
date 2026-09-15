import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings/ai")({
  component: AISettings,
});

function AISettings() {
  return (
    <div className="mx-auto max-w-[800px] space-y-6">
      <PageHeader title="Paramètres IA avancés" />
      <SectionCard title="Configuration globale">
         <p className="text-sm text-muted-foreground mb-4">Pour la configuration des capacités, des langues et du mode de réponse, veuillez vous rendre sur la page Assistant IA.</p>
         <Button asChild>
            <Link to="/ai-assistant">Aller à l'Assistant IA</Link>
         </Button>
      </SectionCard>
    </div>
  );
}
