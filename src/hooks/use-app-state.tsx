import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Language, translations, Translations } from "@/lib/i18n";
import i18n from "@/i18n";

export type Notification = {
  id: string;
  title: string;
  detail?: string;
  time: string;
  read: boolean;

  link?: string;
};

interface AppState {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, "id" | "read">) => void;
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
        i18n.changeLanguage(l);
      } catch {
        // Ignore in SSR
      }
    }
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
      document.documentElement.dir = "ltr";
    }
  }, [language]);

  const t = useMemo(() => translations[language] || translations.fr, [language]);
  const isRTL = language === "ar";

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadNotifications = notifications.filter(n => !n.read).length;

  const addNotification = (n: Omit<Notification, "id" | "read">) => {
    setNotifications(prev => [{ ...n, id: crypto.randomUUID(), read: false }, ...prev]);
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const value = useMemo<AppState>(
    () => ({
      notifications,
      addNotification,
      markAllNotificationsRead,
      unreadNotifications,
      language,
      setLanguage,
      t,
      isRTL,
    }),
    [notifications, unreadNotifications, language, t, isRTL],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}
