import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Activity, Smile, Syringe, Users, CalendarClock, Bot, ShieldCheck } from 'lucide-react';
import React from 'react';

export const Route = createFileRoute('/solutions/$specialty')({
  component: SolutionsPage,
});

const specialtiesData: Record<string, any> = {
  "dentistes": {
    icon: <Smile className="size-8 text-teal-400" />,
    fr: {
      title: "L'Assistant IA et Logiciel Métier pour Cabinets Dentaires",
      subtitle: "Schéma dentaire interactif, gestion des urgences dentaires, automatisez vos rappels de détartrage et envoyez des ordonnances via WhatsApp.",
      benefits: [
        "Schéma dentaire interactif (Dental Charting) complet avec historique des soins",
        "Prise de RDV spécifique (Urgence, Détartrage, Extraction)",
        "Génération et envoi d'ordonnances directement sur WhatsApp"
      ]
    },
    en: {
      title: "AI Assistant and Practice Management for Dental Clinics",
      subtitle: "Interactive dental charting, dental emergency management, automated scaling reminders, and WhatsApp prescriptions.",
      benefits: [
        "Complete interactive Dental Charting with treatment history",
        "Specific appointment booking (Emergency, Scaling, Extraction)",
        "Generate and send prescriptions directly on WhatsApp"
      ]
    },
    ar: {
      title: "المساعد الذكي وبرنامج الإدارة لعيادات الأسنان",
      subtitle: "مخطط أسنان تفاعلي، إدارة طوارئ الأسنان، أتمتة تذكيرات تنظيف الجير، وإرسال الوصفات الطبية عبر واتساب.",
      benefits: [
        "مخطط أسنان تفاعلي بالكامل (Dental Charting) مع سجل العلاج",
        "حجز مواعيد مخصصة (طوارئ، تنظيف جير، خلع)",
        "إنشاء وإرسال الوصفات الطبية مباشرة عبر واتساب"
      ]
    }
  },
  "esthetique": {
    icon: <Syringe className="size-8 text-rose-400" />,
    fr: {
      title: "Sanovia AI pour les Cliniques Esthétiques et Dermatologie",
      subtitle: "Dossier dermatologique visuel, suivi avant/après, qualification des besoins et envoi de devis automatisé.",
      benefits: [
        "Cartographie cutanée (Derma Chart) et historique visuel des interventions",
        "Qualification du besoin (Botox, Acide Hyaluronique, Laser)",
        "Suivi post-injection ultra-personnalisé via WhatsApp"
      ]
    },
    en: {
      title: "Sanovia AI for Aesthetic Clinics and Dermatology",
      subtitle: "Visual dermatological records, before/after tracking, needs qualification, and automated quotes.",
      benefits: [
        "Skin mapping (Derma Chart) and visual intervention history",
        "Needs qualification (Botox, Hyaluronic Acid, Laser)",
        "Ultra-personalized post-injection follow-up via WhatsApp"
      ]
    },
    ar: {
      title: "Sanovia AI لعيادات التجميل والأمراض الجلدية",
      subtitle: "سجل جلدي مرئي، تتبع قبل/بعد، تصنيف الاحتياجات، وإرسال عروض الأسعار تلقائياً.",
      benefits: [
        "تخطيط الجلد (Derma Chart) وسجل مرئي للتدخلات",
        "تصنيف الاحتياجات (بوتوكس، حمض الهيالورونيك، ليزر)",
        "متابعة شخصية فائقة بعد الحقن عبر واتساب"
      ]
    }
  },
  "generalistes": {
    icon: <Activity className="size-8 text-blue-400" />,
    fr: {
      title: "La solution ultime pour la Médecine Générale",
      subtitle: "Dossier médical patient (DMP), triage intelligent des urgences vitales et générateur d'ordonnances intégré.",
      benefits: [
        "Dossier médical complet avec historique des consultations",
        "Triage des urgences avec redirection vers le 15 si nécessaire",
        "Générateur d'ordonnances et envoi sécurisé PDF sur WhatsApp"
      ]
    },
    en: {
      title: "The Ultimate Solution for General Practice",
      subtitle: "Electronic Health Records (EHR), smart vital emergency triage, and integrated prescription generator.",
      benefits: [
        "Complete medical record with consultation history",
        "Emergency triage with redirection to 911 if necessary",
        "Prescription generator with secure PDF delivery on WhatsApp"
      ]
    },
    ar: {
      title: "الحل الأمثل للطب العام",
      subtitle: "سجل طبي إلكتروني (EHR)، فرز ذكي لحالات الطوارئ، ومولد وصفات طبية متكامل.",
      benefits: [
        "سجل طبي كامل مع تاريخ الاستشارات",
        "فرز الحالات الطارئة مع توجيه للإسعاف إذا لزم الأمر",
        "مولد وصفات طبية مع إرسال آمن بصيغة PDF عبر واتساب"
      ]
    }
  },
  "pediatrie": {
    icon: <Smile className="size-8 text-yellow-400" />,
    fr: {
      title: "Suivi Pédiatrique Nouvelle Génération",
      subtitle: "Courbes de croissance interactives, calendrier vaccinal et accompagnement des parents sur WhatsApp.",
      benefits: [
        "Suivi des courbes de croissance (Pedia Chart) et comparaison des percentiles",
        "Rappels automatiques de vaccination (DTP, ROR, etc.)",
        "Ordonnances pédiatriques et conseils envoyés aux parents sur WhatsApp"
      ]
    },
    en: {
      title: "Next-Generation Pediatric Care",
      subtitle: "Interactive growth charts, vaccination schedules, and parent support on WhatsApp.",
      benefits: [
        "Growth chart tracking (Pedia Chart) and percentile comparison",
        "Automated vaccination reminders (DTP, MMR, etc.)",
        "Pediatric prescriptions and advice sent to parents on WhatsApp"
      ]
    },
    ar: {
      title: "الجيل الجديد من رعاية طب الأطفال",
      subtitle: "منحنيات نمو تفاعلية، جدول تطعيمات، ودعم للآباء عبر واتساب.",
      benefits: [
        "تتبع منحنيات النمو (Pedia Chart) ومقارنة النسب المئوية",
        "تذكيرات تلقائية بالتطعيمات (DTP، MMR، إلخ)",
        "إرسال وصفات طب الأطفال ونصائح للآباء عبر واتساب"
      ]
    }
  },
  "cardiologie": {
    icon: <Activity className="size-8 text-red-400" />,
    fr: {
      title: "Plateforme Spécialisée en Cardiologie",
      subtitle: "Suivi des constantes, monitoring de l'ECG et alertes intelligentes.",
      benefits: [
        "Dossier cardiologique spécifique (Cardio Chart) et suivi des constantes vitales",
        "Historique des ECG et des antécédents cardiovasculaires",
        "Prise de RDV pour tests d'effort et suivi post-infarctus"
      ]
    },
    en: {
      title: "Specialized Cardiology Platform",
      subtitle: "Vitals tracking, ECG monitoring, and smart alerts.",
      benefits: [
        "Specific cardiology record (Cardio Chart) and vitals tracking",
        "ECG history and cardiovascular backgrounds",
        "Appointment booking for stress tests and post-infarction follow-up"
      ]
    },
    ar: {
      title: "منصة متخصصة في أمراض القلب",
      subtitle: "تتبع العلامات الحيوية، مراقبة تخطيط القلب (ECG)، وتنبيهات ذكية.",
      benefits: [
        "سجل قلب مخصص (Cardio Chart) وتتبع العلامات الحيوية",
        "تاريخ تخطيط القلب والسوابق القلبية الوعائية",
        "حجز مواعيد لاختبارات الجهد والمتابعة بعد النوبات القلبية"
      ]
    }
  },
  "gynecologie": {
    icon: <Users className="size-8 text-pink-400" />,
    fr: {
      title: "Gestion complète pour la Gynécologie et l'Obstétrique",
      subtitle: "Suivi de grossesse, historique gynécologique et rappels de frottis.",
      benefits: [
        "Dossier gynécologique interactif (Gyneco Chart) pour le suivi de grossesse",
        "Relances automatiques pour frottis et mammographies",
        "Ordonnances et conseils prénataux envoyés discrètement sur WhatsApp"
      ]
    },
    en: {
      title: "Complete Management for Gynecology and Obstetrics",
      subtitle: "Pregnancy tracking, gynecological history, and smear test reminders.",
      benefits: [
        "Interactive gynecological record (Gyneco Chart) for pregnancy tracking",
        "Automated reminders for smear tests and mammograms",
        "Prescriptions and prenatal advice sent discreetly on WhatsApp"
      ]
    },
    ar: {
      title: "إدارة شاملة لطب النساء والتوليد",
      subtitle: "تتبع الحمل، التاريخ النسائي، وتذكيرات مسحات عنق الرحم.",
      benefits: [
        "سجل نسائي تفاعلي (Gyneco Chart) لتتبع الحمل",
        "تذكيرات تلقائية لمسحات عنق الرحم وتصوير الثدي",
        "وصفات طبية ونصائح ما قبل الولادة تُرسل بسرية عبر واتساب"
      ]
    }
  },
  "ophtalmologie": {
    icon: <Users className="size-8 text-cyan-400" />,
    fr: {
      title: "Logiciel Métier pour l'Ophtalmologie",
      subtitle: "Schéma oculaire, acuité visuelle et gestion fluide du parcours patient.",
      benefits: [
        "Cartographie oculaire (Ophtha Chart) et suivi de la myopie/presbytie",
        "Génération automatique des prescriptions de lunettes et lentilles",
        "Gestion optimisée de la salle d'attente (Orthoptiste -> Ophtalmologue)"
      ]
    },
    en: {
      title: "Practice Management Software for Ophthalmology",
      subtitle: "Ocular charting, visual acuity, and smooth patient journey management.",
      benefits: [
        "Ocular mapping (Ophtha Chart) and myopia/presbyopia tracking",
        "Automated generation of glasses and contact lens prescriptions",
        "Optimized waiting room management (Orthoptist -> Ophthalmologist)"
      ]
    },
    ar: {
      title: "برنامج إدارة لطب العيون",
      subtitle: "تخطيط العين، حدة البصر، وإدارة سلسة لرحلة المريض.",
      benefits: [
        "رسم خرائط العين (Ophtha Chart) وتتبع قصر/طول النظر",
        "إنشاء تلقائي لوصفات النظارات والعدسات اللاصقة",
        "إدارة محسنة لغرفة الانتظار (أخصائي بصريات -> طبيب عيون)"
      ]
    }
  }
};

