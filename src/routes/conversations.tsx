import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { useAdmin } from "@/contexts/admin-context";
import { useAppState } from "@/hooks/use-app-state";
import {
  Search,
  Sparkles,
  User,
  Calendar as CalendarIcon,
  Paperclip,
  Send,
  Smile,
  MessageSquare,
  Loader2,
  Smartphone,
  CheckCheck,
  Zap,
  Bot,
  UserCheck,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Phone,
  Clock,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PatientAvatar, AIStatusBadge } from "@/components/shared/ui-kit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IPatient } from "@/types/api";

const getPatientId = (p: any) => {
  if (!p) return null;
  if (typeof p === 'string') return p;
  if (typeof p === 'object' && p._id) return p._id;
  if (typeof p === 'object' && p.id) return p.id;
  return null;
};


interface BackendConversation {
  _id: string;
  tenantId: string;
  patientId?: {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  channel: "whatsapp";
  contactWaId: string;
  status: "active" | "archived";
  needsHuman?: boolean;
  lastMessageAt: string;
  lastMessage?: {
    content: string;
    direction: "inbound" | "outbound";
    createdAt: string;
    status: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface BackendMessage {
  _id: string;
  tenantId: string;
  conversationId: string;
  patientId?: string;
  direction: "inbound" | "outbound";
  status: "sent" | "delivered" | "read" | "failed" | "received";
  content: string;
  providerMessageId: string;
  createdAt: string;
}

export const Route = createFileRoute("/conversations")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      conversationId: search['conversationId'] as string | undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Boîte de réception & Simulateur WhatsApp IA — Medical AI" },
      { name: "description", content: "Gérez les conversations et testez l'IA WhatsApp en temps réel." },
    ],
  }),
  component: ConversationsPage,
});

const QUICK_TEST_PROMPTS = [
  {
    label: "📅 Demande de Détartrage",
    text: "Bonjour, je voudrais prendre un rendez-vous pour un détartrage cette semaine svp.",
  },
  {
    label: "⏱️ Confirmer 11h30",
    text: "Parfait, le créneau de 11h30 me convient très bien ! Je confirme.",
  },
  {
    label: "🚨 Urgence dentaire",
    text: "Bonjour docteur, j'ai une rage de dents insupportable depuis ce matin, pouvez-vous me prendre en urgence ?",
  },
  {
    label: "💰 Tarifs & Devis",
    text: "Bonjour, pouvez-vous me renseigner sur le prix d'un implant ou d'un blanchiment ?",
  },
  {
    label: "🧑‍⚕️ Parler au docteur",
    text: "J'aimerais parler directement au médecin concernant mon traitement d'hier.",
  },
];

