import { createFileRoute, Link } from "@tanstack/react-router";
import {
  motion,
  AnimatePresence,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useMotionTemplate,
  useReducedMotion,
} from "framer-motion";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bot, CalendarDays, HeartPulse, ArrowRight, CheckCircle2, Activity, MessageCircle,
  ShieldCheck, Users, TrendingUp, Star, ClipboardList, Languages, ListPlus, RefreshCw,
  UserPlus, Bell, LockKeyhole, DatabaseZap, UserCheck, Siren, Fingerprint, Repeat,
  ScrollText, Stethoscope, Menu, X, Globe, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAppState } from "@/hooks/use-app-state";
import { ThemeToggle } from "@/components/theme-toggle";


import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { getCountries } from 'react-phone-number-input/input';
import en from 'react-phone-number-input/locale/en.json';
import fr from 'react-phone-number-input/locale/fr.json';
import ar from 'react-phone-number-input/locale/ar.json';
import { ChevronsUpDown } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";


export const Route = createFileRoute("/landing")({ component: LandingPage });

/* ───────────────────────── Effets signature ───────────────────────── */

const mix = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

/** Les lettres montent une à une depuis une ligne de coupe, avec bascule 3D et flou qui se dissipe. */
function Reveal({ text, className = "", gradient = false, delay = 0 }: { text: string; className?: string; gradient?: boolean; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{text}</span>;
  const isArabic = /[\u0600-\u06FF]/.test(text);
  const words = text.split(" ");
  const total = isArabic ? words.length : (text.replace(/ /g, "").length || 1);
  let n = 0;
  return (
    <motion.span
      key={text}
      className={className}
      dir="auto"
      aria-label={text}
      initial="h"
      whileInView="v"
      viewport={{ once: true, margin: "-40px" }}
      transition={{ staggerChildren: isArabic ? 0.08 : 0.03, delayChildren: delay }}
    >
      {words.map((w, wi) => {
        const wordT = isArabic ? n++ / total : 0;
        return (
          <span key={wi}>
            {wi > 0 && " "}
            <span aria-hidden className="-my-[0.14em] inline-block whitespace-nowrap py-[0.14em] align-bottom" style={{ overflow: "hidden", perspective: 600 }}>
              {isArabic ? (
                <motion.span
                  className="inline-block"
                  style={{
                    transformOrigin: "50% 100%",
                    ...(gradient ? { color: `rgb(${mix(45, 251, wordT)},${mix(212, 113, wordT)},${mix(191, 133, wordT)})` } : {}),
                  }}
                  variants={{
                    h: { y: "115%", rotateX: -75, opacity: 0, filter: "blur(8px)" },
                    v: { y: "0%", rotateX: 0, opacity: 1, filter: "blur(0px)", transition: { type: "spring", stiffness: 140, damping: 16 } },
                  }}
                >
                  {w}
                </motion.span>
              ) : (
                w.split("").map((c, ci) => {
                  const t = n++ / total;
                  return (
                    <motion.span
                      key={ci}
                      className="inline-block"
                      style={{
                        transformOrigin: "50% 100%",
                        ...(gradient ? { color: `rgb(${mix(45, 251, t)},${mix(212, 113, t)},${mix(191, 133, t)})` } : {}),
                      }}
                      variants={{
                        h: { y: "115%", rotateX: -75, opacity: 0, filter: "blur(8px)" },
                        v: { y: "0%", rotateX: 0, opacity: 1, filter: "blur(0px)", transition: { type: "spring", stiffness: 140, damping: 16 } },
                      }}
                    >
                      {c}
                    </motion.span>
                  );
                })
              )}
            </span>
          </span>
        );
      })}
    </motion.span>
  );
}

/** Un électrocardiogramme fixe qui se trace au fil du scroll. */
function ScrollECG() {
  const { scrollYProgress } = useScroll();
  const p = useSpring(scrollYProgress, { stiffness: 80, damping: 22 });
  const d = "M16 0" + Array.from({ length: 4 }, (_, i) => ` V${i * 250 + 100} L6 ${i * 250 + 130} L26 ${i * 250 + 170} L16 ${i * 250 + 200}`).join("") + " V1000";
  return (
    <svg aria-hidden className="pointer-events-none fixed left-2 top-0 z-30 hidden h-screen w-8 lg:block" viewBox="0 0 32 1000" preserveAspectRatio="none" fill="none">
      <path d={d} stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />
      <motion.path d={d} stroke="#2dd4bf" strokeWidth="2" strokeLinejoin="round" style={{ pathLength: p, filter: "drop-shadow(0 0 6px #2dd4bf)" }} />
    </svg>
  );
}

/** Carte qui s'incline en 3D et suit le curseur avec un halo. */
function Tilt({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rx = useSpring(useTransform(y, [-0.5, 0.5], [7, -7]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(x, [-0.5, 0.5], [-7, 7]), { stiffness: 200, damping: 20 });
  const gx = useTransform(x, (v) => (v + 0.5) * 100);
  const gy = useTransform(y, (v) => (v + 0.5) * 100);
  const glow = useMotionTemplate`radial-gradient(280px circle at ${gx}% ${gy}%, rgba(45,212,191,0.16), transparent 70%)`;
  return (
    <motion.div
      onMouseMove={(e) => {
        if (reduce) return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width - 0.5);
        y.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      className={`relative rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm ${className}`}
    >
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-3xl" style={{ background: glow }} />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

function Pulse({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 60" fill="none" className={className} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="pg" x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2dd4bf" stopOpacity="0" />
          <stop offset=".5" stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#fb7185" />
        </linearGradient>
      </defs>
      <motion.path
        d="M0 30 H130 L142 30 L152 8 L166 54 L178 30 L188 30 L198 20 L208 40 L218 30 L400 30"
        stroke="url(#pg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
        transition={{ duration: 2.4, ease: "easeInOut" }}
      />
    </svg>
  );
}

function Chip({ children, tone = "teal" }: { children: ReactNode; tone?: "teal" | "rose" }) {
  const c = tone === "teal" ? "border-teal-400/30 text-teal-200" : "border-rose-400/30 text-rose-200";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border ${c} bg-black/40 px-3 py-1.5 text-xs font-medium backdrop-blur-md`}>
      <span className={`size-1.5 rounded-full ${tone === "teal" ? "bg-teal-400" : "bg-rose-400"} animate-pulse`} />
      {children}
    </span>
  );
}

/* ───────────────────── Pipeline de contrôles en direct ───────────────────── */

const getGates = (t: any) => [
  { icon: MessageCircle, t: t('landing.gates.msg_received'), d: t('landing.gates.msg_received_desc') },
  { icon: Fingerprint, t: t('landing.gates.context_isolated'), d: t('landing.gates.context_isolated_desc') },
  { icon: Languages, t: t('landing.gates.intent_understood'), d: t('landing.gates.intent_understood_desc') },
  { icon: Siren, t: t('landing.gates.ai_guardrail'), d: t('landing.gates.ai_guardrail_desc') },
  { icon: CalendarDays, t: t('landing.gates.slot_validated'), d: t('landing.gates.slot_validated_desc') },
  { icon: RefreshCw, t: t('landing.gates.waitlist_check'), d: t('landing.gates.waitlist_check_desc') },
  { icon: Bell, t: t('landing.gates.reminders'), d: t('landing.gates.reminders_desc') },
  { icon: CheckCircle2, t: t('landing.gates.confirmation'), d: t('landing.gates.confirmation_desc') },
];

const getScenarios = (t: any) => [
  { 
    tab: t('landing.scenarios.tab1'), 
    history: [
       { role: 'user', text: t('landing.scenarios.msg1_1') },
       { role: 'bot', text: t('landing.scenarios.reply1_1') },
    ],
    msg: t('landing.scenarios.msg1_2'), 
    stop: undefined as number | undefined, 
    reply: t('landing.scenarios.reply1_2'), 
    tone: "teal" 
  },
  { 
    tab: t('landing.scenarios.tab2'), 
    history: [
       { role: 'user', text: t('landing.scenarios.msg2_1') },
       { role: 'bot', text: t('landing.scenarios.reply2_1') },
    ],
    msg: t('landing.scenarios.msg2_2'), 
    stop: 3, 
    reply: t('landing.scenarios.reply2_2'), 
    tone: "rose" 
  },
];

function Pipeline() {
  const { t } = useTranslation();

  const GATES = getGates(t);
  const SCEN = getScenarios(t);
  const [s, setS] = useState(0);
  const [i, setI] = useState(-1);
  const sc = SCEN[s]!;
  const last = sc.stop ?? GATES.length - 1;

  useEffect(() => {
    const t = setTimeout(() => {
      if (i < last) setI(i + 1);
      else { setI(-1); setS((v) => (v + 1) % SCEN.length); }
    }, i < last ? 850 : 3400);
    return () => clearTimeout(t);
  }, [i, last, s]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <div className="mb-5 flex flex-wrap gap-2" role="tablist">
          {SCEN.map((x, k) => (
            <button key={x.tab} role="tab" aria-selected={k === s} onClick={() => { setS(k); setI(-1); }}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${k === s ? "border-teal-400/60 bg-teal-400/10 text-teal-100" : "border-white/10 text-slate-400 hover:text-white"}`}>
              {x.tab}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={s} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3 text-sm">
            {sc.history && sc.history.map((h: any, idx: number) => (
              <div key={idx} className={h.role === 'bot' 
                ? `ml-auto w-fit max-w-[92%] rounded-2xl rounded-tr-sm border px-4 py-2.5 ${sc.tone === "teal" ? "border-teal-400/30 bg-teal-400/10 text-teal-50" : "border-rose-400/30 bg-rose-400/10 text-rose-50"}` 
                : "w-fit max-w-[88%] rounded-2xl rounded-tl-sm bg-white/[0.07] px-4 py-2.5"}>
                {h.text}
              </div>
            ))}
            <div className="w-fit max-w-[88%] rounded-2xl rounded-tl-sm bg-white/[0.07] px-4 py-2.5">{sc.msg}</div>
            {i >= last && (
              <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
                className={`ml-auto w-fit max-w-[92%] rounded-2xl rounded-tr-sm border px-4 py-2.5 ${sc.tone === "teal" ? "border-teal-400/30 bg-teal-400/10 text-teal-50" : "border-rose-400/30 bg-rose-400/10 text-rose-50"}`}>
                {sc.reply}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <ol className="relative space-y-2.5">
        {GATES.map((g, k) => {
          const lit = k <= i;
          const blocked = sc.stop === k && lit;
          const skipped = sc.stop !== undefined && k > sc.stop;
          return (
            <li key={g.t} className={`relative flex items-center gap-4 rounded-2xl border px-3 py-2.5 transition-all duration-500 ${blocked ? "border-rose-400/50 bg-rose-400/10" : lit ? "border-teal-400/40 bg-teal-400/[0.07]" : "border-white/5 bg-white/[0.02]"} ${skipped ? "opacity-30" : ""}`}>
              {k > 0 && <span aria-hidden className={`absolute -top-[11px] left-[30px] h-[11px] w-px transition-colors duration-500 ${lit && !skipped ? "bg-teal-300" : "bg-white/10"}`} />}
              <span className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border ${blocked ? "border-rose-400 bg-[#1a0a0f] text-rose-300" : lit ? "border-teal-300 bg-[#04120f] text-teal-200 shadow-[0_0_18px_rgba(45,212,191,.5)]" : "border-white/10 bg-[#04070a] text-slate-500"}`}>
                <g.icon className="size-4" />
              </span>
              <div>
                <div className="text-sm font-semibold">{blocked ? t("landing.gates.escalation") : g.t}</div>
                <div className="text-xs text-slate-400">{g.d}</div>
              </div>
            </li>
          );
        })}
      </ol>

    </div>
  );
}

/* ───────────────────────── Orbite de sécurité ───────────────────────── */

const getLayers = (t: any) => [
  { icon: LockKeyhole, t: t('landing.security.layers.access.title'), d: t('landing.security.layers.access.desc') },
  { icon: DatabaseZap, t: t('landing.security.layers.tenant.title'), d: t('landing.security.layers.tenant.desc') },
  { icon: UserCheck, t: t('landing.security.layers.validation.title'), d: t('landing.security.layers.validation.desc') },
  { icon: Repeat, t: t('landing.security.layers.idempotent.title'), d: t('landing.security.layers.idempotent.desc') },
  { icon: Siren, t: t('landing.security.layers.ai_limits.title'), d: t('landing.security.layers.ai_limits.desc') },
  { icon: ScrollText, t: t('landing.security.layers.traceability.title'), d: t('landing.security.layers.traceability.desc') },
  { icon: Users, t: t('landing.security.layers.permissions.title'), d: t('landing.security.layers.permissions.desc') },
];

function SecurityOrbit() {
  const { t } = useTranslation();
  const LAYERS = getLayers(t);
  const [a, setA] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setA((v) => (v + 1) % LAYERS.length), 5000);
    return () => clearInterval(id);
  }, []);
  const L = LAYERS[a]!;
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2">
      <div className="relative mx-auto aspect-square w-full max-w-[460px]">
        <style>{`
          @keyframes orb{to{transform:rotate(360deg)}}
          .orb{animation:orb var(--d) linear infinite;transform-origin:200px 200px}
          @media (prefers-reduced-motion:reduce){.orb{animation:none}}
        `}</style>
        <svg viewBox="0 0 400 400" className="h-full w-full" role="img" aria-label="Sept couches de sécurité concentriques">
          {LAYERS.map((_, k) => {
            const r = 56 + k * 21;
            const on = k === a;
            return (
              <g key={k} className="orb" style={{ ["--d" as string]: `${18 + k * 7}s`, animationDirection: k % 2 ? "reverse" : "normal" }}>
                <circle cx="200" cy="200" r={r} fill="none" stroke={on ? "#2dd4bf" : "rgba(255,255,255,0.12)"} strokeWidth={on ? 2.2 : 1} strokeDasharray={on ? "none" : `${4 + k * 2} ${6 + k}`} style={{ filter: on ? "drop-shadow(0 0 8px #2dd4bf)" : "none", transition: "all .6s" }} />
                <circle cx={200 + r} cy="200" r={on ? 5 : 3} fill={on ? "#fb7185" : "#2dd4bf"} opacity={on ? 1 : 0.5} />
              </g>
            );
          })}
        </svg>
        <div className="absolute left-1/2 top-1/2 flex aspect-square w-1/5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-teal-300/50 bg-[#04120f] shadow-[0_0_50px_rgba(45,212,191,.35)]">
          <ShieldCheck className="h-1/2 w-1/2 text-teal-200" />
        </div>
      </div>

      <div>
        <ul className="mb-8 flex flex-wrap gap-2">
          {LAYERS.map((l, k) => (
            <li key={l.t}>
              <button onClick={() => setA(k)} aria-pressed={k === a}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${k === a ? "border-teal-300/70 bg-teal-400/10 text-teal-50" : "border-white/10 text-slate-400 hover:text-white"}`}>
                <l.icon className="size-3.5" /> {l.t}
              </button>
            </li>
          ))}
        </ul>
        <AnimatePresence mode="wait">
          <motion.div key={a} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35 }} className="min-h-[150px]">
            <L.icon className="mb-4 size-8 text-teal-300" />
            <h3 className="mb-3 text-2xl font-semibold">{L.t}</h3>
            <p className="max-w-md leading-relaxed text-slate-300">{L.d}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ───────────────────────────── Données ───────────────────────────── */

const getMarquee = (t: any) => ["Rendez-vous automatisés", "مرحبا، نحب نحجز موعد", "Isolation par cabinet", "Escalade humaine", "Hello, I'd like to book", "Rappels WhatsApp", "Salem, nheb nekhou rdv", "Agenda validé côté serveur"]; // kept static or we can just translate them later

const getFeatures = (t: any) => [
  { icon: Bot, t: t('landing.features.items.assistant.title'), d: t('landing.features.items.assistant.desc') },
  { icon: Languages, t: t('landing.features.items.multilingual.title'), d: t('landing.features.items.multilingual.desc') },
  { icon: ClipboardList, t: t('landing.features.items.record.title'), d: t('landing.features.items.record.desc') },
  { icon: RefreshCw, t: t('landing.features.items.modify.title'), d: t('landing.features.items.modify.desc') },
  { icon: UserPlus, t: t('landing.features.items.family.title'), d: t('landing.features.items.family.desc') },
  { icon: CalendarDays, t: t('landing.features.items.calendar.title'), d: t('landing.features.items.calendar.desc') },
  { icon: ListPlus, t: t('landing.features.items.queue.title'), d: t('landing.features.items.queue.desc') },
  { icon: Bell, t: t('landing.features.items.reminders.title'), d: t('landing.features.items.reminders.desc') },
  { icon: HeartPulse, t: t('landing.features.items.followup.title'), d: t('landing.features.items.followup.desc') },
  { icon: Stethoscope, t: t('landing.features.items.specialty.title'), d: t('landing.features.items.specialty.desc') },
  { icon: TrendingUp, t: t('landing.features.items.analytics.title'), d: t('landing.features.items.analytics.desc') },
  { icon: Users, t: t('landing.features.items.team.title'), d: t('landing.features.items.team.desc') },
];

const getPlans = (t: any) => [
  { name: "Starter", price: "49", tagline: t('landing.plans.starter.tagline'), features: [t('landing.plans.starter.f1'), t('landing.plans.starter.f2'), t('landing.plans.starter.f3'), t('landing.plans.starter.f4')], cta: t('landing.plans.starter.cta'), hi: false },
  { name: "Pro", price: "99", tagline: t('landing.plans.pro.tagline'), features: [t('landing.plans.pro.f1'), t('landing.plans.pro.f2'), t('landing.plans.pro.f3'), t('landing.plans.pro.f4'), t('landing.plans.pro.f5')], cta: t('landing.plans.pro.cta'), hi: true },
  { name: "Enterprise", price: "249", tagline: t('landing.plans.enterprise.tagline'), features: [t('landing.plans.enterprise.f1'), t('landing.plans.enterprise.f2'), t('landing.plans.enterprise.f3'), t('landing.plans.enterprise.f4'), t('landing.plans.enterprise.f5')], cta: t('landing.plans.enterprise.cta'), hi: false },
];

const reveal = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: 0.6 } } as const;

function Head({ k, title, sub }: { k: string; title: string; sub?: string }) {
  return (
    <div className="mb-14 max-w-3xl" dir="auto">
      <p className="mb-3 text-sm font-medium text-teal-300">{k}</p>
      <h2 className="text-3xl font-semibold tracking-tight lg:text-5xl"><Reveal text={title} /></h2>
      {sub && <p className="mt-5 leading-relaxed text-slate-400">{sub}</p>}
    </div>
  );
}

/* ───────────────────────────── Page ───────────────────────────── */

function LandingPage() {

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [subForm, setSubForm] = useState({ name: "", email: "", phone: "", country: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [defaultCountry, setDefaultCountry] = useState<any>("TN");
  const { t, i18n } = useTranslation();
  const { setLanguage } = useAppState();
  const countryLabels: Record<string, string> = i18n.language.startsWith('fr') ? fr : (i18n.language.startsWith('ar') ? ar : en);

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data.country_code) {
          setDefaultCountry(data.country_code);
          setSubForm(prev => ({ ...prev, country: data.country_code }));
          
          if (!localStorage.getItem("medical_ai_lang")) {
            const country = data.country_code;
            const region = data.region || "";
            const city = data.city || "";
            
            const arabicCountries = ["SA", "AE", "QA", "KW", "BH", "OM", "LY", "IQ", "SY", "JO", "LB", "PS", "YE", "EG", "SD"];
            const frenchCountries = ["TN", "DZ", "MA", "MR", "SN", "CI", "ML", "NE", "BF", "TG", "BJ", "GN", "GA", "CG", "CD", "CM", "CF", "MG", "TD", "BI", "RW", "FR", "BE", "CH", "LU", "MC", "HT"];
            
            let matchedLang = "en"; // Default to English for US, UK, AU, and others
            
            if (arabicCountries.includes(country)) {
              matchedLang = "ar";
            } else if (frenchCountries.includes(country)) {
              matchedLang = "fr";
            } else if (country === "CA" && (region.toLowerCase().includes("quebec") || city.toLowerCase().includes("montreal"))) {
              matchedLang = "fr"; // French specifically for Quebec/Montreal
            }
            
            setLanguage(matchedLang as any);
          }
        }
      })
      .catch(console.error);
  }, [i18n]);
  const countriesList = getCountries().map(c => ({ value: c, label: countryLabels[c] || c })).sort((a,b) => a.label.localeCompare(b.label));

  const [openCountry, setOpenCountry] = useState(false);
  


  const handleSubscriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const apiUrl = import.meta.env['VITE_API_URL'] || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/api/v1/subscriptions/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...subForm, plan: selectedPlan }),
      });
      if (res.ok) {
        toast.success(t("landing.footer.subSuccess"));
        setSelectedPlan(null);
        setSubForm({ name: "", email: "", phone: "", country: "", message: "" });
      } else {
        toast.error(t("landing.footer.subError"));
      }
    } catch (err) {
      toast.error(t("landing.footer.subError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const FEATURES = getFeatures(t);
  const PLANS = getPlans(t);
  const MARQUEE = getMarquee(t);
  const { scrollYProgress } = useScroll();
  const heroO = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.12], [0, 50]);
  const reduce = useReducedMotion();
  const [menu, setMenu] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#04070a] text-slate-50 selection:bg-teal-400/30" style={{ fontFamily: "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif" }}>
      <style>{`
        @keyframes mq{to{transform:translateX(-33.333%)}} .mq{animation:mq 36s linear infinite}
        @media (prefers-reduced-motion:reduce){.mq{animation:none}}`}</style>

      <ScrollECG />

      {/* Aurore */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <motion.div className="absolute -left-[10%] -top-[15%] h-[55%] w-[55%] rounded-full bg-teal-500/15 blur-[80px] md:blur-[130px]" animate={reduce ? { x: 0, y: 0 } : { x: [0, 80, 0], y: [0, 40, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute -bottom-[15%] -right-[10%] h-[55%] w-[55%] rounded-full bg-rose-500/10 blur-[80px] md:blur-[130px]" animate={reduce ? { x: 0, y: 0 } : { x: [0, -80, 0], y: [0, -40, 0] }} transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }} />
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(ellipse at 50% 20%,#000,transparent 70%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 20%,#000,transparent 70%)" }} />
      </div>

      {/* Navigation */}
      <nav className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur-xl" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src="/logo-dark.png" alt="Sanovia AI Logo" className="h-8 w-auto" fetchPriority="high" loading="eager" />
          </div>
          <div className="hidden gap-8 text-sm text-slate-400 md:flex">
            <a href="#fonctionnalites" className="transition-colors hover:text-white">{t("nav.features")}</a>
            <Link to="/assistant-whatsapp" preload="intent" className="transition-colors hover:text-white">
              {i18n.language.startsWith('ar') ? 'مساعد واتساب' : i18n.language.startsWith('en') ? 'WhatsApp Assistant' : 'Assistant WhatsApp'}
            </Link>
            <Link to="/securite" preload="intent" className="transition-colors hover:text-white">{t("nav.security")}</Link>
            <a href="#tarifs" className="transition-colors hover:text-white">{t("nav.pricing")}</a>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
                  <Globe className="size-4 shrink-0" />
                  {i18n.language?.startsWith('en') ? 'English' : i18n.language?.startsWith('ar') ? 'العربية' : 'Français'}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 border-white/10 bg-black/90 text-slate-200 backdrop-blur-xl">
                {(
                  [
                    ["fr", "Français"],
                    ["en", "English"],
                    ["ar", "العربية"],
                  ] as const
                ).map(([code, label]) => (
                  <DropdownMenuItem
                    key={code}
                    onClick={() => {
                      setLanguage(code as any);
                    }}
                    className={cn(
                      "cursor-pointer",
                      i18n.language?.startsWith(code) && "font-semibold text-teal-400 focus:text-teal-400"
                    )}
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/login" className="hidden sm:block"><Button variant="ghost" className="text-sm text-slate-300 hover:bg-white/5 hover:text-white">{t("nav.login")}</Button></Link>
            <Link to="/login" className="hidden sm:block"><Button className="rounded-full bg-teal-400 px-6 font-semibold text-black shadow-[0_0_24px_-6px_rgba(45,212,191,.7)] hover:bg-teal-300">{t("nav.start")} <ArrowRight className="ml-2 size-4" /></Button></Link>
            <button onClick={() => setMenu((v) => !v)} aria-label={menu ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={menu}
              className="flex size-10 items-center justify-center rounded-full border border-white/10 text-slate-200 md:hidden">
              {menu ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {menu && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-white/5 md:hidden">
              <div className="flex flex-col gap-1 px-4 py-3 text-base">
                {[["#fonctionnalites", "Fonctionnalités"], ["/assistant-whatsapp", "Assistant WhatsApp"], ["/securite", "Sécurité"], ["#tarifs", "Tarifs"]].map(([h, l]) => (
                  <a key={h} href={h} onClick={() => setMenu(false)} className="rounded-lg px-3 py-3 text-slate-300 hover:bg-white/5">{l}</a>
                ))}
                <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
                  <Link to="/login"><Button variant="outline" className="w-full rounded-full border-white/20 bg-transparent text-slate-200">{t("nav.login")}</Button></Link>
                  <Link to="/login"><Button className="w-full rounded-full bg-teal-400 font-semibold text-black hover:bg-teal-300">Démarrer</Button></Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="relative z-10">
        {/* Hero */}
        <section className="flex flex-col items-center px-6 pb-12 pt-32 text-center sm:pt-40 lg:pt-52">
          <motion.div style={{ opacity: heroO, y: heroY }} className="mx-auto max-w-5xl">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap justify-center gap-2">
              <Chip>{t("landing.hero.chip1")}</Chip>
              <Chip tone="rose">{t("landing.hero.chip2")}</Chip>
            </motion.div>
            <h1 className="mb-8 text-[clamp(2.5rem,11.5vw,6rem)] font-bold leading-[0.95] tracking-tighter">
              <span className="block"><Reveal text={t("landing.hero.title1")} /></span>
              <span className="block"><Reveal text={t("landing.hero.title2")} delay={0.18} /></span>
              <span className="block"><Reveal text={t("landing.hero.title3")} gradient delay={0.36} /></span>
            </h1>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-400 lg:text-xl">
              {t("landing.hero.subtitle")}
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/login"><Button className="h-14 rounded-full bg-teal-400 px-8 text-lg font-semibold text-black shadow-[0_0_40px_-10px_rgba(45,212,191,.7)] transition-transform hover:scale-105 hover:bg-teal-300">{t("landing.hero.cta1")}</Button></Link>
              <a href="#securite" className="group flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white">
                {t("landing.hero.cta2")}
                <span className="flex size-8 items-center justify-center rounded-full border border-white/15 transition-colors group-hover:border-teal-400/60 group-hover:bg-teal-400/10"><ArrowRight className="size-3.5" /></span>
              </a>
            </motion.div>
          </motion.div>
          <div className="mt-16 h-12 w-full max-w-4xl opacity-80"><Pulse className="h-full w-full" /></div>
        </section>

        {/* Marquee */}
        <section aria-hidden className="overflow-hidden border-y border-white/5 bg-black/30 py-6">
          <div className="mq flex whitespace-nowrap">
            {[...MARQUEE, ...MARQUEE, ...MARQUEE].map((w, i) => (
              <span key={i} className="mx-8 flex items-center gap-8 text-sm text-slate-500">{w}<span className="size-1 rounded-full bg-teal-500/50" /></span>
            ))}
          </div>
        </section>

        {/* Pipeline */}
        <section className="px-6 py-28">
          <div className="mx-auto max-w-6xl">
            <Head k={t("landing.pipeline.kicker")} title={t("landing.pipeline.title")} sub={t("landing.pipeline.subtitle")} />
            <motion.div {...reveal}><Tilt className="p-4 sm:p-6 lg:p-10"><Pipeline /></Tilt></motion.div>
          </div>
        </section>

        {/* Fonctionnalités */}
        <section id="fonctionnalites" className="px-6 py-28">
          <div className="mx-auto max-w-6xl">
            <Head k={t("landing.features.kicker")} title={t("landing.features.title")} sub={t("landing.features.subtitle")} />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <motion.div key={f.t} {...reveal} transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}>
                  <Tilt className="h-full p-7">
                    <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-teal-400/10"><f.icon className="size-6 text-teal-300" /></div>
                    <h3 className="mb-2 text-lg font-semibold">{f.t}</h3>
                    <p className="text-sm leading-relaxed text-slate-400">{f.d}</p>
                  </Tilt>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Sécurité */}
        <section id="securite" className="border-y border-white/5 bg-white/[0.02] px-6 py-28">
          <div className="mx-auto max-w-6xl">
            <Head k={t("landing.security.kicker")} title={t("landing.security.title")} sub={t("landing.security.subtitle")} />
            <SecurityOrbit />
            
            <div className="mt-20 grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8 transition-colors hover:bg-white/[0.04]">
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-teal-500/10"><MapPin className="size-6 text-teal-400" /></div>
                <h3 className="mb-3 text-xl font-semibold text-white">{t("landing.compliance.rgpd.title")}</h3>
                <ul className="space-y-3 text-sm text-slate-400">
                  <li className="flex gap-3"><CheckCircle2 className="size-5 shrink-0 text-teal-400" /><span><strong>{t("landing.compliance.rgpd.i1.strong")}</strong> {t("landing.compliance.rgpd.i1.text")}</span></li>
                  <li className="flex gap-3"><CheckCircle2 className="size-5 shrink-0 text-teal-400" /><span><strong>{t("landing.compliance.rgpd.i2.strong")}</strong> {t("landing.compliance.rgpd.i2.text")}</span></li>
                  <li className="flex gap-3"><CheckCircle2 className="size-5 shrink-0 text-teal-400" /><span><strong>{t("landing.compliance.rgpd.i3.strong")}</strong> {t("landing.compliance.rgpd.i3.text")}</span></li>
                  <li className="flex gap-3"><CheckCircle2 className="size-5 shrink-0 text-teal-400" /><span><strong>{t("landing.compliance.rgpd.i4.strong")}</strong> {t("landing.compliance.rgpd.i4.text")}</span></li>
                </ul>
              </div>

              <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8 transition-colors hover:bg-white/[0.04]">
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-rose-500/10"><Globe className="size-6 text-rose-400" /></div>
                <h3 className="mb-3 text-xl font-semibold text-white">{t("landing.compliance.na.title")}</h3>
                <ul className="space-y-3 text-sm text-slate-400">
                  <li className="flex gap-3"><CheckCircle2 className="size-5 shrink-0 text-teal-400" /><span><strong>{t("landing.compliance.na.i1.strong")}</strong> {t("landing.compliance.na.i1.text")}</span></li>
                  <li className="flex gap-3"><CheckCircle2 className="size-5 shrink-0 text-teal-400" /><span><strong>{t("landing.compliance.na.i2.strong")}</strong> {t("landing.compliance.na.i2.text")}</span></li>
                  <li className="flex gap-3"><CheckCircle2 className="size-5 shrink-0 text-teal-400" /><span><strong>{t("landing.compliance.na.i3.strong")}</strong> {t("landing.compliance.na.i3.text")}</span></li>
                  <li className="flex gap-3"><CheckCircle2 className="size-5 shrink-0 text-teal-400" /><span><strong>{t("landing.compliance.na.i4.strong")}</strong> {t("landing.compliance.na.i4.text")}</span></li>
                </ul>
              </div>
            </div>

            <p className="mt-14 max-w-3xl text-xs leading-relaxed text-slate-500">
              {t("landing.security.disclaimer")}
            </p>
          </div>
        </section>

        {/* Dossier patient */}
        <section className="px-6 py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
            <div>
              <Head k={t("landing.patient_record.kicker")} title={t("landing.patient_record.title")} sub={t("landing.patient_record.subtitle")} />
              <ul className="space-y-4 text-sm text-slate-300">
                {[t("landing.patient_record.bullets.0"), t("landing.patient_record.bullets.1"), t("landing.patient_record.bullets.2"), t("landing.patient_record.bullets.3")].map((bullet) => (
                  <li key={bullet} className="flex items-center gap-3"><CheckCircle2 className="size-4 shrink-0 text-teal-400" />{bullet}</li>
                ))}
              </ul>
            </div>
            <motion.div {...reveal}>
              <Tilt className="p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-semibold">{t("landing.patient_record.demo.title")}</span>
                  <span className="text-xs text-slate-500">{t("landing.patient_record.demo.subtitle")}</span>
                </div>
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 p-3 sm:p-4"><div className="text-xs text-slate-400">{t("landing.patient_record.demo.bp")}</div><div className="mt-1 text-2xl font-semibold tabular-nums sm:text-3xl">128<span className="text-slate-500">/</span>82</div><div className="text-xs text-amber-300">{t("landing.patient_record.demo.bp_status")}</div></div>
                  <div className="rounded-2xl border border-white/10 p-3 sm:p-4"><div className="text-xs text-slate-400">{t("landing.patient_record.demo.hr")}</div><div className="mt-1 text-2xl font-semibold tabular-nums sm:text-3xl">72 <span className="text-sm text-slate-500">bpm</span></div><div className="text-xs text-emerald-300">{t("landing.patient_record.demo.hr_status")}</div></div>
                </div>
                <div className="h-16"><Pulse className="h-full w-full" /></div>
              </Tilt>
            </motion.div>
          </div>
        </section>

        {/* Tarifs */}
        <section id="tarifs" className="border-t border-white/5 bg-black/20 px-6 py-28">
          <div className="mx-auto max-w-5xl">
            <Head k={t("nav.pricing")} title={t("landing.pricing.title")} sub={t("landing.pricing.subtitle")} />
            <div className="grid items-center gap-8 lg:grid-cols-3 lg:gap-6">
              {PLANS.map((p, i) => (
                <motion.div key={p.name} {...reveal} transition={{ delay: i * 0.1, duration: 0.5 }} className={`mx-auto w-full max-w-md lg:max-w-none ${p.hi ? "lg:-translate-y-4" : ""}`}>
                  <Tilt className={`p-6 sm:p-8 ${p.hi ? "border-teal-400/50 shadow-2xl shadow-teal-500/10" : ""}`}>
                    {p.hi && <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-teal-400 px-3 py-1 text-xs font-bold text-black"><Star className="size-3" /> {t("landing.plans.popular") || "Populaire"}</span>}
                    <h3 className={`text-lg font-medium ${p.hi ? "text-teal-300" : "text-slate-300"}`}>{p.name}</h3>
                    <div className="mt-4 flex items-baseline text-5xl font-extrabold tabular-nums">{p.price}<span className="ml-1 text-xl font-medium text-slate-500">TND</span><span className="ml-1 text-sm font-normal text-slate-500">/mois</span></div>
                    <p className="mt-4 text-sm text-slate-400">{p.tagline}</p>
                    <ul className="mt-8 space-y-3.5">
                      {p.features.map((f) => <li key={f} className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className={`size-4 ${p.hi ? "text-teal-400" : "text-slate-500"}`} />{f}</li>)}
                    </ul>
                    {p.hi ? (
                      <Button onClick={() => setSelectedPlan(p.name)} className="mt-8 w-full rounded-full bg-teal-400 font-bold text-black hover:bg-teal-300">{p.cta}</Button>
                    ) : (
                      <Button onClick={() => setSelectedPlan(p.name)} variant="outline" className="mt-8 w-full rounded-full border-white/20 bg-transparent text-slate-200 hover:bg-white/10">{p.cta}</Button>
                    )}
                  </Tilt>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="relative overflow-hidden px-6 py-32">
          <div className="absolute inset-0 flex items-center justify-center opacity-20"><Pulse className="h-24 w-full max-w-3xl" /></div>
          <motion.div {...reveal} className="relative mx-auto max-w-2xl text-center">
            <h2 className="mb-8 text-4xl font-bold tracking-tighter lg:text-6xl"><Reveal text={t("landing.cta.title")} /></h2>
            <Link to="/login"><Button className="h-14 rounded-full bg-teal-400 px-10 text-lg font-semibold text-black shadow-[0_0_40px_-10px_rgba(45,212,191,.7)] transition-transform hover:scale-105 hover:bg-teal-300">{t("nav.start")} {t("landing.cta.now")} <TrendingUp className="ml-2 size-4" /></Button></Link>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-black/40 px-6 pb-8 pt-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-10 pb-10 md:flex-row">
            <div className="max-w-xs">
              <div className="mb-4 flex items-center gap-2.5"><Activity className="size-5 text-teal-400" /><span className="text-xl font-bold">Docteur<span className="text-teal-400">Rendezvous</span></span></div>
              <p className="text-sm leading-relaxed text-slate-500">{t("landing.footer.desc")}</p>
            </div>
            <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-4">
              <div><div className="mb-4 font-medium text-slate-300">{t("landing.footer.product")}</div><ul className="space-y-3 text-slate-500"><li><a href="#fonctionnalites" className="hover:text-white">{t("nav.features")}</a></li><li><a href="#tarifs" className="hover:text-white">{t("nav.pricing")}</a></li><li className="cursor-pointer hover:text-white">{t("landing.footer.demo")}</li></ul></div>
              <div>
                <div className="mb-4 font-medium text-slate-300">
                  {i18n.language.startsWith('ar') ? 'التخصصات' : i18n.language.startsWith('en') ? 'Specialties' : 'Spécialités'}
                </div>
                <ul className="space-y-3 text-slate-500">
                  <li><a href="/solutions/dentistes" className="hover:text-white">{i18n.language.startsWith('ar') ? 'أطباء الأسنان' : i18n.language.startsWith('en') ? 'Dentists' : 'Dentistes'}</a></li>
                  <li><a href="/solutions/pediatrie" className="hover:text-white">{i18n.language.startsWith('ar') ? 'طب الأطفال' : i18n.language.startsWith('en') ? 'Pediatrics' : 'Pédiatrie'}</a></li>
                  <li><a href="/solutions/cardiologie" className="hover:text-white">{i18n.language.startsWith('ar') ? 'أمراض القلب' : i18n.language.startsWith('en') ? 'Cardiology' : 'Cardiologie'}</a></li>
                  <li><a href="/solutions/esthetique" className="hover:text-white">{i18n.language.startsWith('ar') ? 'الطب التجميلي والجلدية' : i18n.language.startsWith('en') ? 'Aesthetics & Derma' : 'Esthétique & Derma'}</a></li>
                  <li><a href="/solutions/gynecologie" className="hover:text-white">{i18n.language.startsWith('ar') ? 'أمراض النساء' : i18n.language.startsWith('en') ? 'Gynecology' : 'Gynécologie'}</a></li>
                  <li><a href="/solutions/ophtalmologie" className="hover:text-white">{i18n.language.startsWith('ar') ? 'طب العيون' : i18n.language.startsWith('en') ? 'Ophthalmology' : 'Ophtalmologie'}</a></li>
                </ul>
              </div>
              <div><div className="mb-4 font-medium text-slate-300">{t("landing.footer.company")}</div><ul className="space-y-3 text-slate-500"><li className="cursor-pointer hover:text-white">{t("landing.footer.about")}</li><li className="cursor-pointer hover:text-white">{t("landing.footer.contact")}</li></ul></div>
              <div><div className="mb-4 font-medium text-slate-300">{t("landing.footer.legal")}</div><ul className="space-y-3 text-slate-500"><li><a href="#securite" className="hover:text-white">{t("landing.footer.security_privacy")}</a></li><li className="cursor-pointer hover:text-white">{t("landing.footer.terms")}</li></ul></div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-center text-sm text-slate-500 md:flex-row">
            <span>{t("landing.footer.copyright")}</span>
            <span>{t("landing.footer.country") || "Tunisie 🇹🇳"}</span>
          </div>
        </div>
      </footer>
      {/* Subscription Modal */}
        <Dialog open={!!selectedPlan} onOpenChange={(o) => !o && setSelectedPlan(null)}>
          <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>{t("landing.footer.subModalTitle")}</DialogTitle>
              <DialogDescription className="text-slate-400">
                {t("landing.footer.subModalDesc")} <strong className="text-white">{selectedPlan}</strong>{t("landing.footer.subModalDesc2")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubscriptionSubmit} className="space-y-4 mt-4 text-slate-200">
              <div className="space-y-2">
                <Label htmlFor="name">{t("landing.footer.subName")}</Label>
                <Input id="name" required value={subForm.name} onChange={(e) => setSubForm({...subForm, name: e.target.value})} placeholder={t("landing.footer.subNamePlaceholder")} className="bg-slate-800 border-white/10" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("landing.footer.subEmail")}</Label>
                  <Input id="email" type="email" required value={subForm.email} onChange={(e) => setSubForm({...subForm, email: e.target.value})} placeholder={t("landing.footer.subEmailPlaceholder")} className="bg-slate-800 border-white/10" />
                </div>
                <div className="space-y-2 flex flex-col">
                  <Label htmlFor="phone">{t("landing.footer.subPhone")}</Label>
                  <PhoneInput
                    id="phone"
                    value={subForm.phone}
                    onChange={(val) => setSubForm({...subForm, phone: val || ""})}
                    placeholder={t("landing.footer.subPhonePlaceholder")}
                    defaultCountry={defaultCountry}
                    className="flex h-10 w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="space-y-2 flex flex-col">
                <Label>{t("landing.footer.subCountry")}</Label>
                <Popover open={openCountry} onOpenChange={setOpenCountry}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCountry}
                      className="w-full justify-between bg-slate-800 border-white/10 text-white font-normal hover:bg-slate-700 hover:text-white"
                    >
                      {subForm.country
                        ? countriesList.find((c: any) => c.value === subForm.country)?.label
                        : t("landing.footer.subCountrySearch")}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0 bg-slate-800 border-white/10">
                    <Command className="bg-slate-800 text-white">
                      <CommandInput placeholder={t("landing.footer.subCountrySearch")} className="text-white placeholder:text-slate-400 border-none outline-none" />
                      <CommandList>
                        <CommandEmpty>{t("landing.footer.subCountryEmpty")}</CommandEmpty>
                        <CommandGroup>
                          {countriesList.map((country: any) => (
                            <CommandItem
                              key={country.value}
                              value={country.label}
                              onSelect={() => {
                                setSubForm({...subForm, country: country.value});
                                setOpenCountry(false);
                              }}
                              className="text-white hover:bg-slate-700 cursor-pointer"
                            >
                              <CheckCircle2
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  subForm.country === country.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {country.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">{t("landing.footer.subMessage")}</Label>
                <Textarea id="message" value={subForm.message} onChange={(e) => setSubForm({...subForm, message: e.target.value})} placeholder={t("landing.footer.subMessagePlaceholder")} rows={3} className="bg-slate-800 border-white/10" />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setSelectedPlan(null)} className="border-white/10 hover:bg-slate-800 text-slate-300">{t("landing.footer.subCancel")}</Button>
                <Button type="submit" disabled={isSubmitting} className="bg-teal-500 text-black hover:bg-teal-400">{isSubmitting ? t("landing.footer.subSubmitting") : t("landing.footer.subSubmit")}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
    </div>
  );
}
