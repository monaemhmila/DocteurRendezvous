import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/shared/ui-kit";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/super-admin/settings")({
  component: SuperAdminSettingsPage,
});

function SuperAdminSettingsPage() {
  return (
    <div className="mx-auto max-w-[800px] space-y-6 p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Paramètres plateforme</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configuration globale de la plateforme Medical AI.
        </p>
      </div>

      <SectionCard title="Fonctionnalités globales">
        <div className="space-y-5">
          {[
            { label: "Inscriptions ouvertes", desc: "Autoriser la création de nouveaux cabinets depuis la page publique.", checked: false },
            { label: "Mode maintenance", desc: "Afficher une page de maintenance à tous les utilisateurs.", checked: false },
            { label: "Logs d'audit activés", desc: "Enregistrer toutes les actions importantes dans les logs.", checked: true },
          ].map((s) => (
            <div key={s.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
              <Switch defaultChecked={s.checked} onCheckedChange={() => toast.success("Paramètre mis à jour")} />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Version de la plateforme">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Version</dt><dd className="font-medium">1.0.0-beta</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Environnement</dt><dd className="font-medium">Développement</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Base de données</dt><dd className="font-medium text-success">Connectée</dd></div>
        </dl>
      </SectionCard>
    </div>
  );
}
