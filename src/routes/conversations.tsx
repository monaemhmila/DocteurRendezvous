import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Search, Sparkles, User, Calendar as CalendarIcon, Paperclip, Send, Smile, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PatientAvatar, AIStatusBadge } from "@/components/shared/ui-kit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatShortDate } from "@/lib/format";

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
  lastMessageAt: string;
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
  head: () => ({
    meta: [
      { title: "Boîte de réception — Dental AI" },
      { name: "description", content: "Gérez les conversations WhatsApp avec vos patients." },
    ],
  }),
  component: ConversationsPage,
});

function ConversationsPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "ai" | "human">("all");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");

  const { data: serverConversations = [], isLoading: isLoadingConvs, isError: isErrorConvs } = useQuery<BackendConversation[]>({
    queryKey: ["conversations"],
    queryFn: () => api.get("/communications/conversations"),
  });

  const { data: serverMessages = [], isLoading: isLoadingMsgs } = useQuery<BackendMessage[]>({
    queryKey: ["messages", activeId],
    queryFn: () => api.get(`/communications/conversations/${activeId}/messages`),
    enabled: !!activeId,
  });

  const queryClient = useQueryClient();

  const generateAI = useMutation({
    mutationFn: () => api.post(`/ai/conversations/${activeId}/suggestion`, {}),
    onSuccess: (data) => {
      if (data.suggestion) {
        setDraft(data.suggestion);
        toast.success("Suggestion générée avec succès.");
      }
    },
    onError: (error: any) => {
      toast.error("Erreur IA", {
        description: error.message || "Impossible de générer une suggestion.",
      });
    }
  });

  const sendMessage = useMutation({
    mutationFn: (content: string) => api.post(`/communications/conversations/${activeId}/messages`, { content }),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["messages", activeId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: any) => {
      toast.error("Erreur d'envoi", {
        description: error.message || "Le message n'a pas pu être envoyé.",
      });
    }
  });

  const activeConv = serverConversations.find((c) => c._id === activeId);

  const filtered = useMemo(() => {
    return serverConversations.filter((c) => {
      const pName = c.patientId ? `${c.patientId.firstName} ${c.patientId.lastName}` : c.contactWaId;
      if (query && !pName.toLowerCase().includes(query.toLowerCase())) return false;
      
      // All AI/Unread filters are gracefully degraded as they don't exist yet
      if (filter === "unread") return false; // Not implemented
      if (filter === "ai") return false;     // Not implemented
      if (filter === "human") return true;   // All are human right now
      
      return true;
    });
  }, [serverConversations, query, filter]);

  const handleTakeOver = () => {
    toast.success("Vous avez pris la main sur cette conversation.");
  };

  const handleSend = () => {
    if (!draft.trim() || !activeConv || sendMessage.isPending) return;
    sendMessage.mutate(draft.trim());
  };

  return (
    <div className="flex h-[calc(100vh-theme(spacing.14)-theme(spacing.12))] -m-3 sm:-m-6 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      {/* Sidebar */}
      <div className="flex w-80 flex-col border-r border-border bg-background">
        <div className="p-4 border-b border-border space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher..." 
              className="pl-9 bg-surface"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scroll-slim">
             {([
               { id: "all", label: "Toutes" },
               { id: "unread", label: "Non lues" },
               { id: "ai", label: "Gérées par IA" },
               { id: "human", label: "À traiter" },
             ] as const).map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    filter === f.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
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
                <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Chargement...</div>
              ) : isErrorConvs ? (
                <div className="p-8 text-center text-sm text-destructive">Erreur de chargement</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Aucune conversation</div>
              ) : (
                filtered.map(c => {
                  const pName = c.patientId ? `${c.patientId.firstName} ${c.patientId.lastName}` : c.contactWaId;
                  const pInitials = c.patientId ? `${c.patientId.firstName[0] || ""}${c.patientId.lastName[0] || ""}`.toUpperCase() : "WA";
                  const timeStr = c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                  
                  return (
                    <button
                      key={c._id}
                      onClick={() => setActiveId(c._id)}
                      className={cn(
                        "w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-start gap-3",
                        activeId === c._id && "bg-muted"
                      )}
                    >
                       <div className="relative">
                          <PatientAvatar initials={pInitials} id={c.patientId?._id || "unknown"} size="md" />
                       </div>
                       <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                             <p className="font-semibold text-sm truncate">{pName}</p>
                             <span className="text-[11px] text-muted-foreground shrink-0">{timeStr}</span>
                          </div>
                          <p className="text-xs truncate mt-1 text-muted-foreground">
                             Cliquez pour voir les messages
                          </p>
                       </div>
                    </button>
                  );
                })
              )}
           </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      {activeConv ? (
        <div className="flex flex-1 flex-col bg-background relative">
           {/* Header */}
           <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                 <PatientAvatar 
                   initials={activeConv.patientId ? `${activeConv.patientId.firstName[0] || ""}${activeConv.patientId.lastName[0] || ""}`.toUpperCase() : "WA"} 
                   id={activeConv.patientId?._id || "unknown"} 
                   size="md" 
                 />
                 <div>
                    <h2 className="font-semibold text-foreground">
                      {activeConv.patientId ? `${activeConv.patientId.firstName} ${activeConv.patientId.lastName}` : activeConv.contactWaId}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {activeConv.patientId?.phone || activeConv.contactWaId} • {activeConv.channel === "whatsapp" ? "WhatsApp" : "SMS"}
                    </p>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                 <AIStatusBadge active={false} label="Géré par vous" />
              </div>
           </div>

           {/* Messages */}
           <ScrollArea className="flex-1 p-6">
              <div className="space-y-6 max-w-3xl mx-auto pb-4">
                 {isLoadingMsgs ? (
                   <div className="text-center text-muted-foreground text-sm animate-pulse">Chargement des messages...</div>
                 ) : serverMessages.length === 0 ? (
                   <div className="text-center text-muted-foreground text-sm">Aucun message dans cette conversation.</div>
                 ) : (
                   serverMessages.map((m) => {
                     const isPatient = m.direction === "inbound";
                     const msgTime = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                     const pName = activeConv.patientId ? `${activeConv.patientId.firstName} ${activeConv.patientId.lastName}` : activeConv.contactWaId;
                     
                     return (
                       <div key={m._id} className={cn("flex flex-col gap-1", isPatient ? "items-start" : "items-end")}>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                             {isPatient ? pName : "Vous"}
                             <span>• {msgTime}</span>
                          </div>
                          <div className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                            isPatient 
                              ? "bg-muted text-foreground rounded-tl-sm"
                              : "bg-primary text-primary-foreground rounded-tr-sm"
                          )}>
                             {m.content}
                          </div>
                       </div>
                     );
                   })
                 )}
              </div>
           </ScrollArea>

           {/* Composer */}
           <div className="border-t border-border p-4 bg-surface">
              <div className="flex items-end gap-2 rounded-xl border border-input bg-background p-2 focus-within:ring-1 focus-within:ring-ring">
                 <Button variant="ghost" size="icon" className="shrink-0 rounded-full text-muted-foreground hover:text-foreground">
                    <Smile className="size-5" />
                 </Button>
                 <Button variant="ghost" size="icon" className="shrink-0 rounded-full text-muted-foreground hover:text-foreground">
                    <Paperclip className="size-5" />
                 </Button>
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="shrink-0 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                   onClick={() => generateAI.mutate()}
                   disabled={generateAI.isPending}
                   title="Générer une réponse IA"
                 >
                    {generateAI.isPending ? <Loader2 className="size-5 animate-spin text-primary" /> : <Sparkles className="size-5" />}
                 </Button>
                 <textarea
                   className="flex-1 max-h-32 min-h-[40px] resize-none bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                   placeholder="Écrire un message..."
                   rows={1}
                   value={draft}
                   onChange={(e) => setDraft(e.target.value)}
                   onKeyDown={(e) => {
                     if (e.key === "Enter" && !e.shiftKey) {
                       e.preventDefault();
                       handleSend();
                     }
                   }}
                 />
                 <Button 
                   size="icon" 
                   className={cn("shrink-0 rounded-full", draft.trim() && !sendMessage.isPending ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground cursor-not-allowed")}
                   onClick={handleSend}
                   disabled={!draft.trim() || sendMessage.isPending}
                 >
                    {sendMessage.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                 </Button>
              </div>
           </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center flex-col text-muted-foreground">
           <MessageSquare className="size-12 mb-4 opacity-20" />
           <p>Sélectionnez une conversation</p>
        </div>
      )}
    </div>
  );
}
