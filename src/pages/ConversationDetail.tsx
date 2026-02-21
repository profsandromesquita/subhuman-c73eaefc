import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, PaperPlaneTilt } from "@phosphor-icons/react";
import { useAuth } from "@/hooks/useAuth";
import { AuthorModal } from "@/components/post/AuthorModal";
import { useProfile } from "@/hooks/useProfile";
import {
  useConversationMessages,
  useSendMessage,
  useMarkConversationRead,
  useMessagesRealtime,
} from "@/hooks/useMessages";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

const MAX_LENGTH = 500;

export default function ConversationDetail() {
  const { recipientId } = useParams<{ recipientId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [text, setText] = useState("");
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useConversationMessages(recipientId);
  const sendMessage = useSendMessage();
  const markRead = useMarkConversationRead(recipientId);

  useMessagesRealtime(recipientId);

  const { data: contact } = useQuery({
    queryKey: ["profile", recipientId],
    enabled: !!recipientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio, education, instagram_url, linkedin_url, website")
        .eq("id", recipientId!)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading]);

  // Mark as read on mount and when new messages arrive
  useEffect(() => {
    if (messages?.length) {
      const hasUnread = messages.some(m => m.receiver_id === user?.id && !m.is_read);
      if (hasUnread) markRead.mutate();
    }
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim() || !recipientId) return;
    sendMessage.mutate({ receiverId: recipientId, content: text.trim() });
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <button onClick={() => navigate("/messages")} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button onClick={() => setShowAuthorModal(true)} className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={contact?.avatar_url || undefined} />
            <AvatarFallback className="bg-secondary text-xs">
              {getInitials(contact?.full_name || null)}
            </AvatarFallback>
          </Avatar>
          <p className="font-semibold text-sm truncate">
            {contact?.full_name || "Carregando..."}
          </p>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-3/4 rounded-xl" />
            ))}
          </div>
        ) : !messages?.length ? (
          <p className="text-center text-muted-foreground text-sm py-10">
            Nenhuma mensagem nesta conversa
          </p>
        ) : (
          messages.map(msg => {
            const isMine = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card border border-border rounded-bl-md"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                    }`}
                  >
                    {formatDistanceToNow(new Date(msg.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border bg-card px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={handleKeyDown}
            placeholder="Escreva uma mensagem..."
            rows={1}
            className="flex-1 resize-none bg-input rounded-lg px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-border"
            style={{ maxHeight: 120 }}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!text.trim() || sendMessage.isPending}
            className="shrink-0 rounded-lg"
          >
            <PaperPlaneTilt className="w-5 h-5" weight="fill" />
          </Button>
        </div>
      </div>
      <AuthorModal
        author={contact || null}
        isOpen={showAuthorModal}
        onClose={() => setShowAuthorModal(false)}
      />
    </div>
  );
}
