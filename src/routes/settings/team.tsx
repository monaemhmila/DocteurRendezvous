import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";

export const Route = createFileRoute("/settings/team")({
  component: TeamSettings,
});

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  clinic_owner: "Propriétaire",
  receptionist: "Réceptionniste",
  dentist: "Dentiste",
};

function TeamSettings() {
  const { data: teamMembers = [], isLoading, isError } = useQuery<any[]>({
    queryKey: ["team"],
    queryFn: () => api.get("/users/team"),
  });

  return (
    <div className="mx-auto max-w-[800px] space-y-6">
      <PageHeader title="Équipe" actions={<Button><Plus className="mr-2 size-4" />Ajouter un membre</Button>} />
      <SectionCard bodyClassName="p-0">
         <div className="divide-y divide-border">
            {isLoading && (
              <div className="p-8 text-center text-muted-foreground animate-pulse">
                <Loader2 className="inline mr-2 size-4 animate-spin" />
                Chargement...
              </div>
            )}
            
            {isError && (
              <div className="p-8 text-center text-destructive">
                Impossible de charger les membres de l'équipe.
              </div>
            )}

            {!isLoading && !isError && teamMembers.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                Aucun membre trouvé dans l'équipe.
              </div>
            )}

            {!isLoading && !isError && teamMembers.map((t: any) => {
               const name = `${t.firstName || ""} ${t.lastName || ""}`.trim();
               const initials = `${(t.firstName || "")[0] || ""}${(t.lastName || "")[0] || ""}`.toUpperCase();
               const role = roleLabels[t.role] || t.role;
               
               return (
                 <div key={t._id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                       <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground font-semibold">{initials}</span>
                       <div>
                          <p className="font-medium">{name}</p>
                          <p className="text-xs text-muted-foreground">{t.email} • {role}</p>
                       </div>
                    </div>
                    <Button variant="ghost" size="sm">Modifier</Button>
                 </div>
               );
            })}
         </div>
      </SectionCard>
    </div>
  );
}
