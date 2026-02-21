import { AppLayout } from "@/components/AppLayout";
import { Logo } from "@/components/Logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversations } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { useEffect } from "react";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function Messages() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: conversations, isLoading } = useConversations();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading]);

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Mensagens</h1>
          <Logo size="sm" />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : !conversations?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <EnvelopeSimple className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">Nenhuma mensagem ainda</p>
            <p className="text-muted-foreground text-xs mt-1">
              Envie uma mensagem pelo perfil de alguém
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv, index) => (
              <motion.button
                key={conv.contact.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => navigate(`/messages/${conv.contact.id}`)}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-card hover:bg-elevated transition-colors text-left"
              >
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarImage src={conv.contact.avatar_url || undefined} />
                  <AvatarFallback className="bg-secondary text-sm">
                    {getInitials(conv.contact.full_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm truncate">
                      {conv.contact.full_name || "Usuário"}
                    </p>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {formatDistanceToNow(new Date(conv.lastMessageAt), {
                        addSuffix: false,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.lastMessage}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 shrink-0 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