function ConversationsPage() {
  const { t } = useAppState();
  const { isAdminUnlocked, doctorPhones } = useAdmin();
  const { conversationId } = Route.useSearch();
  const [activeId, setActiveId] = useState<string | null>(conversationId || null);
  const [filter, setFilter] = useState<"all" | "unread" | "ai" | "human">("all");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simPatientId, setSimPatientId] = useState<string>("");
  const [simMessage, setSimMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();
  const [convsPage, setConvsPage] = useState(1);
  const convsLimit = 50;

  // ── Queries ───────────────────────────────────────────────
  const { data: convsResponse, isLoading: isLoadingConvs, isError: isErrorConvs } = useQuery<{ data: BackendConversation[], meta: any }>({
    queryKey: ["conversations", convsPage, convsLimit],
    queryFn: async () => {
      const res = await api.get(`/communications/conversations?page=${convsPage}&limit=${convsLimit}`);
      return res as { data: BackendConversation[], meta: any };
    },
  });

  // Filter out the doctor conversation and the dummy patient conversation unless admin mode is unlocked
  const serverConversations: BackendConversation[] = (convsResponse?.data || []).filter(conv => {
    if (isAdminUnlocked) return true;
    const isDoctor = doctorPhones.includes(conv.contactWaId);
    const isDummy = conv.contactWaId === "00000000" || (conv as any).patient?.phone === "00000000";
    return !isDoctor && !isDummy;
  });
  const convsMeta = convsResponse?.meta;

  const [msgPage, setMsgPage] = useState(1);
  const msgLimit = 50;

  const { data: msgResponse, isLoading: isLoadingMsgs } = useQuery<{ data: BackendMessage[], meta: any }>({
    queryKey: ["messages", activeId, msgPage],
    queryFn: async () => {
      const res = await api.get(`/communications/conversations/${activeId}/messages?page=${msgPage}&limit=${msgLimit}`);
      return res as { data: BackendMessage[], meta: any };
    },
    enabled: !!activeId,
  });

  const serverMessages = useMemo(() => {
    return [...(msgResponse?.data || [])].reverse();
  }, [msgResponse]);
  const msgMeta = msgResponse?.meta;

  // Reset message pagination when active conversation changes
  useEffect(() => {
    setMsgPage(1);
  }, [activeId]);

  const { data: patients = [] } = useQuery<IPatient[]>({
    queryKey: ["patients"],
    queryFn: async () => {
      const res = await api.get("/patients?limit=100");
      return Array.isArray(res) ? res : (res.data || []);
    },
  });

  // Auto select first conversation if none selected
  useEffect(() => {
    if (!activeId && !conversationId && serverConversations.length > 0) {
      setActiveId(serverConversations[0]?._id || null);
    }
  }, [serverConversations, activeId, conversationId]);

  // Sync search param to state
  useEffect(() => {
    if (conversationId) {
      setActiveId(conversationId);
    }
  }, [conversationId]);

  // Set default sim patient when conversations or patients load
  useEffect(() => {
    if (!simPatientId && patients.length > 0) {
      setSimPatientId(patients[0]?._id || "");
    }
  }, [patients, simPatientId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [serverMessages]);

  // ── Mutations ─────────────────────────────────────────────
  const generateAI = useMutation({
    mutationFn: () => api.post(`/ai/conversations/${activeId}/suggestion`, {}),
    onSuccess: (data) => {
      if (data.suggestion) {
        setDraft(data.suggestion);
        toast.success(t.conversationsPage.suggestionSuccess);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || t.conversationsPage.suggestionError);
    },
  });

  const sendMessage = useMutation({
    mutationFn: (content: string) => api.post(`/communications/conversations/${activeId}/messages`, { content }),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["messages", activeId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: any) => {
      toast.error(error.message || t.conversationsPage.sendError);
    },
  });

  // Simulate Inbound WhatsApp Patient Message
  const simulateInboundMutation = useMutation({
    mutationFn: (text: string) => {
      const selectedPatient = patients.find((p) => p._id === simPatientId);
      return api.post("/communications/simulate-inbound", {
        conversationId: activeId,
        patientId: simPatientId || activeConv?.patientId?._id,
        phone: selectedPatient?.phone || activeConv?.contactWaId,
        content: text,
      });
    },
    onSuccess: (res: any) => {
      setSimMessage("");
      if (res.conversationId && res.conversationId !== activeId) {
        setActiveId(res.conversationId);
      }
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success(t.conversationsPage.simSuccess);
    },
    onError: (err: any) => {
      toast.error(err.message || t.conversationsPage.simError);
    },
  });

  const activeConv = serverConversations.find((c) => c._id === activeId);

  const filtered = useMemo(() => {
    return serverConversations.filter((c) => {
      const pName = (c.patientId && typeof c.patientId === 'object' && c.patientId.firstName)
        ? `${c.patientId.firstName} ${c.patientId.lastName || ''}`
        : c.contactWaId;
      if (query && !pName.toLowerCase().includes(query.toLowerCase())) return false;

      if (filter === "ai") return !c.needsHuman;
      if (filter === "human") return !!c.needsHuman;
      return true;
    });
  }, [serverConversations, query, filter]);

  const handleSendClinicMessage = () => {
    if (!draft.trim() || !activeConv || sendMessage.isPending) return;
    sendMessage.mutate(draft.trim());
  };

  const handleSendSimulatedPatientMessage = (textToSend?: string) => {
    const text = textToSend || simMessage;
    if (!text.trim() || simulateInboundMutation.isPending) return;
    simulateInboundMutation.mutate(text.trim());
  };

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.14)-theme(spacing.10))] -m-3 sm:-m-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* ── Top Header Toolbar ─────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-card/60 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <MessageSquare className="size-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-foreground flex items-center gap-2">
              {t.conversationsPage.title}
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t.conversationsPage.live}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">

          <Button variant="outline" size="sm" asChild className="text-xs gap-1.5">
            <Link to="/agenda">
              <CalendarIcon className="size-3.5 text-primary" />
              {t.conversationsPage.viewAgenda}
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Main 3-Column Split Layout ─────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* 1. Conversations List Sidebar */}
        <div className="flex w-72 lg:w-80 flex-col border-r border-border bg-background shrink-0">
          <div className="p-3 border-b border-border space-y-2.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.conversationsPage.searchPlaceholder}
                className="pl-8 h-8 text-xs bg-card"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {[
                { id: "all", label: t.conversationsPage.filterAll.replace("{count}", (convsMeta?.total ?? serverConversations.length).toString()) },
                { id: "ai", label: t.conversationsPage.filterAi },
                { id: "human", label: t.conversationsPage.filterHuman },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={cn(
                    "whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                    filter === f.id
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="divide-y divide-border">
              {isLoadingConvs ? (
                <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                  {t.conversationsPage.loadingConvs}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  {t.conversationsPage.noConvs}
                </div>
              ) : (
                filtered.map((c) => {
                  const pName = c.patientId
                    ? `${c.patientId.firstName} ${c.patientId.lastName}`
                    : c.contactWaId;
                  const pInitials = c.patientId
                    ? `${c.patientId.firstName?.[0] || ""}${c.patientId.lastName?.[0] || ""}`.toUpperCase()
                    : "WA";
                  const timeStr = c.lastMessageAt
                    ? new Date(c.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "";

                  return (
                    <button
                      key={c._id}
                      onClick={() => setActiveId(c._id)}
                      className={cn(
                        "w-full p-3.5 text-left hover:bg-muted/40 transition-colors flex items-start gap-3",
                        activeId === c._id && "bg-primary/5 border-l-4 border-l-primary"
                      )}
                    >
                      <PatientAvatar initials={pInitials} id={getPatientId(c.patientId) || "wa"} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-semibold text-xs text-foreground truncate">{pName}</p>
                          <span className="text-[10px] text-muted-foreground shrink-0">{timeStr}</span>
                        </div>
                        <div className="flex items-center justify-between gap-1 mt-1">
                          <p className="text-[11px] text-muted-foreground truncate flex-1">
                            {c.contactWaId}
                          </p>
                          {c.needsHuman ? (
                            <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
                              {t.conversationsPage.humanRequired}
                            </Badge>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded font-semibold">
                              <Bot className="size-2.5" /> {t.conversationsPage.aiHandled}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {convsMeta && convsMeta.totalPages > 1 && (
            <div className="flex justify-between items-center px-3 py-2 border-t border-border bg-card/40 shrink-0">
              <span className="text-[10px] text-muted-foreground">
                {convsMeta.page}/{convsMeta.totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  disabled={convsMeta.page <= 1}
                  onClick={() => setConvsPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  disabled={convsMeta.page >= convsMeta.totalPages}
                  onClick={() => setConvsPage(p => p + 1)}
                >
                  <ChevronRight className="size-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 2. Main Clinic Chat View */}
        <div className="flex flex-1 flex-col bg-background relative overflow-hidden border-r border-border">
          {activeConv ? (
            <>
              {/* Active Conversation Top Bar */}
              <div className="flex items-center justify-between border-b border-border px-5 py-3 bg-card/40">
                <div className="flex items-center gap-3">
                  <PatientAvatar
                    initials={
                      activeConv.patientId
                        ? `${activeConv.patientId.firstName?.[0] || ""}${activeConv.patientId.lastName?.[0] || ""}`.toUpperCase()
                        : "WA"
                    }
                    id={getPatientId(activeConv?.patientId) || "wa"}
                    size="md"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-sm text-foreground">
                        {activeConv.patientId
                          ? `${activeConv.patientId.firstName} ${activeConv.patientId.lastName}`
                          : activeConv.contactWaId}
                      </h2>
                      {getPatientId(activeConv?.patientId) && (
                        <Link
                          to="/patients/$id"
                          params={{ id: getPatientId(activeConv?.patientId) as string }}
                          className="text-[10px] text-primary hover:underline font-medium inline-flex items-center gap-0.5"
                        >
                          {t.conversationsPage.patientRecord} <ExternalLink className="size-2.5" />
                        </Link>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Phone className="size-3 text-muted-foreground" />
                      {activeConv.contactWaId}
                      <span className="text-muted-foreground/40">·</span>
                      <span className="font-medium text-emerald-600">{t.conversationsPage.whatsappBusiness}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeConv.needsHuman ? (
                    <Badge variant="destructive" className="gap-1 text-xs py-1 px-2.5">
                      <AlertCircle className="size-3" />
                      {t.conversationsPage.humanRequired}
                    </Badge>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                      <Sparkles className="size-3 text-emerald-600 animate-pulse" />
                      {t.conversationsPage.aiHandled}
                    </span>
                  )}
                </div>
              </div>

              {/* Chat Message History */}
              <ScrollArea className="flex-1 p-5">
                <div className="space-y-4 max-w-3xl mx-auto pb-6">
                  {msgMeta && msgMeta.totalPages > 1 && (
                    <div className="flex justify-center pb-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[10px] h-7"
                        disabled={msgPage >= msgMeta.totalPages}
                        onClick={() => setMsgPage(p => p + 1)}
                      >
                        {t.conversationsPage.loadPrevMsgs}
                      </Button>
                    </div>
                  )}

                  {isLoadingMsgs ? (
                    <div className="text-center text-xs text-muted-foreground py-10 animate-pulse">
                      {t.conversationsPage.loadingMsgs}
                    </div>
                  ) : serverMessages.length === 0 ? (
                    <div className="text-center text-xs text-muted-foreground py-12 space-y-2">
                      <MessageSquare className="size-8 text-muted-foreground/30 mx-auto" />
                      <p className="font-semibold text-foreground">{t.conversationsPage.noMsgsTitle}</p>
                      <p className="text-muted-foreground max-w-xs mx-auto text-[11px]">
                        {t.conversationsPage.noMsgsDesc}
                      </p>
                    </div>
                  ) : (
                    serverMessages.map((m) => {
                      const isPatient = m.direction === "inbound";
                      const msgTime = new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const pName = activeConv.patientId
                        ? `${activeConv.patientId.firstName}`
                        : "Patient";

                      return (
                        <div
                          key={m._id}
                          className={cn("flex flex-col gap-1", isPatient ? "items-start" : "items-end")}
                        >
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground px-1">
                            <span className="font-semibold">{isPatient ? t.conversationsPage.patient.replace("{name}", pName) : t.conversationsPage.aiBot}</span>
                            <span>· {msgTime}</span>
                          </div>

                          <div
                            className={cn(
                              "max-w-[82%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-xs space-y-1",
                              isPatient
                                ? "bg-muted text-foreground rounded-tl-sm border border-border"
                                : "bg-primary text-primary-foreground rounded-tr-sm"
                            )}
                          >
                            <p className="whitespace-pre-wrap">{m.content}</p>

                            <div
                              className={cn(
                                "flex items-center justify-end text-[9px] gap-1 pt-0.5",
                                isPatient ? "text-muted-foreground" : "text-primary-foreground/70"
                              )}
                            >
                              <span>{m.status === "received" ? t.conversationsPage.received : t.conversationsPage.delivered}</span>
                              <CheckCheck className="size-3" />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Clinic Composer (Doctor Manual Reply) */}
              <div className="border-t border-border p-3 bg-card/60 backdrop-blur-sm">
                <div className="flex items-end gap-2 rounded-xl border border-input bg-background p-1.5 focus-within:ring-1 focus-within:ring-ring">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 size-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                    onClick={() => generateAI.mutate()}
                    disabled={generateAI.isPending}
                    title="Générer une suggestion IA"
                  >
                    {generateAI.isPending ? (
                      <Loader2 className="size-4 animate-spin text-primary" />
                    ) : (
                      <Sparkles className="size-4 text-primary" />
                    )}
                  </Button>

                  <textarea
                    className="flex-1 max-h-28 min-h-[36px] resize-none bg-transparent px-2 py-2 text-xs outline-none placeholder:text-muted-foreground"
                    placeholder={t.conversationsPage.writeManualReply}
                    rows={1}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendClinicMessage();
                      }
                    }}
                  />

                  <Button
                    size="icon"
                    className={cn(
                      "shrink-0 size-8 rounded-lg transition-colors",
                      draft.trim() && !sendMessage.isPending
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                    onClick={handleSendClinicMessage}
                    disabled={!draft.trim() || sendMessage.isPending}
                  >
                    {sendMessage.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1 pt-1.5">
                  <span>{t.conversationsPage.aiTip}</span>
                  <span>{t.conversationsPage.enterToSend}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center flex-col text-muted-foreground p-8 text-center">
              <MessageSquare className="size-12 mb-3 text-muted-foreground/30" />
              <p className="font-semibold text-foreground">{t.conversationsPage.selectConvTitle}</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                {t.conversationsPage.selectConvDesc}
              </p>
            </div>
          )}
        </div>

        {/* 3. Interactive Patient WhatsApp Simulator (Right Column) */}
        {isSimulatorOpen && (
          <div className="w-80 lg:w-96 border-l border-border bg-muted/20 flex flex-col shrink-0 overflow-hidden">
            {/* Phone Screen Container */}
            <div className="p-3 bg-card border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Smartphone className="size-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-foreground">{t.conversationsPage.simulatorTitle}</h3>
                  <p className="text-[10px] text-muted-foreground">{t.conversationsPage.simulatorSubtitle}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                {t.conversationsPage.directTestMode}
              </Badge>
            </div>

            {/* Patient Selector */}
            <div className="p-3 border-b border-border bg-card/40 space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground">
                {t.conversationsPage.simPatientLabel}
              </label>
              <select
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs shadow-xs"
                value={simPatientId}
                onChange={(e) => setSimPatientId(e.target.value)}
              >
                {patients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.firstName} {p.lastName} ({p.phone || t.conversationsPage.simPatientUnknown})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Scenario Buttons */}
            <div className="p-3 border-b border-border bg-card/20 space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Zap className="size-3 text-amber-500" />
                {t.conversationsPage.quickScenarios}
              </span>
              <div className="flex flex-col gap-1.5">
                {[
                  { label: t.conversationsPage.scenario1Label, text: t.conversationsPage.scenario1Text },
                  { label: t.conversationsPage.scenario2Label, text: t.conversationsPage.scenario2Text },
                  { label: t.conversationsPage.scenario3Label, text: t.conversationsPage.scenario3Text },
                  { label: t.conversationsPage.scenario4Label, text: t.conversationsPage.scenario4Text },
                  { label: t.conversationsPage.scenario5Label, text: t.conversationsPage.scenario5Text },
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendSimulatedPatientMessage(prompt.text)}
                    disabled={simulateInboundMutation.isPending}
                    className="text-left px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-emerald-500/10 hover:border-emerald-500/30 text-[11px] font-medium transition-all text-foreground group flex items-center justify-between"
                  >
                    <span>{prompt.label}</span>
                    <ArrowRight className="size-3 text-muted-foreground group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated WhatsApp Phone Frame */}
            <div className="flex-1 flex flex-col p-3 overflow-hidden">
              <div className="rounded-xl border border-emerald-600/30 bg-[#efeae2] dark:bg-[#0b141a] flex-1 flex flex-col overflow-hidden shadow-sm">
                {/* Simulated WhatsApp Header */}
                <div className="bg-[#008069] text-white px-3 py-2 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-[10px]">
                      🦷
                    </div>
                    <div>
                      <p className="font-bold text-xs leading-tight">{t.conversationsPage.clinicName}</p>
                      <p className="text-[9px] text-white/80 leading-tight">{t.conversationsPage.onlineStatus}</p>
                    </div>
                  </div>
                </div>

                {/* Simulated WhatsApp Chat Stream */}
                <ScrollArea className="flex-1 p-2.5">
                  <div className="space-y-2 text-[11px]">
                    <div className="rounded-lg bg-white dark:bg-[#202c33] p-2 text-foreground shadow-xs max-w-[90%] text-[10px] leading-relaxed">
                      {t.conversationsPage.welcomeMsg}
                    </div>

                    {serverMessages.slice(-6).map((m) => {
                      const isPatient = m.direction === "inbound";
                      return (
                        <div
                          key={m._id}
                          className={cn(
                            "flex flex-col",
                            isPatient ? "items-end" : "items-start"
                          )}
                        >
                          <div
                            className={cn(
                              "rounded-lg p-2 max-w-[85%] shadow-xs text-[11px] leading-snug",
                              isPatient
                                ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-foreground"
                                : "bg-white dark:bg-[#202c33] text-foreground"
                            )}
                          >
                            <p>{m.content}</p>
                            <span className="text-[8px] text-muted-foreground block text-right mt-0.5">
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                {/* Simulated Patient WhatsApp Input */}
                <div className="p-2 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-border flex items-center gap-1.5">
                  <Input
                    placeholder={t.conversationsPage.writeAsPatient}
                    value={simMessage}
                    onChange={(e) => setSimMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendSimulatedPatientMessage();
                      }
                    }}
                    className="h-8 text-xs bg-white dark:bg-[#2a3942] rounded-full border-none focus-visible:ring-1"
                  />
                  <Button
                    size="icon"
                    onClick={() => handleSendSimulatedPatientMessage()}
                    disabled={!simMessage.trim() || simulateInboundMutation.isPending}
                    className="size-8 rounded-full bg-[#00a884] hover:bg-[#008069] text-white shrink-0 shadow-sm"
                  >
                    {simulateInboundMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
