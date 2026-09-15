import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { SectionCard } from "@/components/shared/ui-kit";
import { Users, Loader2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/super-admin/users")({
  component: SuperAdminUsersPage,
});

function SuperAdminUsersPage() {
  const { data: users = [], isLoading, isError } = useQuery<any[]>({
    queryKey: ["super-admin-users"],
    queryFn: () => api.get("/users/all"),
  });

  return (
    <div className="mx-auto max-w-[900px] space-y-6 p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Utilisateurs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vue d'ensemble de tous les utilisateurs sur la plateforme.
        </p>
      </div>
      <SectionCard
        title="Tous les utilisateurs"
        description="Tous les membres d'équipe créés sur la plateforme."
        bodyClassName="p-0"
      >
        <div className="divide-y divide-border">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="mx-auto size-5 animate-spin" />
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-destructive flex items-center justify-center gap-2">
              <AlertCircle className="size-5" /> Erreur lors du chargement des utilisateurs.
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Aucun utilisateur trouvé.
            </div>
          ) : (
            users.map((u) => (
              <div key={u._id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
                    {(u.firstName?.[0] || u.email[0]).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-muted-foreground">{u.email} {u.tenantId?.name ? `· ${u.tenantId.name}` : ""}</p>
                  </div>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  {u.role}
                </span>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}
