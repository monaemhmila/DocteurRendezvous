import { createFileRoute, Navigate } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/shared/ui-kit";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/auth-context";
import { useAppState } from "@/hooks/use-app-state";

export const Route = createFileRoute("/settings/communication")({
  component: CommunicationSettings,
});

function CommunicationSettings() {
  const { hasPermission } = useAuth();
  const { t } = useAppState();
  if (!hasPermission("settings")) return <Navigate to="/" />;

  return (
    <div className="mx-auto max-w-[800px] space-y-6">
      <PageHeader title={t.settingsPage.commChannelsTitle} />
      <SectionCard>
         <div className="space-y-6">
            <div className="flex items-center justify-between">
               <div>
                  <p className="font-medium">WhatsApp Business</p>
                  <p className="text-sm text-muted-foreground">{t.settingsPage.waMainChannelDesc}</p>
               </div>
               <Switch checked={true} />
            </div>
            <div className="flex items-center justify-between">
               <div>
                  <p className="font-medium">SMS</p>
                  <p className="text-sm text-muted-foreground">{t.settingsPage.smsConfirmDesc}</p>
               </div>
               <Switch checked={true} />
            </div>
            <div className="flex items-center justify-between">
               <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{t.settingsPage.emailDocsDesc}</p>
               </div>
               <Switch checked={false} />
            </div>
         </div>
      </SectionCard>
    </div>
  );
}
