import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Mail, MessageSquare, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  PageHeader,
  PatientAvatar,
  PatientStatusBadge,
  SectionCard,
} from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { relativeDay } from "@/lib/format";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

/**
 * Backend patient response shape from GET /patients.
 * Derived from patient.controller.ts getPatients formatted output.
 */
interface BackendPatient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  language?: string;
  status: "active" | "inactive" | "lead" | "at_risk";
  tags: string[];
  dateOfBirth?: string;
  gender?: string;
  notes?: string;
  nextAppointmentAt?: string;
  metrics: {
    totalVisits: number;
    noShowCount: number;
    lastVisit?: string;
    revenue: number;
  };
}

export const Route = createFileRoute("/patients/")({
  head: () => ({
    meta: [
      { title: "Patients — Dental AI" },
      {
        name: "description",
        content: "Annuaire des patients du cabinet.",
      },
    ],
  }),
  component: PatientsPage,
});

function PatientsPage() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: patients = [], isLoading, isError } = useQuery<BackendPatient[]>({
    queryKey: ["patients"],
    queryFn: () => api.get("/patients"),
  });

  const createPatient = useMutation({
    mutationFn: (data: any) => api.post("/patients", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient ajouté avec succès.");
      setIsDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de la création du patient."),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      phone: formData.get("phone"),
      email: formData.get("email"),
    };
    createPatient.mutate(data);
  };

  const filteredPatients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        (p.phone && p.phone.replace(/\s/g, "").includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q)),
    );
  }, [query, patients]);

  const toggleAll = () => {
    if (selected.size === filteredPatients.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredPatients.map((p) => p.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-20">
      <PageHeader
        title="Patients"
        subtitle={isLoading ? "Chargement..." : `${patients.length} patients au total`}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                Nouveau patient
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Nouveau patient</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Prénom</label>
                      <Input name="firstName" required placeholder="Ex: Jean" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nom</label>
                      <Input name="lastName" required placeholder="Ex: Dupont" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Téléphone</label>
                    <Input name="phone" required placeholder="+216 ..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input name="email" type="email" placeholder="Optionnel" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={createPatient.isPending}>
                    {createPatient.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Créer le patient
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <SectionCard bodyClassName="p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-4">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par nom, téléphone..."
              className="pl-9"
            />
          </div>
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground mr-2">
                {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
              </span>
              <Button variant="outline" size="sm">
                <MessageSquare className="mr-2 size-3.5" />
                Message
              </Button>
              <Button variant="outline" size="sm">
                <Mail className="mr-2 size-3.5" />
                Campagne
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 size-3.5" />
                Exporter
              </Button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Chargement des patients...</div>
          ) : isError ? (
            <div className="p-8 text-center text-destructive">Impossible de charger la liste des patients.</div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3 w-10">
                    <Checkbox
                      checked={
                        filteredPatients.length > 0 &&
                        selected.size === filteredPatients.length
                      }
                      onCheckedChange={toggleAll}
                    />
                  </th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Patient</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Contact</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Dernière visite</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Statut</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Visites</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPatients.map((p) => {
                  const pInitials = `${p.firstName[0] || ""}${p.lastName[0] || ""}`.toUpperCase();
                  const pName = `${p.firstName} ${p.lastName}`;
                  return (
                    <tr
                      key={p.id}
                      className="transition-colors hover:bg-muted/30"
                      onClick={() => navigate({ to: "/patients/$id", params: { id: p.id } })}
                      style={{ cursor: "pointer" }}
                    >
                      <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(p.id)}
                          onCheckedChange={() => toggleOne(p.id)}
                        />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <PatientAvatar initials={pInitials} id={p.id} size="sm" />
                          <div>
                            <p className="font-medium">{pName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p>{p.phone}</p>
                        <p className="text-xs text-muted-foreground">{p.email || "—"}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p>{p.metrics?.lastVisit ? relativeDay(p.metrics.lastVisit as string) : "—"}</p>
                      </td>
                      <td className="px-5 py-3">
                        <PatientStatusBadge status={p.status as any} />
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-medium">{p.metrics?.totalVisits ?? 0}</span>
                      </td>
                    </tr>
                  );
                })}
                {filteredPatients.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                      {query ? `Aucun patient trouvé pour "${query}".` : "Aucun patient."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
