import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/hooks/use-app-state";

export const Route = createFileRoute("/settings/ai")({
  component: AISettings,
});

function AISettings() {
  const { t } = useAppState();
  return (
    <div className="mx-auto max-w-[800px] space-y-6">
      <PageHeader title={t.settingsPage.aiSettingsTitle} />
      <SectionCard title={t.settingsPage.globalConfig}>
         <p className="text-sm text-muted-foreground mb-4">{t.settingsPage.goToAiAssistantDesc}</p>
         <Button asChild>
            <Link to="/ai-assistant">{t.settingsPage.goToAiAssistantBtn}</Link>
         </Button>
      </SectionCard>
    </div>
  );
}