function SolutionsPage() {
  const { specialty } = Route.useParams();
  const { t, i18n } = useTranslation();

  const setLanguage = (code: string) => {
    i18n.changeLanguage(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem("medical_ai_lang", code);
      document.documentElement.lang = code;
    }
  };

  const isRtl = i18n.language?.startsWith('ar');
  const langKey = i18n.language?.startsWith('ar') ? 'ar' : i18n.language?.startsWith('en') ? 'en' : 'fr';

  // Fallback to "generalistes" if the URL is invalid
  const data = specialtiesData[specialty as keyof typeof specialtiesData] || specialtiesData["generalistes"];
  const localizedData = data[langKey];

  // Update document title for SEO
  React.useEffect(() => {
    document.title = `${localizedData.title} | Sanovia AI`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", localizedData.subtitle);
    }
  }, [specialty, localizedData]);

  const uiTranslations: Record<string, any> = {
    fr: {
      specialtyLabel: "Spécialité",
      createClinic: "Créer mon cabinet",
      agendaTitle: "Agenda intelligent",
      agendaDesc: "Synchronisé en temps réel",
      botTitle: "Assistant Vocal & Texte",
      botDesc: "Comprend le contexte médical",
      securityTitle: "Données de santé chiffrées",
      securityDesc: "Conformité RGPD / HDS",
      navFeatures: "Fonctionnalités",
      navWhatsapp: "Assistant WhatsApp",
      navLogin: "Connexion"
    },
    en: {
      specialtyLabel: "Specialty",
      createClinic: "Create my clinic",
      agendaTitle: "Smart Calendar",
      agendaDesc: "Synchronized in real time",
      botTitle: "Voice & Text Assistant",
      botDesc: "Understands medical context",
      securityTitle: "Encrypted health data",
      securityDesc: "GDPR / HIPAA compliant",
      navFeatures: "Features",
      navWhatsapp: "WhatsApp Assistant",
      navLogin: "Login"
    },
    ar: {
      specialtyLabel: "التخصص",
      createClinic: "إنشاء عيادتي",
      agendaTitle: "أجندة ذكية",
      agendaDesc: "متزامنة في الوقت الفعلي",
      botTitle: "مساعد صوتي ونصي",
      botDesc: "يفهم السياق الطبي",
      securityTitle: "بيانات صحية مشفرة",
      securityDesc: "متوافق مع معايير الأمان",
      navFeatures: "المميزات",
      navWhatsapp: "مساعد واتساب",
      navLogin: "تسجيل الدخول"
    }
  };

  const ui = uiTranslations[langKey];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#04070a] text-slate-50 selection:bg-teal-400/30 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Navigation */}
      <nav className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/landing" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <img src="/logo-dark.png" alt="Sanovia AI Logo" className="h-7 w-auto" fetchPriority="high" loading="eager" />
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-300">
            <a href="/landing#fonctionnalites" className="hidden md:block hover:text-white transition-colors">
              {ui.navFeatures}
            </a>
            <Link to="/assistant-whatsapp" className="hidden sm:block hover:text-white transition-colors">
              {ui.navWhatsapp}
            </Link>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <button onClick={() => setLanguage('fr')} className={`transition-colors hover:text-white ${i18n.language === 'fr' ? 'text-teal-400' : ''}`}>FR</button>
            <button onClick={() => setLanguage('en')} className={`transition-colors hover:text-white ${i18n.language === 'en' ? 'text-teal-400' : ''}`}>EN</button>
            <button onClick={() => setLanguage('ar')} className={`transition-colors hover:text-white ${i18n.language === 'ar' ? 'text-teal-400' : ''}`}>عربي</button>
            <Link to="/login" className="ml-2 sm:ml-4 rounded-full bg-white px-4 py-1.5 text-black transition-transform hover:scale-105 active:scale-95">
              {ui.navLogin}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left Content */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-sm text-teal-300 mb-6">
                {data.icon}
                <span className="capitalize text-slate-300 ml-1">{ui.specialtyLabel} : {specialty}</span>
              </span>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
                {localizedData.title}
              </h1>
              <p className="text-lg text-slate-400 leading-relaxed mb-8">
                {localizedData.subtitle}
              </p>
              
              <ul className="space-y-4 mb-10">
                {localizedData.benefits.map((benefit: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="size-5 text-teal-400" />
                    {benefit}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-4">
                <Link to="/login" className="inline-flex h-12 items-center justify-center rounded-full bg-teal-500 px-8 text-sm font-semibold text-white transition-all hover:bg-teal-400 hover:shadow-[0_0_20px_rgba(45,212,191,0.4)]">
                  {ui.createClinic}
                </Link>
              </div>
            </motion.div>
            
            {/* Right Visual */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/20 to-blue-500/20 blur-3xl rounded-[3rem]" />
              <div className="relative rounded-[2rem] border border-white/10 bg-black/50 p-8 backdrop-blur-xl">
                
                <div className="flex items-center gap-4 mb-8">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-400">
                    <CalendarClock className="size-7" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{ui.agendaTitle}</h3>
                    <p className="text-sm text-slate-400">{ui.agendaDesc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-8">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400">
                    <Bot className="size-7" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{ui.botTitle}</h3>
                    <p className="text-sm text-slate-400">{ui.botDesc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400">
                    <ShieldCheck className="size-7" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{ui.securityTitle}</h3>
                    <p className="text-sm text-slate-400">{ui.securityDesc}</p>
                  </div>
                </div>

              </div>
            </motion.div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-black/40 px-6 pb-8 pt-16 mt-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-10 pb-10 md:flex-row">
            <div className="max-w-xs">
              <div className="mb-4 flex items-center gap-2.5">
                <Activity className="size-5 text-teal-400" />
                <span className="text-xl font-bold">Sanovia<span className="text-teal-400">AI</span></span>
              </div>
              <p className="text-sm leading-relaxed text-slate-500">{t("landing.footer.desc", { defaultValue: "L'assistant intelligent pour votre cabinet médical." })}</p>
            </div>
            <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-4">
              <div>
                <div className="mb-4 font-medium text-slate-300">{t("landing.footer.product", { defaultValue: "Produit" })}</div>
                <ul className="space-y-3 text-slate-500">
                  <li><a href="/landing#fonctionnalites" className="hover:text-white">{t("nav.features", { defaultValue: "Fonctionnalités" })}</a></li>
                  <li><a href="/landing#tarifs" className="hover:text-white">{t("nav.pricing", { defaultValue: "Tarifs" })}</a></li>
                </ul>
              </div>
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
              <div>
                <div className="mb-4 font-medium text-slate-300">{t("landing.footer.company", { defaultValue: "Entreprise" })}</div>
                <ul className="space-y-3 text-slate-500">
                  <li className="cursor-pointer hover:text-white">{t("landing.footer.about", { defaultValue: "À propos" })}</li>
                  <li className="cursor-pointer hover:text-white">{t("landing.footer.contact", { defaultValue: "Contact" })}</li>
                </ul>
              </div>
              <div>
                <div className="mb-4 font-medium text-slate-300">{t("landing.footer.legal", { defaultValue: "Légal" })}</div>
                <ul className="space-y-3 text-slate-500">
                  <li><a href="/securite" className="hover:text-white">{t("landing.footer.security_privacy", { defaultValue: "Sécurité & Confidentialité" })}</a></li>
                  <li className="cursor-pointer hover:text-white">{t("landing.footer.terms", { defaultValue: "CGU" })}</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-center text-sm text-slate-500 md:flex-row">
            <span>{t("landing.footer.copyright", { defaultValue: "© 2024 Sanovia AI. Tous droits réservés." })}</span>
            <span>{t("landing.footer.country") || "Tunisie 🇹🇳"}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
