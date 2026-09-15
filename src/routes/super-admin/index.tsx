import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Building2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatLongDate } from "@/lib/format";

export const Route = createFileRoute("/super-admin/")({
  component: SuperAdminDashboard,
});

function SuperAdminDashboard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: tenants = [], isLoading } = useQuery<any[]>({
    queryKey: ["tenants"],
    queryFn: () => api.get("/tenants"),
  });

  const createTenant = useMutation({
    mutationFn: (data: any) => api.post("/tenants", data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Cabinet créé avec succès");
      if (data.generatedPassword) {
        setGeneratedPassword(data.generatedPassword);
      } else {
        setIsDialogOpen(false);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la création");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      clinicName: formData.get("clinicName"),
      ownerName: formData.get("ownerName"),
      ownerEmail: formData.get("ownerEmail"),
    };
    createTenant.mutate(data);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cabinets & Cliniques</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez vos clients (tenants) sur la plateforme.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" /> Nouveau Cabinet
            </Button>
          </DialogTrigger>
          <DialogContent>
            {generatedPassword ? (
              <div className="space-y-4 py-4">
                <DialogHeader>
                  <DialogTitle>Cabinet créé avec succès ! 🎉</DialogTitle>
                </DialogHeader>
                <div className="rounded-lg bg-green-50 p-4 text-green-900 border border-green-200">
                  <p className="text-sm font-medium mb-2">Transmettez ces accès au médecin :</p>
                  <p className="text-xl font-mono bg-white px-3 py-2 rounded border inline-block select-all">{generatedPassword}</p>
                </div>
                <DialogFooter>
                  <Button onClick={() => {
                    setGeneratedPassword(null);
                    setIsDialogOpen(false);
                  }}>Fermer</Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Créer un nouveau cabinet</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nom du cabinet / clinique</label>
                    <Input name="clinicName" required placeholder="Ex: Cabinet Dentaire Dr. Dupont" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nom du responsable (Médecin)</label>
                    <Input name="ownerName" required placeholder="Ex: Dr. Jean Dupont" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Adresse Email de connexion</label>
                    <Input name="ownerEmail" type="email" required placeholder="jean.dupont@email.com" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                  <Button type="submit" disabled={createTenant.isPending}>
                    {createTenant.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Générer et créer
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-5 py-3 font-medium text-muted-foreground">Nom du Cabinet</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">ID (Tenant)</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Créé le</th>
              <th className="px-5 py-3 font-medium text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  <Loader2 className="mx-auto size-5 animate-spin" />
                </td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  Aucun cabinet créé.
                </td>
              </tr>
            ) : (
              tenants.map((t) => (
                <tr key={t._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4 font-medium flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <Building2 className="size-4" />
                    </div>
                    {t.name}
                  </td>
                  <td className="px-5 py-4 text-xs font-mono text-muted-foreground">{t._id}</td>
                  <td className="px-5 py-4 text-muted-foreground">{formatLongDate(t.createdAt)}</td>
                  <td className="px-5 py-4 text-right">
                    <Button variant="ghost" size="sm">Gérer</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
