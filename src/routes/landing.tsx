import { createFileRoute, Link } from "@tanstack/react-router";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useMotionTemplate,
  useSpring,
} from "framer-motion";
import { type ReactNode, useState, useEffect } from "react";
import {
  Bot,
  Sparkles,
  CalendarDays,
  HeartPulse,
  ArrowRight,
  CheckCircle2,
  Activity,
  MessageCircle,
  Send,
  ChevronDown,
  ShieldCheck,
  Users,
  TrendingUp,
  Star,
  ClipboardList,
  Languages,
  ListPlus,
  RefreshCw,
  UserPlus,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/landing")({
  component: LandingPage,
});

/* ────────────────────────────────────────────────────────────────────── */
/*  Building blocks                                                       */
/* ────────────────────────────────────────────────────────────────────── */

/** A drawn heartbeat trace — the recurring signature motif of the page. */
function PulseTrace({
  className = "",
  duration = 2.4,
}: {
  className?: string;
  duration?: number;
}) {
  return (
    <svg
      viewBox="0 0 400 60"
      fill="none"
      className={className}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="pulseGrad" x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0" />
          <stop offset="45%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#fb7185" />
        </linearGradient>
      </defs>
      <motion.path
        d="M0 30 H130 L142 30 L152 8 L166 54 L178 30 L188 30 L198 20 L208 40 L218 30 L400 30"
        stroke="url(#pulseGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration, ease: "easeInOut" }}
      />
    </svg>
  );
}

/** Radial glow that follows the cursor inside its container. */
function CursorGlow({ children }: { children: ReactNode }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 120, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 120, damping: 20 });
  const background = useMotionTemplate`radial-gradient(560px circle at ${springX}px ${springY}px, rgba(45,212,191,0.14), transparent 70%)`;

  return (
    <div
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
      }}
      className="relative"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{ background }}
      />
      {children}
    </div>
  );
}

/** Small mono "vitals" readout badge — the recurring data-chip motif. */
function VitalBadge({
  label,
  value,
  tone = "teal",
}: {
  label: string;
  value: string;
  tone?: "teal" | "coral";
}) {
  const ring = tone === "teal" ? "border-teal-400/30 text-teal-300" : "border-rose-400/30 text-rose-300";
  const dot = tone === "teal" ? "bg-teal-400" : "bg-rose-400";
  return (
    <div className={`flex items-center gap-2 rounded-full border ${ring} bg-black/40 backdrop-blur-md px-3 py-1.5`}>
      <span className={`size-1.5 rounded-full ${dot} animate-pulse`} />
      <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">{label}</span>
      <span className="font-mono text-xs font-semibold">{value}</span>
    </div>
  );
}

/** Gradient-bordered card: outer gradient div + slightly inset solid panel. */
function EdgeCard({
  children,
  className = "",
  from = "from-teal-400/40",
  to = "to-rose-400/10",
}: {
  children: ReactNode;
  className?: string;
  from?: string;
  to?: string;
}) {
  return (
    <div className={`rounded-[26px] bg-gradient-to-br ${from} ${to} p-px ${className}`}>
      <div className="h-full w-full rounded-[25px] bg-white dark:bg-[#060a0d]">{children}</div>
    </div>
  );
}

/** Interactive Chat Mockup — rotates through 3 real scenarios */
const CHAT_SCENARIOS = [
  {
    label: "📅 Nouvelle réservation",
    botName: "Dr. Ben Salah — IA",
    messages: [
      { from: "patient", text: "Salem, nheb nekhou rdv ghodwa 🙏" },
      { from: "bot", text: "Ey behi 😊 fama disponibilité ghodwa à 10h w 14h30. Chnowa yse3dek ?" },
      { from: "patient", text: "10h behi" },
      { from: "confirm", text: "RDV confirmé automatiquement ✅" },
    ],
  },
  {
    label: "🔄 Modification de RDV",
    botName: "Dr. Ben Salah — IA",
    messages: [
      { from: "patient", text: "Je veux changer mon rendez-vous de demain 9h, j'ai un empêchement 😬" },
      { from: "bot", text: "Pas de souci ! Les prochains créneaux disponibles sont : Jeudi 10h, Vendredi 11h30. Lequel vous convient ?" },
      { from: "patient", text: "Jeudi 10h parfait" },
      { from: "confirm", text: "RDV modifié avec succès ✅ Votre ancien créneau a été libéré." },
    ],
  },
  {
    label: "👨‍👩‍👧 Réservation famille",
    botName: "Dr. Ben Salah — IA",
    messages: [
      { from: "patient", text: "Bonjour, je veux prendre des rendez-vous pour moi et ma fille de 8 ans svp" },
      { from: "bot", text: "Bien sûr ! Pour vous, j'ai 14h00 mardi. Pour votre fille (pédiatrie), j'ai 14h30 juste après. C'est pratique ?" },
      { from: "patient", text: "Oui parfait pour les deux ! 🙏" },
      { from: "confirm", text: "2 RDV confirmés pour la famille ✅" },
    ],
  },
];

