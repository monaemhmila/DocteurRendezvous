import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useAdmin } from "@/contexts/admin-context";
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
import { useAppState } from "@/hooks/use-app-state";

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
      { title: "Patients — Sanovia AI" },
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
  const { t } = useAppState();
  const { isAdminUnlocked } = useAdmin();

  const { data: patients = [], isLoading, isError } = useQuery<BackendPatient[]>({
    queryKey: ["patients"],
    queryFn: async () => {
      const res = await api.get("/patients?limit=1000");
      return Array.isArray(res) ? res : (res.data || []);
    },
  });

  const createPatient = useMutation({
    mutationFn: (data: any) => api.post("/patients", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success(t.patientsPage.successAdd);
      setIsDialogOpen(false);
    },
    onError: () => toast.error(t.patientsPage.errorAdd),
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
    let list = patients;
    // Hide the dummy Indisponible (Bloqué) patient unless unlocked
    if (!isAdminUnlocked) {
      list = list.filter(p => p.phone !== "00000000");
    }
    
    const q = query.trim().toLowerCase();
    if (!q) return list;
    
    return list.filter(
      (p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        (p.phone && p.phone.replace(/\s/g, "").includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q)),
    );
  }, [query, patients, isAdminUnlocked]);

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
        title={t.patientsPage.title}
        subtitle={isLoading ? t.common.loading : t.patientsPage.subtitle.replace("{count}", patients.length.toString())}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                {t.patientsPage.newPatient}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{t.patientsPage.newPatient}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t.patientsPage.firstName}</label>
                      <Input name="firstName" required placeholder={t.patientsPage.firstNameEx} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t.patientsPage.lastName}</label>
                      <Input name="lastName" required placeholder={t.patientsPage.lastNameEx} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t.patientsPage.phone}</label>
                    <Input name="phone" required placeholder="+216 ..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t.patientsPage.email}</label>
                    <Input name="email" type="email" placeholder={t.patientsPage.emailOptional} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {t.common.cancel}
                  </Button>
                  <Button type="submit" disabled={createPatient.isPending}>
                    {createPatient.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {t.patientsPage.createPatient}
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
              placeholder={t.patientsPage.searchPlaceholder}
              className="pl-9"
            />
          </div>
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground mx-2">
                {t.patientsPage.selected.replace("{count}", selected.size.toString())}
              </span>
              <Button variant="outline" size="sm">
                <MessageSquare className="mx-2 size-3.5" />
                {t.patientsPage.message}
              </Button>
              <Button variant="outline" size="sm">
                <Mail className="mx-2 size-3.5" />
                {t.patientsPage.campaign}
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mx-2 size-3.5" />
                {t.patientsPage.export}
              </Button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">{t.patientsPage.loadingPatients}</div>
          ) : isError ? (
            <div className="p-8 text-center text-destructive">{t.patientsPage.errorLoading}</div>
          ) : (
            <table className="w-full text-start text-sm whitespace-nowrap">
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
                  <th className="px-5 py-3 font-medium text-muted-foreground">{t.patientsPage.patient}</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">{t.patientsPage.contact}</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">{t.patientsPage.lastVisit}</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">{t.patientsPage.status}</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">{t.patientsPage.visits}</th>
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
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{pName}</p>
                              {(p.metrics?.noShowCount ?? 0) > 0 && (
                                <span className="inline-flex items-center rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive ring-1 ring-inset ring-destructive/20" title={`${p.metrics!.noShowCount} No-Show(s)`}>
                                  🐇 {p.metrics!.noShowCount}
                                </span>
                              )}
                            </div>
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
                      {query ? t.patientsPage.noPatientSearch.replace("{query}", query) : t.patientsPage.noPatient}
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
