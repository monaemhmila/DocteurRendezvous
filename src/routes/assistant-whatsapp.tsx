import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { MessageCircle, Bot, CalendarClock, Zap, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import React, { useEffect } from 'react';

export const Route = createFileRoute('/assistant-whatsapp')({
  component: WaAssistantPage,
  head: () => ({
    meta: [
      { title: "Assistant WhatsApp Médical par IA | Sanovia AI" },
      { name: "description", content: "Automatisez la prise de rendez-vous et répondez aux patients 24/7 sur WhatsApp avec notre Assistant IA conversationnel connecté à votre secrétariat." },
    ],
  }),
});

function WaAssistantPage() {
  const { t, i18n } = useTranslation();

  const setLanguage = (code: string) => {
    i18n.changeLanguage(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem("medical_ai_lang", code);
      document.documentElement.lang = code;
    }
  };

  const isRtl = i18n.language?.startsWith('ar');

  const benefits = [
    {
      icon: <CalendarClock className="size-5" />,
      title: t("waAssistantPage.ben1Title", { defaultValue: "Prise de RDV 24/7" }),
      desc: t("waAssistantPage.ben1Desc", { defaultValue: "L'assistant identifie le besoin du patient et propose le créneau idéal directement dans la discussion." })
    },
    {
      icon: <Bot className="size-5" />,
      title: t("waAssistantPage.ben2Title", { defaultValue: "Triage intelligent" }),
      desc: t("waAssistantPage.ben2Desc", { defaultValue: "Filtre les urgences des simples questions administratives pour faire gagner du temps à votre secrétaire." })
    },
    {
      icon: <Zap className="size-5" />,
      title: t("waAssistantPage.ben3Title", { defaultValue: "Réduction des No-Shows" }),
      desc: t("waAssistantPage.ben3Desc", { defaultValue: "Relances automatiques sur WhatsApp avec possibilité de confirmer, reporter ou annuler en un clic." })
    },
    {
      icon: <ShieldCheck className="size-5" />,
      title: t("waAssistantPage.ben4Title", { defaultValue: "Confidentialité garantie" }),
      desc: t("waAssistantPage.ben4Desc", { defaultValue: "Communications chiffrées de bout en bout via l'API officielle de Meta. Zéro stockage externe des conversations." })
    }
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#04070a] text-slate-50 selection:bg-teal-400/30 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Navigation (Marketing simplified) */}
      <nav className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/landing" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <img src="/logo-dark.png" alt="Sanovia AI Logo" className="h-7 w-auto" />
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-300">
            <Link to="/securite" className="hidden sm:block hover:text-white transition-colors">
              {t("nav.securityAndAudit", { defaultValue: "Sécurité" })}
            </Link>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <button onClick={() => setLanguage('fr')} className={`transition-colors hover:text-white ${i18n.language === 'fr' ? 'text-teal-400' : ''}`}>FR</button>
            <button onClick={() => setLanguage('en')} className={`transition-colors hover:text-white ${i18n.language === 'en' ? 'text-teal-400' : ''}`}>EN</button>
            <button onClick={() => setLanguage('ar')} className={`transition-colors hover:text-white ${i18n.language === 'ar' ? 'text-teal-400' : ''}`}>عربي</button>
            <Link to="/login" className="ml-2 sm:ml-4 rounded-full bg-white px-4 py-1.5 text-black transition-transform hover:scale-105 active:scale-95">
              {t("securityPage.login", { defaultValue: "Connexion" })}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-sm text-teal-300 mb-6">
                <MessageCircle className="size-4" />
                {t("waAssistantPage.badge", { defaultValue: "Assistant Virtuel WhatsApp" })}
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
                {t("waAssistantPage.title", { defaultValue: "Déléguez votre ligne WhatsApp à l'Intelligence Artificielle." })}
              </h1>
              <p className="text-lg text-slate-400 leading-relaxed mb-8">
                {t("waAssistantPage.subtitle", { defaultValue: "Ne ratez plus aucun patient. Notre assistant qualifie la demande, consulte vos disponibilités et fixe le rendez-vous directement dans votre calendrier, de jour comme de nuit." })}
              </p>
              
              <ul className="space-y-4 mb-10">
                {["Répond en moins de 2 secondes", "Comprend le langage naturel (vocal et texte)", "Multilingue (Arabe, Français, Anglais)"].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="size-5 text-teal-400" />
                    {t(`waAssistantPage.heroList${idx + 1}`, { defaultValue: feature })}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-4">
                <Link to="/landing" className="inline-flex h-12 items-center justify-center rounded-full bg-teal-500 px-8 text-sm font-semibold text-white transition-all hover:bg-teal-400 hover:shadow-[0_0_20px_rgba(45,212,191,0.4)]">
                  {t("waAssistantPage.cta1", { defaultValue: "Essayer gratuitement" })}
                </Link>
              </div>
            </motion.div>
            
            {/* Phone Mockup Simulation */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="relative mx-auto w-full max-w-sm lg:max-w-none">
              <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/30 to-blue-500/30 blur-3xl rounded-full" />
              <div className="relative rounded-[2.5rem] border-[8px] border-slate-900 bg-black shadow-2xl overflow-hidden aspect-[9/19] max-w-[320px] mx-auto">
                <div className="absolute top-0 inset-x-0 h-6 bg-slate-900 rounded-b-xl w-32 mx-auto z-10" />
                
                {/* Chat UI */}
                <div className="h-full flex flex-col bg-[#0b141a]">
                  {/* WhatsApp Header */}
                  <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center">
                      <img src="/logo-dark.png" alt="Avatar" className="h-4" />
                    </div>
                    <div>
                      <div className="text-slate-100 font-semibold text-sm">Cabinet Médical</div>
                      <div className="text-slate-400 text-xs">Assistant IA en ligne</div>
                    </div>
                  </div>
                  
                  {/* Messages */}
                  <div className="flex-1 p-4 space-y-4 overflow-hidden relative">
                     <div className="absolute inset-0 opacity-5 bg-[url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-cover mix-blend-overlay"></div>
                     
                     <div className="relative max-w-[85%] rounded-lg bg-[#202c33] p-3 text-slate-200 text-sm shadow-sm rounded-tl-none self-start">
                        {t("waAssistantPage.chat1", { defaultValue: "Bonjour ! Je suis l'assistant du Dr. Martin. Comment puis-je vous aider aujourd'hui ?" })}
                        <span className="text-[10px] text-slate-500 block text-right mt-1">14:30</span>
                     </div>
                     
                     <div className="relative max-w-[85%] rounded-lg bg-[#005c4b] p-3 text-slate-200 text-sm shadow-sm rounded-tr-none self-end ml-auto">
                        {t("waAssistantPage.chat2", { defaultValue: "J'aimerais prendre un rendez-vous pour une consultation de contrôle." })}
                        <span className="text-[10px] text-teal-200/50 block text-right mt-1">14:31</span>
                     </div>
                     
                     <div className="relative max-w-[85%] rounded-lg bg-[#202c33] p-3 text-slate-200 text-sm shadow-sm rounded-tl-none self-start">
                        {t("waAssistantPage.chat3", { defaultValue: "Très bien ! Le Dr. Martin a de la disponibilité demain à 10h00 ou à 14h30. Quel horaire préférez-vous ?" })}
                        <span className="text-[10px] text-slate-500 block text-right mt-1">14:31</span>
                     </div>
                  </div>
                  
                  {/* Input area */}
                  <div className="bg-[#202c33] p-2 flex items-center gap-2">
                     <div className="flex-1 bg-[#2a3942] rounded-full h-10 px-4 flex items-center text-slate-400 text-sm">
                        Écrire un message...
                     </div>
                     <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center text-white">
                        <MessageCircle className="size-5" />
                     </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Benefits Grid */}
          <div className="mt-32">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold mb-4">{t("waAssistantPage.featuresTitle", { defaultValue: "Pourquoi nos clients adorent l'Assistant WhatsApp" })}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((feature, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-colors"
                >
                  <div className="mb-4 inline-flex rounded-xl bg-teal-500/10 p-3 text-teal-400">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 flex flex-col items-center">
          <img src="/logo-dark.png" alt="Sanovia AI Logo" className="h-8 w-auto mb-6 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all" />
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Sanovia AI. {t("securityPage.footer", { defaultValue: "Plateforme de gestion de cabinet médical." })}
          </p>
        </div>
      </footer>
    </div>
  );
}
