import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Language, translations, Translations } from "@/lib/i18n";

interface AppState {
  notifications: [];
  markAllNotificationsRead: () => void;
  unreadNotifications: number;
  language: Language;
  setLanguage: (l: Language) => void;
  t: Translations;
  isRTL: boolean;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("medical_ai_lang");
        if (saved === "fr" || saved === "en" || saved === "ar") {
          return saved;
        }
      } catch {
        // Fallback for SSR or sandboxed environments
      }
    }
    return "fr";
  });

  const setLanguage = (l: Language) => {
    setLanguageState(l);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("medical_ai_lang", l);
      } catch {
        // Ignore in SSR
      }
    }
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
      if (language === "ar") {
        document.documentElement.dir = "rtl";
      } else {
        document.documentElement.dir = "ltr";
      }
    }
  }, [language]);

  const t = useMemo(() => translations[language] || translations.fr, [language]);
  const isRTL = language === "ar";

  const value = useMemo<AppState>(
    () => ({
      notifications: [],
      markAllNotificationsRead: () => undefined,
      unreadNotifications: 0,
      language,
      setLanguage,
      t,
      isRTL,
    }),
    [language, t, isRTL],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}
