import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Shield, Lock, Server, FileDigit, Database, AlertTriangle, Key, Repeat, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute('/securite')({
  component: SecuritePage,
  head: () => ({
    meta: [
      { title: "Sécurité et confidentialité des données médicales | Sanovia AI" },
      { name: "description", content: "Découvrez comment Sanovia AI protège les données des cabinets médicaux avec une architecture SaaS sécurisée, isolée et chiffrée." },
    ],
  }),
});

function SecuritePage() {
  const { t, i18n } = useTranslation();

  const setLanguage = (code: string) => {
    i18n.changeLanguage(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem("medical_ai_lang", code);
      document.documentElement.lang = code;
    }
  };

  const securityFeatures = [
    {
      icon: <Server className="size-6 text-teal-400" />,
      title: t("securityPage.feat1Title"),
      description: t("securityPage.feat1Desc")
    },
    {
      icon: <Key className="size-6 text-rose-400" />,
      title: t("securityPage.feat2Title"),
      description: t("securityPage.feat2Desc")
    },
    {
      icon: <Lock className="size-6 text-emerald-400" />,
      title: t("securityPage.feat3Title"),
      description: t("securityPage.feat3Desc")
    },
    {
      icon: <FileDigit className="size-6 text-blue-400" />,
      title: t("securityPage.feat4Title"),
      description: t("securityPage.feat4Desc")
    },
    {
      icon: <Repeat className="size-6 text-purple-400" />,
      title: t("securityPage.feat5Title"),
      description: t("securityPage.feat5Desc")
    },
    {
      icon: <Database className="size-6 text-orange-400" />,
      title: t("securityPage.feat6Title"),
      description: t("securityPage.feat6Desc")
    },
    {
      icon: <Search className="size-6 text-indigo-400" />,
      title: t("securityPage.feat7Title"),
      description: t("securityPage.feat7Desc")
    },
    {
      icon: <AlertTriangle className="size-6 text-red-400" />,
      title: t("securityPage.feat8Title"),
      description: t("securityPage.feat8Desc")
    }
  ];

  const dependencies = [
    { name: t("securityPage.dep1Name"), desc: t("securityPage.dep1Desc") },
    { name: t("securityPage.dep2Name"), desc: t("securityPage.dep2Desc") },
    { name: t("securityPage.dep3Name"), desc: t("securityPage.dep3Desc") }
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#04070a] text-slate-50 selection:bg-teal-400/30 font-sans" dir={i18n.language?.startsWith('ar') ? 'rtl' : 'ltr'}>
      
      {/* Navigation (Simplified for marketing page) */}
      <nav className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-dark.png" alt="Sanovia AI Logo" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex gap-2 text-sm text-slate-400">
              <button onClick={() => setLanguage('fr')} className={i18n.language?.startsWith('fr') ? "text-white" : "hover:text-slate-300"}>FR</button>
              <span>|</span>
              <button onClick={() => setLanguage('en')} className={i18n.language?.startsWith('en') ? "text-white" : "hover:text-slate-300"}>EN</button>
              <span>|</span>
              <button onClick={() => setLanguage('ar')} className={i18n.language?.startsWith('ar') ? "text-white" : "hover:text-slate-300"}>AR</button>
            </div>
            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white hidden sm:block">
              {t("nav.login", "Connexion")}
            </Link>
            <Button asChild className="rounded-full bg-teal-400 text-black hover:bg-teal-300">
              <Link to="/login">{t("nav.start", "Démarrer")}</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-sm text-teal-300 mb-6">
                <Shield className="size-4" />
                {t("securityPage.badge")}
              </span>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
                {t("securityPage.title")}
              </h1>
              <p className="text-lg text-slate-400 leading-relaxed">
                {t("securityPage.subtitle")}
              </p>
            </motion.div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
            {securityFeatures.map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-colors"
              >
                <div className="mb-4 inline-flex rounded-xl bg-white/5 p-3">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Data Location & Architecture */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <h2 className="text-3xl font-bold mb-6">{t("securityPage.depsTitle")}</h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                {t("securityPage.depsSubtitle")}
              </p>
              
              <ul className="space-y-6">
                {dependencies.map((dep, idx) => (
                  <li key={idx} className="flex items-start gap-4">
                    <div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-teal-400">
                      <div className="size-2 rounded-full bg-teal-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{dep.name}</h4>
                      <p className="text-sm text-slate-400 mt-1">{dep.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/20 to-rose-500/20 blur-3xl" />
              <div className="relative rounded-2xl border border-white/10 bg-black/50 p-8 backdrop-blur-xl">
                <MapPin className="size-12 text-slate-300 mb-6" />
                <h3 className="text-xl font-semibold mb-4">{t("securityPage.storageTitle")}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  {t("securityPage.storageDesc")}
                </p>
                <div className="rounded-lg bg-white/5 p-4 border border-white/10">
                  <p className="text-xs text-slate-300 font-mono">
                    {t("securityPage.storageNotice")}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <img src="/logo-dark.png" alt="Sanovia AI Logo" className="mx-auto h-8 w-auto mb-6 opacity-50 grayscale" />
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Sanovia AI. Tous droits réservés. <br/> {t("securityPage.footer")}
          </p>
        </div>
      </footer>
    </div>
  );
}
