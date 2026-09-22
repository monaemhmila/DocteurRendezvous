import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Sparkles,
  Languages,
  MessageCircle,
  AlertTriangle,
  Check,
  Volume2,
  QrCode,
  Sliders,
  Copy,
  ExternalLink,
  Loader2,
  Save,
  Phone,
  Bot,
  Zap,
  ShieldCheck,
  Share2,
  HelpCircle,
  FileText,
  CalendarCheck,
  Plus,
  Trash2,
  Clock,
  Stethoscope,
  Tag,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader, SectionCard, AIStatusBadge } from "@/components/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

export interface IClinicServiceItem {
  id: string;
  name: string;
  durationMin: number;
  price?: number;
  description?: string;
}

const DEFAULT_SERVICES: IClinicServiceItem[] = [
  { id: "1", name: "Consultation & Examen initial", durationMin: 20, price: 50, description: "Bilan complet, examen clinique" },
  { id: "2", name: "Détartrage & Polissage", durationMin: 30, price: 80, description: "Nettoyage complet ultrasonique" },
  { id: "3", name: "Soin de Carie / Obturation", durationMin: 45, price: 90, description: "Composite esthétique" },
  { id: "4", name: "Extraction dentaire simple", durationMin: 45, price: 120, description: "Extraction avec anesthésie" },
  { id: "5", name: "Chirurgie / Pose d'Implant", durationMin: 60, price: 900, description: "Acte chirurgical sous bloc" },
  { id: "6", name: "Contrôle post-opératoire", durationMin: 15, price: 30, description: "Vérification de cicatrisation" },
];

const PRESETS = {
  dental: {
    name: "Pack Dentaire Standard",
    icon: "🦷",
    services: [
      { id: "d1", name: "Consultation & Bilan dentaire", durationMin: 20, price: 50, description: "Examen bucco-dentaire initial" },
      { id: "d2", name: "Détartrage & Polissage complet", durationMin: 30, price: 80, description: "Nettoyage et élimination du tartre" },
      { id: "d3", name: "Traitement de Carie / Composite", durationMin: 45, price: 90, description: "Soin conservateur esthétique" },
      { id: "d4", name: "Extraction dentaire", durationMin: 45, price: 120, description: "Extraction sous anesthésie locale" },
      { id: "d5", name: "Pose d'Implant / Chirurgie", durationMin: 60, price: 900, description: "Acte chirurgical implantaire" },
      { id: "d6", name: "Contrôle & Urgence rapide", durationMin: 15, price: 35, description: "Vérification ou pansement" },
    ],
  },
  general: {
    name: "Pack Médecine Générale",
    icon: "🩺",
    services: [
      { id: "g1", name: "Consultation de Médecine Générale", durationMin: 20, price: 40, description: "Diagnostic, examen, ordonnance" },
      { id: "g2", name: "Bilan de santé approfondi", durationMin: 40, price: 70, description: "Check-up complet et examens" },
      { id: "g3", name: "Certificat médical / Aptitude", durationMin: 15, price: 35, description: "Sport, permis ou embauche" },
      { id: "g4", name: "Visite de suivi / Renouvellement", durationMin: 15, price: 35, description: "Suivi traitement chronique" },
    ],
  },
  ophthalmo: {
    name: "Pack Ophtalmologie",
    icon: "👁️",
    services: [
      { id: "o1", name: "Bilan visuel & Prescription lunettes", durationMin: 20, price: 60, description: "Réfraction, acuité visuelle" },
      { id: "o2", name: "Fond d'œil & Tension oculaire", durationMin: 30, price: 80, description: "Examen rétine et dépistage glaucome" },
      { id: "o3", name: "Champ visuel / Examens spécialisés", durationMin: 45, price: 100, description: "Exploration fonctionnelle oculaire" },
      { id: "o4", name: "Contrôle lunettes / Adaptation lentilles", durationMin: 15, price: 40, description: "Vérification et conseils" },
    ],
  },
  dermato: {
    name: "Pack Dermatologie",
    icon: "🧴",
    services: [
      { id: "m1", name: "Consultation Dermatologique", durationMin: 20, price: 60, description: "Examen clinique de la peau" },
      { id: "m2", name: "Dépistage grains de beauté (Dermoscopie)", durationMin: 25, price: 75, description: "Surveillance mélanome et lésions" },
      { id: "m3", name: "Séance Laser dermatologique", durationMin: 45, price: 180, description: "Traitement laser médical/esthétique" },
      { id: "m4", name: "Soin Acné / Nettoyage cutané", durationMin: 30, price: 90, description: "Traitement dermatologique local" },
    ],
  },
};

