import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/settings/clinic")({
  component: ClinicSettings,
});

function ClinicSettings() {
  const { data: tenant, isLoading, isError } = useQuery<any>({
    queryKey: ["currentTenant"],
    queryFn: () => api.get("/tenants/current"),
  });

  const handleSave = () => toast.success("Paramètres enregistrés.");

  if (isLoading) {
    return (
      <div className="p-12 text-center text-muted-foreground animate-pulse">
        <Loader2 className="inline mr-2 size-4 animate-spin" />
        Chargement...
      </div>
    );
  }

  if (isError || !tenant) {
    return (
      <div className="p-12 text-center text-destructive">
        Impossible de charger les paramètres du cabinet.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[800px] space-y-6">
      <PageHeader title="Paramètres du cabinet" actions={<Button onClick={handleSave}>Enregistrer</Button>} />
      <SectionCard title="Informations générales">
         <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom du cabinet</label>
              <Input defaultValue={tenant.name} className="mt-1 max-w-md" />
            </div>
            <div>
              <label className="text-sm font-medium">Adresse</label>
              <Input defaultValue="" placeholder="Non renseignée" className="mt-1" disabled />
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-md">
               <div>
                 <label className="text-sm font-medium">Téléphone</label>
                 <Input defaultValue="" placeholder="Non renseigné" className="mt-1" disabled />
               </div>
               <div>
                 <label className="text-sm font-medium">Email</label>
                 <Input defaultValue="" placeholder="Non renseigné" className="mt-1" disabled />
               </div>
            </div>
         </div>
      </SectionCard>
    </div>
  );
}
