import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Stethoscope,
  MapPin,
  Phone,
  Mail,
  Clock,
  Save,
  Loader2,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  CalendarCheck,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAppState } from "@/hooks/use-app-state";

const defaultBusinessHours: Record<string, Array<{start: string, end: string}>> = {
  monday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  tuesday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  wednesday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  thursday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  friday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  saturday: [{ start: "09:00", end: "13:00" }],
  sunday: [],
};

const daysOfWeek = [
  { key: "monday", label: "Lundi" },
  { key: "tuesday", label: "Mardi" },
  { key: "wednesday", label: "Mercredi" },
  { key: "thursday", label: "Jeudi" },
  { key: "friday", label: "Vendredi" },
  { key: "saturday", label: "Samedi" },
  { key: "sunday", label: "Dimanche" },
];

export const Route = createFileRoute("/settings/clinic")({
  head: () => ({
    meta: [
      { title: "Paramètres du Cabinet — Medical AI" },
      { name: "description", content: "Gestion des coordonnées, spécialité et informations du cabinet médical." },
    ],
  }),
  component: ClinicSettingsPage,
});

function ClinicSettingsPage() {
  const queryClient = useQueryClient();
  const { t, isRTL } = useAppState();

  // Form State
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [businessHours, setBusinessHours] = useState<Record<string, Array<{start: string, end: string}>>>(defaultBusinessHours);
  const [noShowPolicyEnabled, setNoShowPolicyEnabled] = useState(false);
  const [noShowMaxAllowed, setNoShowMaxAllowed] = useState(2);
  const [noShowRejectionMessage, setNoShowRejectionMessage] = useState("Suite à plusieurs rendez-vous non honorés, la prise de rendez-vous automatique est suspendue. Merci d'appeler le secrétariat.");

  // Fetch Current Tenant
  const { data: tenant, isLoading, isError } = useQuery<any>({
    queryKey: ["currentTenant"],
    queryFn: () => api.get("/tenants/current"),
  });

  // Populate state when data loads
  useEffect(() => {
    if (tenant) {
      setName(tenant.name || "");
      setSpecialty(tenant.specialty || "");
      setPhone(tenant.phone || "");
      setEmail(tenant.email || "");
      setAddress(tenant.address || "");
      if (tenant.settings?.businessHours && typeof tenant.settings.businessHours === "object") {
        setBusinessHours(tenant.settings.businessHours);
      } else {
        setBusinessHours(defaultBusinessHours);
      }
      if (tenant.settings?.noShowPolicy) {
        setNoShowPolicyEnabled(tenant.settings.noShowPolicy.enabled ?? false);
        setNoShowMaxAllowed(tenant.settings.noShowPolicy.maxAllowed ?? 2);
        setNoShowRejectionMessage(tenant.settings.noShowPolicy.rejectionMessage || "Suite à plusieurs rendez-vous non honorés, la prise de rendez-vous automatique est suspendue. Merci d'appeler le secrétariat.");
      }
    }
  }, [tenant]);

  // Mutation to Save
  const saveMutation = useMutation({
    mutationFn: (payload: any) => api.put("/tenants/current", payload),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["currentTenant"] });
      toast.success(t.clinicSettings.savedSuccess);
    },
    onError: (err: any) => {
      toast.error(err?.message || t.clinicSettings.saveError);
    },
  });

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveMutation.mutate({
      name,
      specialty,
      phone,
      email,
      address,
      settings: {
        ...tenant?.settings, // Preserve other settings like aiConfig
        businessHours,
        noShowPolicy: {
          enabled: noShowPolicyEnabled,
          maxAllowed: noShowMaxAllowed,
          rejectionMessage: noShowRejectionMessage,
        }
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium">{t.common.loading}</p>
      </div>
    );
  }

  if (isError || !tenant) {
    return (
      <div className="mx-auto max-w-lg p-12 text-center text-destructive">
        <p className="font-semibold">{t.clinicSettings.saveError}</p>
        <Button variant="outline" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ["currentTenant"] })}>
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title={t.clinicSettings.title}
        subtitle={t.clinicSettings.subtitle}
        actions={
          <Button
            onClick={() => handleSave()}
            disabled={saveMutation.isPending}
            className="gap-2 shadow-sm font-medium"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t.clinicSettings.saving}
              </>
            ) : (
              <>
                <Save className="size-4" />
                {t.clinicSettings.save}
              </>
            )}
          </Button>
        }
      />

      {/* Verified Status Banner */}
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-background to-accent/5 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">{name || tenant.name}</h3>
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                  <CheckCircle2 className="mr-1 size-3" />
                  {t.clinicSettings.activeBadge}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {specialty || tenant.specialty || "Cabinet Médical"} • {t.clinicSettings.verifiedClinic}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-4 text-accent" />
            <span>{t.clinicSettings.plan}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Information Card */}
        <SectionCard
          title={t.clinicSettings.generalInfo}
          description={t.clinicSettings.generalInfoDesc}
        >
          <div className="grid gap-5">
            {/* Nom & Spécialité */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="clinic-name" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-muted-foreground" />
                  {t.clinicSettings.clinicName}
                </Label>
                <Input
                  id="clinic-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.clinicSettings.clinicNamePlaceholder}
                  className="h-10 bg-surface text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clinic-specialty" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Stethoscope className="size-3.5 text-muted-foreground" />
                  {t.clinicSettings.specialty}
                </Label>
                <Input
                  id="clinic-specialty"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder={t.clinicSettings.specialtyPlaceholder}
                  className="h-10 bg-surface text-sm"
                />
              </div>
            </div>

            {/* Téléphone & Email */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="clinic-phone" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Phone className="size-3.5 text-muted-foreground" />
                  {t.clinicSettings.phone}
                </Label>
                <Input
                  id="clinic-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t.clinicSettings.phonePlaceholder}
                  className="h-10 bg-surface text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clinic-email" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Mail className="size-3.5 text-muted-foreground" />
                  {t.clinicSettings.email}
                </Label>
                <Input
                  id="clinic-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.clinicSettings.emailPlaceholder}
                  className="h-10 bg-surface text-sm"
                />
              </div>
            </div>

            {/* Adresse complète */}
            <div className="space-y-1.5">
              <Label htmlFor="clinic-address" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <MapPin className="size-3.5 text-muted-foreground" />
                {t.clinicSettings.address}
              </Label>
              <Textarea
                id="clinic-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t.clinicSettings.addressPlaceholder}
                rows={2}
                className="bg-surface text-sm resize-none"
              />
            </div>
          </div>
        </SectionCard>

        {/* Business Hours Card */}
        <SectionCard
          title={t.clinicSettings.businessHours}
          description={t.clinicSettings.businessHoursDesc}
        >
          <div className="space-y-6">
            <p className="text-xs text-muted-foreground">
              💡 Configurez ici les plages d'ouverture du cabinet. L'IA s'appuie sur ces horaires pour proposer des créneaux aux patients.
            </p>

            <div className="space-y-4">
              {daysOfWeek.map(({ key, label }) => {
                const daySlots = businessHours[key] || [];
                const isActive = daySlots.length > 0;

                return (
                  <div key={key} className="flex items-start gap-4 p-3 rounded-lg border border-border/50 bg-background/50">
                    <div className="flex items-center gap-3 w-32 shrink-0 pt-1">
                      <Switch
                        checked={isActive}
                        onCheckedChange={(checked) => {
                          setBusinessHours(prev => ({
                            ...prev,
                            [key]: checked ? [{ start: "08:30", end: "12:30" }] : []
                          }));
                        }}
                      />
                      <span className="text-sm font-medium">{label}</span>
                    </div>

                    <div className="flex-1 space-y-2">
                      {!isActive ? (
                        <div className="text-sm text-muted-foreground py-1">Fermé</div>
                      ) : (
                        <div className="space-y-2">
                          {daySlots.map((slot, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={slot.start}
                                onChange={(e) => {
                                  const newSlots = [...daySlots];
                                  newSlots[idx].start = e.target.value;
                                  setBusinessHours(prev => ({ ...prev, [key]: newSlots }));
                                }}
                                className="w-28 h-8 text-xs"
                              />
                              <span className="text-muted-foreground text-xs">à</span>
                              <Input
                                type="time"
                                value={slot.end}
                                onChange={(e) => {
                                  const newSlots = [...daySlots];
                                  newSlots[idx].end = e.target.value;
                                  setBusinessHours(prev => ({ ...prev, [key]: newSlots }));
                                }}
                                className="w-28 h-8 text-xs"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  const newSlots = daySlots.filter((_, i) => i !== idx);
                                  setBusinessHours(prev => ({ ...prev, [key]: newSlots }));
                                }}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-dashed gap-1"
                            onClick={() => {
                              setBusinessHours(prev => ({
                                ...prev,
                                [key]: [...daySlots, { start: "14:00", end: "18:00" }]
                              }));
                            }}
                          >
                            <Plus className="size-3" /> Ajouter une plage
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>

        {/* No-Show Policy Card */}
        <SectionCard
          title="Politique d'Annulation & No-Shows"
          description="Gérez les patients qui ne se présentent pas à leurs rendez-vous."
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">Bloquer les récidivistes</Label>
                <p className="text-xs text-muted-foreground mt-1">L'IA refusera de donner un rendez-vous aux patients ayant dépassé la limite autorisée.</p>
              </div>
              <Switch checked={noShowPolicyEnabled} onCheckedChange={setNoShowPolicyEnabled} />
            </div>

            {noShowPolicyEnabled && (
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="space-y-1.5">
                  <Label htmlFor="max-allowed" className="text-xs font-semibold">Tolérance maximale (Nombre de lapins)</Label>
                  <Input 
                    id="max-allowed" 
                    type="number" 
                    min={1} 
                    max={10} 
                    value={noShowMaxAllowed} 
                    onChange={(e) => setNoShowMaxAllowed(parseInt(e.target.value) || 2)} 
                    className="h-10 bg-surface w-32" 
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Au-delà de ce nombre, l'IA bloquera le patient.</p>
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="rejection-msg" className="text-xs font-semibold">Message de refus par l'IA</Label>
                  <Textarea 
                    id="rejection-msg" 
                    value={noShowRejectionMessage} 
                    onChange={(e) => setNoShowRejectionMessage(e.target.value)} 
                    className="bg-surface text-sm resize-none h-20" 
                    placeholder="Ex: Suite à plusieurs rendez-vous non honorés..."
                  />
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            className="gap-2 font-medium px-6"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t.clinicSettings.saving}
              </>
            ) : (
              <>
                <Save className="size-4" />
                {t.clinicSettings.save}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
