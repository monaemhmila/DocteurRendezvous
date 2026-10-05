import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, Loader2, Save, ListTodo } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageHeader, SectionCard, EmptyState } from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin } from "@/contexts/admin-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/settings/catalog")({
  component: CatalogSettings,
});

export interface IClinicService {
  id?: string;
  name: string;
  durationMin: number;
  price?: number;
  description?: string;
}

function CatalogSettings() {
  const { isAdminUnlocked } = useAdmin();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<IClinicService | null>(null);

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["currentTenant"],
    queryFn: () => api.get("/tenants/current"),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (services: IClinicService[]) => {
      return await api.put("/tenants/settings", { services });
    },
    onSuccess: () => {
      toast.success("Catalogue mis à jour avec succès !");
      queryClient.invalidateQueries({ queryKey: ["currentTenant"] });
      setIsModalOpen(false);
      setEditingService(null);
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  if (!isAdminUnlocked) return <Navigate to="/" />;

  const services: IClinicService[] = tenant?.settings?.services || [];

  const handleOpenModal = (service?: IClinicService) => {
    if (service) {
      setEditingService(service);
    } else {
      setEditingService({
        id: "s" + Date.now(),
        name: "",
        durationMin: 30,
        price: 0,
        description: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveService = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingService) return;

    const formData = new FormData(e.currentTarget);
    const updatedService: IClinicService = {
      ...editingService,
      name: formData.get("name") as string,
      durationMin: Number(formData.get("durationMin")),
      price: Number(formData.get("price")),
      description: formData.get("description") as string,
    };

    let newServices = [...services];
    const index = newServices.findIndex(s => s.id === updatedService.id);
    if (index >= 0) {
      newServices[index] = updatedService;
    } else {
      newServices.push(updatedService);
    }

    updateSettingsMutation.mutate(newServices);
  };

  const handleDeleteService = (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce soin du catalogue ?")) {
      const newServices = services.filter(s => s.id !== id);
      updateSettingsMutation.mutate(newServices);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Catalogue des Soins" />
        <Button onClick={() => handleOpenModal()} className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md hover:shadow-lg">
          <Plus className="size-4" /> Ajouter un soin
        </Button>
      </div>

      <SectionCard 
        title="Soins & Consultations" 
        description="Ces soins seront proposés par l'Assistant IA lors des prises de rendez-vous."
      >
        {services.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title="Aucun soin défini"
            description="Ajoutez des soins pour que l'IA puisse proposer des créneaux de durée appropriée."
          />
        ) : (
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 p-4 border-b border-border bg-muted/30 font-semibold text-sm text-muted-foreground">
              <div>Soin</div>
              <div>Durée</div>
              <div>Prix Indicatif</div>
              <div className="w-20 text-right">Actions</div>
            </div>
            <div className="divide-y divide-border">
              {services.map((s) => (
                <div key={s.id} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 p-4 items-center hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{s.name}</p>
                    {s.description && <p className="text-xs text-muted-foreground truncate">{s.description}</p>}
                  </div>
                  <div className="text-sm font-medium">{s.durationMin} min</div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {s.price ? `${s.price} TND` : "Sur devis"}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" className="size-8 p-0 text-muted-foreground hover:text-foreground" onClick={() => handleOpenModal(s)}>
                      <Edit2 className="size-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="size-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => handleDeleteService(s.id!)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingService?.name ? "Modifier le soin" : "Nouveau soin"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveService} className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Nom du soin *</label>
              <Input name="name" defaultValue={editingService?.name} required placeholder="Ex: Consultation Dentaire" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Durée (minutes) *</label>
                <Input name="durationMin" type="number" min="5" step="5" defaultValue={editingService?.durationMin} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Prix (TND)</label>
                <Input name="price" type="number" min="0" step="10" defaultValue={editingService?.price} placeholder="0 pour 'Sur devis'" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Description / Consignes IA</label>
              <Textarea 
                name="description" 
                defaultValue={editingService?.description} 
                placeholder="Ex: Soin de routine, vérifier antécédents..." 
                className="h-20 resize-none text-sm"
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={updateSettingsMutation.isPending} className="bg-primary text-primary-foreground">
                {updateSettingsMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
