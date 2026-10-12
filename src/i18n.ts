import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import { translations } from './lib/i18n';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: translations.fr },
      ar: { translation: translations.ar },
      en: { translation: translations.en },
    },
    fallbackLng: 'fr',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'medical_ai_lang',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false, // React already safe from XSS
    },
  });

// Update document lang attribute when language changes
i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
});

export default i18n;
