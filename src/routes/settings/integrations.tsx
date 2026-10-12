import { createFileRoute, Navigate } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useAppState } from "@/hooks/use-app-state";

export const Route = createFileRoute("/settings/integrations")({
  component: IntegrationsSettings,
});

function IntegrationsSettings() {
  const { hasPermission } = useAuth();
  const { t } = useAppState();
  if (!hasPermission("settings")) return <Navigate to="/" />;

  const integrations = [
    { id: "whatsapp", name: "WhatsApp Cloud API", detail: t.settingsPage.metaConfigServer, status: "server_config" },
    { id: "ai", name: t.settingsPage.aiProvider, detail: t.settingsPage.aiProviderEnv, status: "server_config" },
  ] as const;

  return (
    <div className="mx-auto max-w-[800px] space-y-6">
      <PageHeader title={t.settingsPage.integrationsTitle} subtitle={t.settingsPage.integrationsSubtitle} />
      <div className="grid gap-4 sm:grid-cols-2">
         {integrations.map(i => (
            <SectionCard key={i.id} title={i.name} description={i.detail}>
               <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                     {i.status === "server_config" ? t.settingsPage.serverConfig : t.settingsPage.notAvailable}
                  </span>
                  <Button variant="outline" size="sm" disabled>
                    {t.settingsPage.managedServerSide}
                  </Button>
               </div>
            </SectionCard>
         ))}
      </div>
    </div>
  );
}