export const Route = createFileRoute("/ai-assistant")({
  head: () => ({
    meta: [
      { title: "Assistant IA & Paramètres WhatsApp — Dental AI" },
      { name: "description", content: "Consignes personnalisées de l'IA, QR Code WhatsApp et règles de réservation du cabinet." },
    ],
  }),
  component: AIAssistantPage,
});

function AIAssistantPage() {
  const queryClient = useQueryClient();

  // State
  const [mode, setMode] = useState<"auto" | "approval">("auto");
  const [tone, setTone] = useState("friendly");
  const [customInstructions, setCustomInstructions] = useState(
    "Vous êtes l'assistant médical. Soyez toujours chaleureux, clair sur les tarifs et les durées de consultation."
  );

  // Services State (Dynamic Durations)
  const [services, setServices] = useState<IClinicServiceItem[]>(DEFAULT_SERVICES);

  // WhatsApp Config
  const [waPhoneNumber, setWaPhoneNumber] = useState("+216 92 751 296");
  const [prefilledMessage, setPrefilledMessage] = useState("Bonjour, je souhaite prendre un rendez-vous");

  // Capabilities
  const [capabilities, setCapabilities] = useState({
    autoBooking: true,
    urgencyHandling: true,
    pricingQuotes: true,
    reminders: true,
    doctorEscalation: true,
    multiLanguage: true,
  });

  const [escalationRules, setEscalationRules] = useState({
    medicalQuestion: true,
    frustratedPatient: true,
    complexQuote: true,
    lowConfidence: true,
  });

  // Fetch Current Tenant
  const { data: tenant, isLoading } = useQuery({
    queryKey: ["currentTenant"],
    queryFn: () => api.get("/tenants/current"),
  });

  // Populate state on load
  useEffect(() => {
    if (tenant?.settings) {
      const s = tenant.settings;
      if (s.services && Array.isArray(s.services) && s.services.length > 0) {
        setServices(s.services);
      } else if (s.aiConfig?.services && Array.isArray(s.aiConfig.services) && s.aiConfig.services.length > 0) {
        setServices(s.aiConfig.services);
      }

      if (s.aiConfig) {
        if (s.aiConfig.mode) setMode(s.aiConfig.mode);
        if (s.aiConfig.tone) setTone(s.aiConfig.tone);
        if (s.aiConfig.customInstructions) setCustomInstructions(s.aiConfig.customInstructions);
        if (s.aiConfig.capabilities) setCapabilities(s.aiConfig.capabilities);
        if (s.aiConfig.escalationRules) setEscalationRules(s.aiConfig.escalationRules);
      }
      if (s.whatsappConfig) {
        if (s.whatsappConfig.phoneNumber) setWaPhoneNumber(s.whatsappConfig.phoneNumber);
      }
    }
  }, [tenant]);

  // Save Settings Mutation
  const saveMutation = useMutation({
    mutationFn: (settingsPayload: any) => api.put("/tenants/settings", { settings: settingsPayload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentTenant"] });
      toast.success("Consignes, catalogue de soins et paramètres enregistrés avec succès !");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de l'enregistrement des paramètres.");
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      services,
      aiConfig: {
        mode,
        tone,
        customInstructions,
        capabilities,
        escalationRules,
        services,
      },
      whatsappConfig: {
        phoneNumber: waPhoneNumber,
      },
    });
  };

  const handleAddService = () => {
    const newService: IClinicServiceItem = {
      id: Date.now().toString(),
      name: "Nouvelle Consultation / Soin",
      durationMin: 30,
      price: 50,
      description: "Description de la prestation",
    };
    setServices((prev) => [...prev, newService]);
    toast.info("Nouveau soin ajouté. N'oubliez pas d'enregistrer.");
  };

  const handleUpdateService = (id: string, field: keyof IClinicServiceItem, value: any) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleDeleteService = (id: string) => {
    if (services.length <= 1) {
      toast.error("Vous devez conserver au moins un type de soin dans le catalogue.");
      return;
    }
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const handleApplyPreset = (presetKey: keyof typeof PRESETS) => {
    setServices(PRESETS[presetKey].services);
    toast.success(`${PRESETS[presetKey].name} appliqué ! Cliquez sur 'Enregistrer' pour valider.`);
  };

  // Build wa.me direct link
  const cleanPhone = waPhoneNumber.replace(/[^0-9]/g, "");
  const whatsappDirectLink = `https://wa.me/${cleanPhone || "21671962480"}?text=${encodeURIComponent(
    prefilledMessage
  )}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    whatsappDirectLink
  )}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié dans le presse-papier !`);
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Assistant IA & WhatsApp"
        subtitle="Personnalisez les directives de votre IA, vos règles de prise de RDV et le QR Code WhatsApp du cabinet."
        actions={
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/conversations">
                <Bot className="size-4 text-emerald-600" />
                Ouvrir le Simulateur
              </Link>
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Enregistrer les modifications
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <Tabs defaultValue="prompt" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl mb-4 bg-muted/60 p-1">
          <TabsTrigger value="prompt" className="gap-1.5 text-xs md:text-sm">
            <FileText className="size-3.5 md:size-4" />
            Consignes
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-1.5 text-xs md:text-sm font-medium">
            <Clock className="size-3.5 md:size-4 text-emerald-600" />
            Soins & Durées
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5 text-xs md:text-sm">
            <Sliders className="size-3.5 md:size-4" />
            Règles Métier
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-1.5 text-xs md:text-sm">
            <QrCode className="size-3.5 md:size-4" />
            QR WhatsApp
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: Soins & Durées Dynamiques (Catalogue & Allocation d'Agenda)
           ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="services" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              {/* Presets Header */}
              <SectionCard
                title="Catalogue des Prestations & Durées de Consultation"
                description="Configurez les types de soins dispensés au cabinet. L'IA alloue automatiquement des blocs de temps continus correspondant à la durée exacte de chaque soin."
              >
                <div className="space-y-4">
                  {/* Preset Buttons */}
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5">
                        <Sparkles className="size-4 text-emerald-600" />
                        Pré-remplir rapidement selon votre spécialité :
                      </p>
                      <span className="text-[11px] text-muted-foreground">1 clic pour charger</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleApplyPreset(key)}
                          className="flex flex-col items-center justify-center p-2.5 rounded-lg border bg-white hover:border-emerald-500 hover:bg-emerald-50/80 transition-all text-center shadow-xs group"
                        >
                          <span className="text-lg mb-1">{PRESETS[key].icon}</span>
                          <span className="text-xs font-medium text-foreground group-hover:text-emerald-700 leading-tight">
                            {PRESETS[key].name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Services Table / Cards */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">
                        Prestations actives ({services.length})
                      </Label>
                      <Button
                        type="button"
                        onClick={handleAddService}
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs h-8 border-emerald-300 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/50"
                      >
                        <Plus className="size-3.5" />
                        Ajouter un soin
                      </Button>
                    </div>

                    <div className="space-y-2.5">
                      {services.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-xl border border-border/80 bg-card hover:shadow-xs transition-all space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex-1 w-full space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-muted-foreground w-5">#{idx + 1}</span>
                                <Input
                                  value={item.name}
                                  onChange={(e) => handleUpdateService(item.id, "name", e.target.value)}
                                  placeholder="Intitulé du soin (ex: Détartrage)"
                                  className="h-8 text-sm font-semibold"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                              {/* Duration selector */}
                              <div className="flex items-center gap-1.5 bg-muted/40 px-2 py-1 rounded-md border text-xs">
                                <Clock className="size-3.5 text-emerald-600" />
                                <select
                                  value={item.durationMin}
                                  onChange={(e) => handleUpdateService(item.id, "durationMin", Number(e.target.value))}
                                  className="bg-transparent font-medium focus:outline-none cursor-pointer"
                                >
                                  <option value={15}>15 min</option>
                                  <option value={20}>20 min</option>
                                  <option value={30}>30 min</option>
                                  <option value={45}>45 min</option>
                                  <option value={60}>1h00 (60m)</option>
                                  <option value={90}>1h30 (90m)</option>
                                  <option value={120}>2h00 (120m)</option>
                                </select>
                              </div>

                              {/* Price input */}
                              <div className="flex items-center gap-1 bg-muted/40 px-2 py-1 rounded-md border text-xs w-24">
                                <Input
                                  type="number"
                                  value={item.price ?? ""}
                                  onChange={(e) => handleUpdateService(item.id, "price", e.target.value ? Number(e.target.value) : undefined)}
                                  placeholder="0"
                                  className="h-6 w-12 p-0 border-0 text-right bg-transparent text-xs font-semibold focus-visible:ring-0"
                                />
                                <span className="text-muted-foreground font-medium">DT</span>
                              </div>

                              {/* Delete button */}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteService(item.id)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>

                          <Input
                            value={item.description || ""}
                            onChange={(e) => handleUpdateService(item.id, "description", e.target.value)}
                            placeholder="Description ou consigne indicative (ex: 'Bilan complet, détartrage ultrasonique')..."
                            className="h-7 text-xs text-muted-foreground bg-muted/20 border-border/50"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Sidebar Guide */}
            <div className="space-y-6">
              <SectionCard title="Règle d'Agenda IA" className="bg-emerald-50/30 border-emerald-200/50">
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    Allocation continue de créneaux
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Si un patient demande un soin de <strong>60 minutes</strong> (ex: Pose d'implant ou chirurgie), le bot vérifie dans votre agenda qu'un bloc de <strong>1 heure entière continue</strong> est libre sans chevauchement.
                  </p>
                  <Separator className="my-2" />
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    Transparence tarifaire indicative
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    L'assistant communique uniquement les prix que vous avez saisis ici. Aucun prix inventé n'est partagé aux patients.
                  </p>
                </div>
              </SectionCard>

              <SectionCard title="Garde-fous Médicaux">
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>• Le bot ne pose jamais de diagnostic médical.</p>
                  <p>• Les devis complexes ou personnalisés sont toujours renvoyés vers une consultation clinique.</p>
                </div>
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: Consignes Personnalisées (System Prompt)
           ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="prompt" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <SectionCard
                title="Consignes Personnalisées (System Prompt)"
                description="Indiquez les particularités de votre cabinet dentaire que l'IA doit toujours respecter dans chaque échange."
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="promptInput" className="text-sm font-semibold flex items-center justify-between">
                      <span>Directives et informations spécifiques du praticien</span>
                      <span className="text-xs text-muted-foreground">Injecté automatiquement dans l'IA</span>
                    </Label>
                    <Textarea
                      id="promptInput"
                      rows={6}
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder="Ex: Préciser que le cabinet est situé au Lac 2 avec parking gratuit. Pour tout blanchiment, indiquer qu'un examen préalable est indispensable..."
                      className="text-sm leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-lg border bg-muted/30">
                      <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                        <Check className="size-3.5 text-emerald-600" />
                        Exemples de consignes efficaces :
                      </p>
                      <ul className="text-xs text-muted-foreground mt-1.5 space-y-1 list-disc list-inside">
                        <li>Indiquer l'accès (ascenseur, étage, parking)</li>
                        <li>Tarifs indicatifs usuels du cabinet</li>
                        <li>Durée moyenne par type de consultation</li>
                      </ul>
                    </div>

                    <div className="p-3 rounded-lg border bg-muted/30">
                      <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                        <ShieldCheck className="size-3.5 text-blue-600" />
                        Garde-fous médicaux automatiques :
                      </p>
                      <ul className="text-xs text-muted-foreground mt-1.5 space-y-1 list-disc list-inside">
                        <li>L'IA ne pose jamais de diagnostic médical</li>
                        <li>Elle ne prescrit aucun médicament</li>
                        <li>Elle transmet immédiatement au médecin</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Ton & Personnalité */}
              <SectionCard
                title="Personnalité & Style de Réponse"
                description="Définissez comment l'assistant s'exprime auprès de vos patients."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Ton de la communication</Label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="friendly">Amical et professionnel (Recommandé)</option>
                      <option value="professional">Strictement formel & médical</option>
                      <option value="empathic">Chaleureux, empathique et rassurant</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Langues gérées automatiquement</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {["Français", "Arabe Tunisien", "Arabizi", "Anglais"].map((l) => (
                        <Badge key={l} variant="secondary" className="text-xs">
                          {l}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Sidebar info */}
            <div className="space-y-6">
              <SectionCard title="État du Moteur IA" className="bg-emerald-50/30 border-emerald-200/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold">Statut</span>
                  <AIStatusBadge active={true} />
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span>Moteur IA</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">Actif (.env / OpenAI)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span>Mode Réponse</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {mode === "auto" ? "100% Automatique" : "Copilote"}
                    </Badge>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Disponibilité</span>
                    <span className="text-emerald-600 font-semibold">24h/24 - 7j/7</span>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Mode de Prise de RDV">
                <div className="space-y-3">
                  <label
                    onClick={() => setMode("auto")}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                      mode === "auto" ? "border-emerald-600 bg-emerald-50/40" : "border-border hover:bg-muted/50"
                    )}
                  >
                    <input
                      type="radio"
                      name="bookingMode"
                      checked={mode === "auto"}
                      onChange={() => setMode("auto")}
                      className="mt-1 text-emerald-600"
                    />
                    <div>
                      <p className="font-medium text-sm">100% Automatique</p>
                      <p className="text-xs text-muted-foreground">
                        L'IA confirme et réserve directement les créneaux dans l'agenda sans action humaine.
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setMode("approval")}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                      mode === "approval" ? "border-emerald-600 bg-emerald-50/40" : "border-border hover:bg-muted/50"
                    )}
                  >
                    <input
                      type="radio"
                      name="bookingMode"
                      checked={mode === "approval"}
                      onChange={() => setMode("approval")}
                      className="mt-1 text-emerald-600"
                    />
                    <div>
                      <p className="font-medium text-sm">Copilote (Validation requise)</p>
                      <p className="text-xs text-muted-foreground">
                        L'IA prépare la réponse et propose le créneau, vous validez avant l'envoi au patient.
                      </p>
                    </div>
                  </label>
                </div>
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: WhatsApp & QR Code Cabinet
           ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="whatsapp" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              {/* WhatsApp Business Number */}
              <SectionCard
                title="Coordonnées WhatsApp du Cabinet"
                description="Le numéro et le message d'accueil pré-rempli pour vos patients."
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 pb-2">
                    <span className="text-xs text-muted-foreground font-medium">Pré-remplir avec :</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 gap-1.5 border-emerald-300 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/50"
                      onClick={() => setWaPhoneNumber("+216 92 751 296")}
                    >
                      <Phone className="size-3" />
                      Numéro Officiel Cabinet (+216 92 751 296)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 gap-1.5"
                      onClick={() => setWaPhoneNumber("15551577215")}
                    >
                      <Sparkles className="size-3" />
                      Numéro Test Sandbox (+1 555 157-7215)
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="waPhone">Numéro WhatsApp configuré</Label>
                      <div className="relative flex items-center">
                        <Phone className="absolute left-3 size-4 text-muted-foreground" />
                        <Input
                          id="waPhone"
                          value={waPhoneNumber}
                          onChange={(e) => setWaPhoneNumber(e.target.value)}
                          placeholder="+216 23 599 094 ou +1 555 157 7215"
                          className="pl-9 font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="prefilledMsg">Message pré-rempli au scan du QR Code</Label>
                      <Input
                        id="prefilledMsg"
                        value={prefilledMessage}
                        onChange={(e) => setPrefilledMessage(e.target.value)}
                        placeholder="Bonjour, je souhaite prendre un rendez-vous"
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Guide de connexion Meta Webhook */}
              <SectionCard
                title="⚠️ Guide de Connexion Meta Sandbox (Essentiel)"
                description="Suivez ces 2 étapes dans Meta Developers pour que vos messages WhatsApp réels arrivent à l'IA :"
                className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/20"
              >
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-lg border border-amber-200 bg-white/80 dark:bg-background/80 space-y-1.5">
                    <p className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-600 text-white text-[11px]">1</span>
                      Abonner le Webhook au champ "messages" (Obligatoire dans Meta)
                    </p>
                    <p className="text-muted-foreground pl-7">
                      Dans votre console Meta Developers ➔ <strong>WhatsApp</strong> ➔ <strong>Configuration</strong> ➔ Sous <em>Champs du Webhook</em>, cliquez sur <strong>Gérer (Manage)</strong> et cochez la case <strong>messages</strong> (S'abonner), puis validez.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-amber-200 bg-white/80 dark:bg-background/80 space-y-1.5">
                    <p className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-600 text-white text-[11px]">2</span>
                      Ajouter votre numéro de téléphone dans Meta Sandbox
                    </p>
                    <p className="text-muted-foreground pl-7">
                      Dans <strong>WhatsApp</strong> ➔ <strong>Configuration de l'API</strong> ➔ Dans la liste déroulante <em>"À" (Numéro destinataire de test)</em>, cliquez sur <strong>Gérer la liste des numéros</strong> et ajoutez votre numéro (+216 23 599 094) avec le code SMS de vérification.
                    </p>
                  </div>
                </div>
              </SectionCard>

              {/* Instructions d'utilisation en cabinet */}
              <SectionCard
                title="Comment utiliser le QR Code au cabinet"
                description="Facilitez l'accès pour vos patients au comptoir ou sur vos supports de communication."
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg border bg-muted/20 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-emerald-700 text-sm">1. Accueil & Affiche</span>
                      <p className="text-muted-foreground mt-1">
                        Imprimez le QR Code sur le comptoir pour que les patients puissent prendre RDV en 5 secondes.
                      </p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/20 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-emerald-700 text-sm">2. Cartes de visite</span>
                      <p className="text-muted-foreground mt-1">
                        Ajoutez le QR Code au dos de vos cartes de rendez-vous pour les reports et contrôles.
                      </p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/20 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-emerald-700 text-sm">3. Site web & Réseaux</span>
                      <p className="text-muted-foreground mt-1">
                        Partagez le lien direct wa.me sur votre page Instagram ou site pour capter de nouveaux patients.
                      </p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* QR Code Preview Card */}
            <div className="space-y-6">
              <SectionCard title="QR Code WhatsApp Actif" className="text-center">
                <p className="text-xs text-muted-foreground mb-4">
                  Scannez ce QR Code avec votre appareil photo pour démarrer immédiatement la conversation WhatsApp :
                </p>

                <div className="mx-auto w-[210px] h-[210px] bg-white p-3 rounded-2xl shadow-lg border border-emerald-100 flex items-center justify-center mb-4">
                  <QRCodeSVG
                    value={whatsappDirectLink}
                    size={185}
                    level="M"
                    includeMargin={false}
                    className="w-full h-full"
                  />
                </div>

                <div className="mb-4 text-center">
                  <Badge variant="outline" className="text-[11px] font-mono bg-emerald-50 text-emerald-800 border-emerald-200">
                    {cleanPhone ? `+${cleanPhone}` : "+1 555 157 7215"}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-xs"
                    onClick={() => copyToClipboard(whatsappDirectLink, "Lien direct WhatsApp")}
                  >
                    <Share2 className="size-3.5" />
                    Copier le lien direct (wa.me)
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-xs"
                    asChild
                  >
                    <a href={whatsappDirectLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3.5" />
                      Tester dans WhatsApp Web
                    </a>
                  </Button>
                </div>
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 3: Règles Métier & Capacités
           ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="rules" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <SectionCard
                title="Capacités Autonomes de l'IA"
                description="Activez ou désactivez les fonctionnalités administratives gérées par l'IA."
              >
                <div className="space-y-4">
                  {[
                    {
                      key: "autoBooking",
                      label: "Vérification des disponibilités & Réservation d'agenda",
                      desc: `Consulte le planning en direct de ${tenant?.name || "votre cabinet"} et insère automatiquement le rendez-vous.`,
                    },
                    {
                      key: "urgencyHandling",
                      label: "Gestion prioritaire des Urgences dentaires (Rage de dent, abcès, douleurs)",
                      desc: "Détecte les cas critiques, rassure avec empathie, propose en priorité absolue les créneaux du jour même et alerte le secrétariat.",
                    },
                    {
                      key: "pricingQuotes",
                      label: "Renseignements sur les Tarifs & Soins (Détartrage, Devis indicatifs)",
                      desc: "Communique uniquement les tarifs mentionnés dans vos consignes sans poser de diagnostic.",
                    },
                    {
                      key: "reminders",
                      label: "Confirmations et rappels automatiques par message",
                      desc: "Envoie un récapitulatif clair avec date et heure dès qu'un créneau est validé.",
                    },
                    {
                      key: "doctorEscalation",
                      label: "Escalade vers le médecin / secrétariat",
                      desc: "Passe le relais à l'équipe médicale dès qu'un patient demande un suivi ou un praticien.",
                    },
                    {
                      key: "multiLanguage",
                      label: "Support multilingue (Français, Arabe Tunisien, Arabizi)",
                      desc: "L'IA s'adapte automatiquement à la langue parlée par le patient.",
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                      <Switch
                        checked={(capabilities as any)[item.key]}
                        onCheckedChange={(checked) =>
                          setCapabilities((prev) => ({ ...prev, [item.key]: checked }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Escalade Humaine */}
              <SectionCard
                title="Déclencheurs d'Escalade Vers le Médecin"
                description="Dans quelles situations l'IA passe-t-elle immédiatement le relais à l'équipe médicale ?"
              >
                <div className="space-y-3">
                  {[
                    {
                      key: "medicalQuestion",
                      label: "Question d'ordre médical ou de prescription (l'IA ne donne jamais d'avis médical)",
                    },
                    {
                      key: "frustratedPatient",
                      label: "Patient mécontent, inquiet ou réclamation sur un soin passé",
                    },
                    {
                      key: "complexQuote",
                      label: "Demande complexe de prothèses multiples ou d'implants",
                    },
                    {
                      key: "lowConfidence",
                      label: "Indécision ou confiance du modèle inférieure au seuil de sécurité",
                    },
                  ].map((rule) => (
                    <div key={rule.key} className="flex items-center justify-between py-2 border-b border-border/40">
                      <span className="text-sm font-medium">{rule.label}</span>
                      <Switch
                        checked={(escalationRules as any)[rule.key]}
                        onCheckedChange={(checked) =>
                          setEscalationRules((prev) => ({ ...prev, [rule.key]: checked }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            {/* Sidebar info */}
            <div className="space-y-6">
              <SectionCard className="border-muted bg-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="size-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">Répondeur Téléphonique IA</span>
                  <Badge variant="outline" className="text-[9px] uppercase tracking-wider ml-auto">
                    Bientôt
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Prise de rendez-vous vocale et gestion des appels entrants par l'IA en dialecte tunisien et français.
                </p>
              </SectionCard>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


