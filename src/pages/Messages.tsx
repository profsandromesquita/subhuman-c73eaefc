import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Logo } from "@/components/Logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useConversations } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { EnvelopeSimple, MagnifyingGlass, User } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function useUserSearch(query: string) {
  return useQuery({
    queryKey: ["message-user-search", query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio, job_title")
        .ilike("full_name", `%${query}%`)
        .limit(15);
      return data || [];
    },
    enabled: query.length >= 2,
  });
}

export default function Messages() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: conversations, isLoading } = useConversations();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const { data: searchResults = [], isLoading: isSearching } = useUserSearch(debouncedQuery);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading]);

  const isSearchActive = debouncedQuery.length >= 2;

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Mensagens</h1>
          <Logo size="sm" />
        </div>

        <div className="relative mb-4">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar pessoas para conversar..."
            className="pl-10"
          />
        </div>

        {isSearchActive ? (
          isSearching ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : searchResults.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Nenhum resultado encontrado
            </p>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              {searchResults
                .filter(r => r.id !== user?.id)
                .map((result) => (
                <motion.button
                  key={result.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => navigate(`/messages/${result.id}`)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-card hover:bg-elevated transition-colors text-left"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={result.avatar_url || undefined} />
                    <AvatarFallback className="bg-secondary text-sm">
                      {result.full_name ? getInitials(result.full_name) : <User className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {result.full_name || "Usuário"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {result.job_title || result.bio || "Toque para conversar"}
                    </p>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )
        ) : isLoading ? (
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
              Use a busca acima para encontrar alguém
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
