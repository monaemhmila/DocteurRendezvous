import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  conversations as seedConversations,
  notificationsSeed,
  openSlots as seedSlots,
} from "@/data/mock";
import type { Conversation, Message, Notification, OpenSlot } from "@/types";

interface AppState {
  aiGlobalActive: boolean;
  setAiGlobalActive: (v: boolean) => void;
  autoFill: boolean;
  setAutoFill: (v: boolean) => void;
  conversations: Conversation[];
  toggleConversationAi: (id: string) => void;
  sendMessage: (id: string, text: string, author?: Message["author"]) => void;
  markRead: (id: string) => void;
  slots: OpenSlot[];
  fillSlot: (slotId: string, patientId: string) => void;
  notifications: Notification[];
  markAllNotificationsRead: () => void;
  unreadNotifications: number;
  language: "fr" | "en" | "ar";
  setLanguage: (l: "fr" | "en" | "ar") => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [aiGlobalActive, setAiGlobalActive] = useState(true);
  const [autoFill, setAutoFill] = useState(false);
  const [language, setLanguage] = useState<"fr" | "en" | "ar">("fr");
  const [conversations, setConversations] = useState<Conversation[]>(seedConversations);
  const [slots, setSlots] = useState<OpenSlot[]>(seedSlots);
  const [notifications, setNotifications] = useState<Notification[]>(notificationsSeed);

  const toggleConversationAi = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, aiActive: !c.aiActive } : c)),
    );
  }, []);

  const sendMessage = useCallback(
    (id: string, text: string, author: Message["author"] = "staff") => {
      const time = new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                updatedAt: "à l'instant",
                messages: [
                  ...c.messages,
                  { id: `${c.id}m${c.messages.length + 1}`, author, text, time },
                ],
              }
            : c,
        ),
      );
    },
    [],
  );

  const markRead = useCallback((id: string) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
  }, []);

  const fillSlot = useCallback((slotId: string, patientId: string) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId ? { ...s, filled: true, matchIds: [patientId] } : s,
      ),
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const value = useMemo<AppState>(
    () => ({
      aiGlobalActive,
      setAiGlobalActive,
      autoFill,
      setAutoFill,
      conversations,
      toggleConversationAi,
      sendMessage,
      markRead,
      slots,
      fillSlot,
      notifications,
      markAllNotificationsRead,
      unreadNotifications: notifications.filter((n) => !n.read).length,
      language,
      setLanguage,
    }),
    [
      aiGlobalActive,
      autoFill,
      conversations,
      toggleConversationAi,
      sendMessage,
      markRead,
      slots,
      fillSlot,
      notifications,
      markAllNotificationsRead,
      language,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}