function InteractiveChatMockup() {
  const [scenario, setScenario] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let timers: NodeJS.Timeout[] = [];

    const startSequence = () => {
      setStep(0);
      timers.push(setTimeout(() => setStep(1), 800));   // Patient message
      timers.push(setTimeout(() => setStep(2), 1800));  // Bot typing
      timers.push(setTimeout(() => setStep(3), 3000));  // Bot reply
      timers.push(setTimeout(() => setStep(4), 4200));  // Patient reply
      timers.push(setTimeout(() => setStep(5), 5000));  // Confirmation
      // Switch scenario 2s after confirmation
      timers.push(setTimeout(() => {
        setScenario(s => (s + 1) % CHAT_SCENARIOS.length);
        startSequence();
      }, 7200));
    };

    startSequence();
    return () => timers.forEach(clearTimeout);
  }, []);

  const sc = CHAT_SCENARIOS[scenario]!;

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-teal-400/15 flex items-center justify-center">
            <Bot className="size-4 text-teal-300" />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold">{sc.botName}</div>
            <div className="text-[11px] flex items-center gap-1 h-4">
              {step === 2 ? (
                <span className="text-teal-400 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-teal-400 animate-pulse" /> en train d'écrire…
                </span>
              ) : (
                <span className="text-slate-500">En ligne</span>
              )}
            </div>
          </div>
        </div>
        {/* Scenario indicator */}
        <div className="flex gap-1">
          {CHAT_SCENARIOS.map((_, i) => (
            <span key={i} className={`size-1.5 rounded-full transition-colors ${i === scenario ? "bg-teal-400" : "bg-white/15"}`} />
          ))}
        </div>
      </div>

      {/* Scenario label */}
      <div className="mb-3">
        <motion.span
          key={scenario}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] font-mono uppercase tracking-widest text-slate-500"
        >
          {sc.label}
        </motion.span>
      </div>

      {/* Messages */}
      <div className="space-y-2.5 text-left text-sm min-h-[230px]">
        {step >= 1 && (
          <motion.div
            key={`${scenario}-m1`}
            initial={{ opacity: 0, x: -10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%]"
          >
            {sc.messages[0]!.text}
          </motion.div>
        )}
        {step >= 3 && (
          <motion.div
            key={`${scenario}-m2`}
            initial={{ opacity: 0, x: 10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-teal-500/20 dark:bg-teal-400/15 border border-teal-500/30 dark:border-teal-400/20 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[90%] ml-auto text-teal-900 dark:text-teal-100"
          >
            {sc.messages[1]!.text}
          </motion.div>
        )}
        {step >= 4 && (
          <motion.div
            key={`${scenario}-m3`}
            initial={{ opacity: 0, x: -10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[65%]"
          >
            {sc.messages[2]!.text}
          </motion.div>
        )}
        {step >= 5 && sc.messages[3] && (
          <motion.div
            key={`${scenario}-m4`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
            className="flex items-center gap-2 w-fit bg-rose-50 dark:bg-rose-400/10 border border-rose-300 dark:border-rose-400/20 rounded-full px-3 py-1.5"
          >
            <CheckCircle2 className="size-3.5 text-rose-500 dark:text-rose-300 flex-shrink-0" />
            <span className="text-[11px] text-rose-700 dark:text-rose-200 font-medium">{sc.messages[3].text}</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/** Medical Record integration mockup */
function MedicalRecordMockup() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let timers: NodeJS.Timeout[] = [];
    const startSequence = () => {
      setStep(0);
      timers.push(setTimeout(() => setStep(1), 1000)); // AI reading dossier
      timers.push(setTimeout(() => setStep(2), 2500)); // AI found meds
      timers.push(setTimeout(() => setStep(3), 4000)); // AI replies to patient
      timers.push(setTimeout(startSequence, 10000));
    };
    startSequence();
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col sm:flex-row h-full">
      {/* Left side: Doctor CRM */}
      <div className="w-full sm:w-1/2 p-5 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20">
        <div className="flex items-center gap-2 mb-4 opacity-50">
          <ClipboardList className="size-4 text-teal-300" />
          <span className="text-xs font-semibold">Dossier: Ahmed K.</span>
        </div>
        <div className="space-y-3">
          <div className="h-2 w-1/3 bg-slate-200 dark:bg-white/10 rounded" />
          <div className="h-2 w-3/4 bg-slate-200 dark:bg-white/10 rounded" />
          <div className="mt-4 p-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-xs space-y-2 relative overflow-hidden">
            <span className="text-teal-600 dark:text-teal-400 font-semibold block mb-1">Prescription (Hier)</span>
            <span className="block text-slate-600 dark:text-slate-300">• Amoxicilline 1g (2x/j)</span>
            <span className="block text-slate-600 dark:text-slate-300">• Paracétamol 1000mg</span>

            {step >= 1 && (
              <motion.div
                initial={{ left: "-100%" }}
                animate={{ left: "100%" }}
                transition={{ duration: 1.5, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-400/20 to-transparent w-[50%]"
              />
            )}
            {step >= 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute top-2 right-2 flex items-center gap-1 bg-teal-400/20 text-teal-300 px-1.5 py-0.5 rounded text-[10px] font-bold"
              >
                <Bot className="size-3" /> Lu par l'IA
              </motion.div>
            )}
          </div>
        </div>
      </div>
      {/* Right side: WhatsApp */}
      <div className="w-full sm:w-1/2 p-5 bg-slate-100 dark:bg-[#060a0d]">
        <div className="flex items-center gap-2 mb-4">
          <div className="size-6 rounded-full bg-teal-500/20 dark:bg-teal-400/15 flex items-center justify-center">
            <Bot className="size-3 text-teal-600 dark:text-teal-300" />
          </div>
          <span className="text-xs font-semibold">Ahmed K.</span>
        </div>
        <div className="space-y-2.5 text-left text-sm h-[130px]">
          <div className="bg-slate-200 dark:bg-white/5 rounded-2xl rounded-tl-sm px-3 py-2 w-[85%] text-xs text-slate-700 dark:text-slate-200">
            Docteur, je ne trouve plus l'ordonnance d'hier. Quels antibios je dois prendre ?
          </div>
          {step >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="bg-teal-500/20 dark:bg-teal-400/15 border border-teal-500/30 dark:border-teal-400/20 rounded-2xl rounded-tr-sm px-3 py-2 w-[90%] ml-auto text-teal-900 dark:text-teal-100 text-xs origin-top-right"
            >
              Bonjour Ahmed ! D'après votre dossier, le Dr vous a prescrit de l'Amoxicilline 1g (2 fois par jour) et du Paracétamol 1000mg. 😊
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Page                                                                  */
/* ────────────────────────────────────────────────────────────────────── */

function LandingPage() {
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.15], [0, 40]);

  const marqueeWords = [
    "RDV AUTOMATISÉS",
    "PATIENTS RÉCUPÉRÉS",
    "AGENDA OPTIMISÉ",
    "IA MÉDICALE",
    "ZÉRO NO-SHOW",
    "WHATSAPP NATIF",
  ];

  const bentoFeatures = [
    {
      icon: Bot,
      title: "Assistant WhatsApp IA",
      desc: "Répond aux patients 24/7, planifie les rendez-vous et gère les urgences automatiquement.",
      tone: "teal" as const,
      span: "md:col-span-2",
    },
    {
      icon: Languages,
      title: "Multilingue Natif",
      desc: "Comprend le Français, l'Arabe classique, l'Anglais et le dialecte Tunisien (Darija) — sans configuration.",
      tone: "coral" as const,
      span: "md:col-span-1",
    },
    {
      icon: ClipboardList,
      title: "Dossier Patient Intégré",
      desc: "L'IA lit les fiches médicales et ordonnances pour répondre aux questions des patients avec un contexte parfait.",
      tone: "coral" as const,
      span: "md:col-span-1",
    },
    {
      icon: RefreshCw,
      title: "Modification de RDV",
      desc: "Le patient veut changer sa date ? Un simple message suffit. L'IA libère l'ancien créneau et en propose de nouveaux en 3 secondes.",
      tone: "teal" as const,
      span: "md:col-span-1",
    },
    {
      icon: UserPlus,
      title: "Réservation Famille",
      desc: "Un patient peut réserver pour lui et ses proches en un seul échange. L'agenda de chaque praticien se met à jour instantanément.",
      tone: "teal" as const,
      span: "md:col-span-1",
    },
    {
      icon: CalendarDays,
      title: "Agenda Intelligent",
      desc: "Se synchronise en temps réel. Fini les conflits et les doubles réservations.",
      tone: "coral" as const,
      span: "md:col-span-1",
    },
    {
      icon: ListPlus,
      title: "File d'Attente Automatisée",
      desc: "Un rendez-vous annulé ? L'IA propose immédiatement la place au prochain patient sur la liste.",
      tone: "coral" as const,
      span: "md:col-span-1",
    },
    {
      icon: Bell,
      title: "Rappels Anti No-Shows",
      desc: "Rappels automatiques J-1 et H-2 par WhatsApp. Vos patients ne l'oublient plus jamais.",
      tone: "teal" as const,
      span: "md:col-span-1",
    },
    {
      icon: ShieldCheck,
      title: "Isolation des Données",
      desc: "Chaque cabinet, chaque praticien, ses propres données — cloisonnées par conception.",
      tone: "coral" as const,
      span: "md:col-span-3",
    },
  ];

  const steps = [
    {
      n: "01",
      title: "Le patient écrit sur WhatsApp",
      desc: "Aucune app à installer, aucun compte à créer — le canal que vos patients utilisent déjà tous les jours.",
      icon: MessageCircle,
    },
    {
      n: "02",
      title: "L'IA comprend et propose",
      desc: "Elle lit l'intention réelle du message, vérifie votre agenda en temps réel et propose des créneaux valides.",
      icon: Activity,
    },
    {
      n: "03",
      title: "Le rendez-vous se confirme seul",
      desc: "Double-booking impossible, confirmation envoyée automatiquement, votre équipe n'intervient que si besoin.",
      icon: CalendarDays,
    },
  ];

  const plans = [
    {
      name: "Starter",
      price: "49",
      tagline: "Pour les cabinets individuels qui démarrent.",
      features: ["150 patients max", "2 utilisateurs", "200 RDV / mois", "Support email"],
      cta: "Commencer",
      highlight: false,
    },
    {
      name: "Pro",
      price: "99",
      tagline: "L'automatisation IA complète pour accélérer.",
      features: [
        "1 000 patients max",
        "5 utilisateurs",
        "Assistant IA WhatsApp",
        "Relances automatiques",
        "Export & Analytics",
      ],
      cta: "Démarrer l'essai",
      highlight: true,
    },
    {
      name: "Enterprise",
      price: "249",
      tagline: "Pour les cliniques à fort volume.",
      features: [
        "Patients illimités",
        "Utilisateurs illimités",
        "Marque blanche",
        "Support prioritaire 24/7",
        "IA multi-praticiens",
      ],
      cta: "Contacter les ventes",
      highlight: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#05080a] dark:text-slate-50 selection:bg-teal-400/30 overflow-x-hidden font-sans">
      {/* Grain texture overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Ambient background glows */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full bg-teal-400/10 dark:bg-teal-500/10 blur-[130px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full bg-rose-400/[0.07] dark:bg-rose-500/[0.07] blur-[130px]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/60 dark:border-white/5 bg-white/80 dark:bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg shadow-teal-500/20">
              <Activity className="size-4 text-black" />
              <span className="absolute -top-1 -right-1 size-2 rounded-full bg-rose-400 animate-pulse" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
              Medical<span className="text-teal-500">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle variant="pill" />
            <Link to="/login">
              <Button variant="ghost" className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5">
                Connexion
              </Button>
            </Link>
            <Link to="/login">
              <Button className="bg-teal-500 text-white hover:bg-teal-600 dark:bg-teal-400 dark:text-black dark:hover:bg-teal-300 rounded-full font-semibold px-6 shadow-[0_0_20px_-5px_rgba(45,212,191,0.5)]">
                Démarrer <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* ────────────────────────────── Hero ────────────────────────────── */}
        <CursorGlow>
          <section className="relative pt-40 pb-16 lg:pt-56 lg:pb-24 px-6 flex flex-col items-center text-center">
            <motion.div style={{ opacity: heroOpacity, y: heroY }} className="max-w-5xl mx-auto relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 mb-8"
              >
                <VitalBadge label="Système" value="En ligne 24/7" tone="teal" />
              </motion.div>

              <h1 className="text-6xl lg:text-8xl font-bold tracking-tighter mb-8 leading-[0.95]">
                {["Votre cabinet", "ne dort", "plus jamais."].map((line, li) => (
                  <motion.span
                    key={li}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.15 + li * 0.12 }}
                    className={
                      li === 2
                        ? "block bg-clip-text text-transparent bg-gradient-to-r from-teal-600 via-teal-500 to-rose-500 dark:from-teal-300 dark:via-teal-400 dark:to-rose-400"
                        : "block text-slate-900 dark:text-white"
                    }
                  >
                    {line}
                  </motion.span>
                ))}
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.55 }}
                className="text-lg lg:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed"
              >
                Automatisez vos rendez-vous, réduisez les no-shows et récupérez vos patients perdus avec
                notre assistant WhatsApp intelligent.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Link to="/login">
                  <Button className="h-14 px-8 bg-teal-600 hover:bg-teal-700 dark:bg-teal-400 dark:hover:bg-teal-300 text-white dark:text-black rounded-full text-lg font-semibold shadow-[0_0_40px_-10px_rgba(45,212,191,0.6)] transition-transform hover:scale-105">
                    Accéder à mon espace
                  </Button>
                </Link>
                <button className="group flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-sm font-medium transition-colors">
                  Voir la démo en direct
                  <span className="flex size-8 items-center justify-center rounded-full border border-slate-300 dark:border-white/15 group-hover:border-teal-500/50 dark:group-hover:border-teal-400/50 group-hover:bg-teal-500/10 dark:group-hover:bg-teal-400/10 transition-colors">
                    <ArrowRight className="size-3.5" />
                  </span>
                </button>
              </motion.div>
            </motion.div>

            {/* Full-width pulse divider */}
            <div className="w-full max-w-4xl mt-16 h-12 opacity-80">
              <PulseTrace className="w-full h-full" />
            </div>

            {/* Floating WhatsApp mockup + vitals readouts */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="mt-8 w-full max-w-md mx-auto relative"
            >
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <EdgeCard className="shadow-2xl shadow-teal-500/10">
                  <InteractiveChatMockup />
                </EdgeCard>
              </motion.div>

              <motion.div
                className="absolute -left-4 lg:-left-24 top-6 hidden sm:block"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >
                <VitalBadge label="No-shows" value="−42%" tone="coral" />
              </motion.div>
              <motion.div
                className="absolute -right-4 lg:-right-28 top-1/2 hidden sm:block"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <VitalBadge label="Réponse" value="< 3s" tone="teal" />
              </motion.div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="mt-20 text-slate-600"
            >
              <ChevronDown className="size-5" />
            </motion.div>
          </section>
        </CursorGlow>

        {/* ────────────────────────────── Marquee ────────────────────────────── */}
        <section className="py-8 border-y border-white/5 bg-black/30 overflow-hidden relative">
          <div className="flex whitespace-nowrap animate-marquee">
            {[...marqueeWords, ...marqueeWords, ...marqueeWords].map((w, i) => (
              <span
                key={i}
                className="mx-8 font-mono text-xs tracking-[0.3em] text-slate-600 flex items-center gap-8"
              >
                {w}
                <span className="size-1 rounded-full bg-teal-500/40" />
              </span>
            ))}
          </div>
          <style>{`
            @keyframes marquee {
              from { transform: translateX(0); }
              to { transform: translateX(-33.333%); }
            }
            .animate-marquee { animation: marquee 28s linear infinite; }
          `}</style>
        </section>

        {/* ────────────────────────────── Dossier Patient & IA ────────────────────────────── */}
        <section className="py-28 px-6 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="w-full lg:w-1/3">
                <span className="font-mono text-xs uppercase tracking-[0.3em] text-teal-600 dark:text-teal-400">Le vrai pouvoir</span>
                <h2 className="text-3xl lg:text-5xl font-bold mt-4 mb-6 tracking-tight">
                  L'IA qui connaît <br /> vos patients.
                </h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
                  Ne vous contentez pas d'un simple agenda. Notre IA se connecte à vos dossiers patients.
                  <br /><br />
                  Quand vous prescrivez un médicament, l'IA le sait. Quand un patient a oublié sa posologie, elle lui répond instantanément sur WhatsApp, sans que vous n'ayez à lever le petit doigt.
                </p>
                <ul className="space-y-4">
                  {[
                    "Lit vos prescriptions et ordonnances",
                    "Répond aux questions médicales basiques",
                    "Alerte le praticien en cas d'urgence",
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="size-4 text-teal-600 dark:text-teal-400" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="w-full lg:w-2/3">
                <EdgeCard from="from-teal-400/40" to="to-teal-900/10" className="shadow-2xl shadow-teal-500/10">
                  <MedicalRecordMockup />
                </EdgeCard>
              </div>
            </div>
          </div>
        </section>

        {/* ────────────────────────────── Features (bento) ────────────────────────────── */}
        <section className="py-28 px-6 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-teal-600 dark:text-teal-400">Fonctionnalités</span>
              <h2 className="text-3xl lg:text-5xl font-bold mt-4 mb-4 tracking-tight">
                L'innovation au service de la santé
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Découvrez comment notre technologie transforme la gestion quotidienne de votre clinique.
              </p>
            </div>

            <div className="grid md:grid-cols-3 md:grid-rows-2 gap-4">
              {bentoFeatures.map((f, i) => {
                const isTeal = f.tone === "teal";
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className={f.span}
                  >
                    <EdgeCard
                      from={isTeal ? "from-teal-400/30" : "from-rose-400/25"}
                      to="to-transparent"
                      className="h-full group hover:shadow-[0_0_40px_-15px_rgba(45,212,191,0.3)] transition-shadow"
                    >
                      <div className="p-8 h-full flex flex-col">
                        <div
                          className={`size-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${isTeal ? "bg-teal-400/10" : "bg-rose-400/10"
                            }`}
                        >
                          <f.icon className={`size-7 ${isTeal ? "text-teal-600 dark:text-teal-300" : "text-rose-500 dark:text-rose-300"}`} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                      </div>
                    </EdgeCard>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ────────────────────────────── Process timeline ────────────────────────────── */}
        <section className="py-28 px-6 relative z-10 border-t border-slate-200 dark:border-white/5">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-20">
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-rose-500 dark:text-rose-400">Comment ça marche</span>
              <h2 className="text-3xl lg:text-5xl font-bold mt-4 tracking-tight">Trois battements, un rendez-vous.</h2>
            </div>

            <div className="relative">
              <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-teal-400/40 via-white/10 to-rose-400/40 md:-translate-x-1/2" />
              <div className="space-y-16">
                {steps.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className={`relative flex items-start gap-6 md:gap-10 ${i % 2 === 1 ? "md:flex-row-reverse md:text-right" : ""
                      }`}
                  >
                    <div className="relative z-10 flex-shrink-0">
                      <div className="size-16 rounded-full bg-white dark:bg-[#05080a] border-2 border-teal-500/40 dark:border-teal-400/30 flex items-center justify-center shadow-md">
                        <s.icon className="size-6 text-teal-600 dark:text-teal-300" />
                      </div>
                    </div>
                    <div className="flex-1 pt-2">
                      <span className="font-mono text-6xl font-bold text-slate-200 dark:text-white/5 block leading-none mb-2">
                        {s.n}
                      </span>
                      <h3 className="text-xl font-bold mb-2 -mt-8 md:mt-0">{s.title}</h3>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">{s.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ────────────────────────────── Pricing ────────────────────────────── */}
        <section className="py-28 px-6 relative z-10 border-t border-white/5 bg-black/20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-teal-600 dark:text-teal-400">Tarifs</span>
              <h2 className="text-3xl lg:text-5xl font-bold mt-4 mb-4 tracking-tight">
                Des plans adaptés à votre croissance
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Passez à la vitesse supérieure. Un investissement rentabilisé dès le premier patient récupéré.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 items-center max-w-5xl mx-auto">
              {plans.map((plan, i) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={plan.highlight ? "md:-translate-y-4" : ""}
                >
                  <EdgeCard
                    from={plan.highlight ? "from-teal-400/60" : "from-white/15"}
                    to={plan.highlight ? "to-rose-400/20" : "to-transparent"}
                    className={plan.highlight ? "shadow-2xl shadow-teal-500/10" : ""}
                  >
                    <div className="p-8 relative">
                      {plan.highlight && (
                        <div className="absolute top-0 inset-x-0 flex justify-center -translate-y-1/2">
                          <span className="flex items-center gap-1 bg-teal-400 text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                            <Star className="size-3" /> Populaire
                          </span>
                        </div>
                      )}
                      <h3 className={`text-lg font-medium ${plan.highlight ? "text-teal-600 dark:text-teal-300" : "text-slate-500 dark:text-slate-300"}`}>
                        {plan.name}
                      </h3>
                      <div className="mt-4 flex items-baseline text-5xl font-extrabold font-mono">
                        {plan.price}
                        <span className="text-xl text-slate-500 ml-1 font-medium">TND</span>
                        <span className="text-sm text-slate-500 ml-1 font-normal">/mo</span>
                      </div>
                      <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">{plan.tagline}</p>
                      <ul className="mt-8 space-y-4">
                        {plan.features.map((feat) => (
                          <li key={feat} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                            <CheckCircle2
                              className={`size-4 ${plan.highlight ? "text-teal-500 dark:text-teal-400" : "text-slate-400 dark:text-slate-500"}`}
                            />
                            {feat}
                          </li>
                        ))}
                      </ul>
                      {plan.highlight ? (
                        <Link to="/login">
                          <Button className="w-full mt-8 rounded-full bg-teal-400 text-black hover:bg-teal-300 font-bold">
                            {plan.cta}
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full mt-8 rounded-full border-slate-200 dark:border-white/20 bg-transparent hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200"
                        >
                          {plan.cta}
                        </Button>
                      )}
                    </div>
                  </EdgeCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ────────────────────────────── CTA banner ────────────────────────────── */}
        <section className="py-28 px-6 relative z-10 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <PulseTrace className="w-full max-w-3xl h-24" duration={3} />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative max-w-2xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 mb-6">
              <Users className="size-4 text-teal-400" />
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-slate-400">
                Rejoignez les cabinets déjà connectés
              </span>
            </div>
            <h2 className="text-4xl lg:text-6xl font-bold tracking-tighter mb-8">
              Prêt à faire battre<br />votre cabinet plus fort ?
            </h2>
            <Link to="/login">
              <Button className="h-14 px-10 bg-teal-400 hover:bg-teal-300 text-black rounded-full text-lg font-semibold shadow-[0_0_40px_-10px_rgba(45,212,191,0.6)] transition-transform hover:scale-105">
                Démarrer maintenant <TrendingUp className="ml-2 size-4" />
              </Button>
            </Link>
          </motion.div>
        </section>
      </main>

      {/* ────────────────────────────── Footer ────────────────────────────── */}
      <footer className="border-t border-slate-200 dark:border-white/5 relative z-10 bg-slate-50 dark:bg-black/40 pt-16 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-10 pb-10">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5 mb-4">
                <Activity className="size-5 text-teal-400" />
                <span className="font-bold text-xl">
                  Medical<span className="text-teal-400">AI</span>
                </span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                L'assistant WhatsApp qui garde votre cabinet actif, même quand vous ne l'êtes pas.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-10 text-sm">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-widest text-slate-600 mb-4">Produit</div>
                <ul className="space-y-3 text-slate-500 dark:text-slate-400">
                  <li className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">Fonctionnalités</li>
                  <li className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">Tarifs</li>
                  <li className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">Démo</li>
                </ul>
              </div>
              <div>
                <div className="font-mono text-[11px] uppercase tracking-widest text-slate-600 mb-4">Société</div>
                <ul className="space-y-3 text-slate-500 dark:text-slate-400">
                  <li className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">À propos</li>
                  <li className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">Contact</li>
                </ul>
              </div>
              <div>
                <div className="font-mono text-[11px] uppercase tracking-widest text-slate-600 mb-4">Légal</div>
                <ul className="space-y-3 text-slate-500 dark:text-slate-400">
                  <li className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">Confidentialité</li>
                  <li className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">CGU</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <span>© 2026 Medical AI. Tous droits réservés. Construit pour les visionnaires.</span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-teal-500/60">Tunis · 🇹🇳</span>
          </div>
        </div>
      </footer>
    </div>
  );
}