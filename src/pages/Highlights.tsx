import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, ChatCircle, Clock, CalendarBlank } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, subYears } from "date-fns";
import { useState } from "react";

interface Highlight {
  id: string;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  media_type: string | null;
  published_at: string | null;
  created_at: string;
  space_id: string;
  space_name: string;
  space_slug: string;
  likes_count: number;
  comments_count: number;
  read_time_minutes: number | null;
}

const dateFilters = [
  { label: "Hoje", value: "today" },
  { label: "Ontem", value: "yesterday" },
  { label: "Últimos 7 dias", value: "7days" },
  { label: "Últimos 14 dias", value: "14days" },
  { label: "Este mês", value: "thisMonth" },
  { label: "Mês passado", value: "lastMonth" },
  { label: "Últimos 3 meses", value: "3months" },
  { label: "Último ano", value: "lastYear" },
];

function getDateRange(filter: string): { start: Date; end: Date } {
  const now = new Date();
  switch (filter) {
    case "today": return { start: startOfDay(now), end: now };
    case "yesterday": return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
    case "7days": return { start: subDays(now, 7), end: now };
    case "14days": return { start: subDays(now, 14), end: now };
    case "thisMonth": return { start: startOfMonth(now), end: now };
    case "lastMonth": return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
    case "3months": return { start: subMonths(now, 3), end: now };
    case "lastYear": return { start: subYears(now, 1), end: now };
    default: return { start: startOfDay(now), end: now };
  }
}

function useHighlightsFiltered(filter: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["highlights-filtered", filter, user?.id],
    queryFn: async (): Promise<Highlight[]> => {
      if (!user) return [];

      const { data: subscriptions } = await supabase
        .from("user_space_subscriptions")
        .select("space_id")
        .eq("user_id", user.id);

      if (!subscriptions || subscriptions.length === 0) return [];

      const spaceIds = subscriptions.map(s => s.space_id);
      const dateRange = getDateRange(filter);

      // Fetch WITHOUT content
      const { data: updates, error } = await supabase
        .from("space_updates")
        .select(`
          id, title, slug, thumbnail_url, media_type, published_at, created_at, space_id, read_time_minutes,
          spaces!inner(name, slug)
        `)
        .in("space_id", spaceIds)
        .eq("is_published", true)
        .gte("published_at", dateRange.start.toISOString())
        .lte("published_at", dateRange.end.toISOString())
        .order("published_at", { ascending: false });

      if (error) throw error;
      if (!updates || updates.length === 0) return [];

      // Fetch counts from view
      const updateIds = updates.map(u => u.id);
      const { data: statsData } = await supabase
        .from("space_update_stats")
        .select("update_id, likes_count, comments_count")
        .in("update_id", updateIds);

      const statsMap: Record<string, { likes_count: number; comments_count: number }> = {};
      (statsData || []).forEach((s: any) => {
        statsMap[s.update_id] = { likes_count: Number(s.likes_count), comments_count: Number(s.comments_count) };
      });

      return updates.map(update => ({
        id: update.id,
        title: update.title,
        slug: (update as any).slug || "",
        thumbnail_url: update.thumbnail_url,
        media_type: update.media_type,
        published_at: update.published_at,
        created_at: update.created_at,
        space_id: update.space_id,
        space_name: (update.spaces as any)?.name || "",
        space_slug: (update.spaces as any)?.slug || "",
        likes_count: statsMap[update.id]?.likes_count || 0,
        comments_count: statsMap[update.id]?.comments_count || 0,
        read_time_minutes: (update as any).read_time_minutes,
      }));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });
}

export default function Highlights() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState("today");

  const { data: highlights = [], isLoading: loading } = useHighlightsFiltered(selectedFilter);

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffInHours < 1) return "Agora";
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}sem`;
    return `${Math.floor(diffInDays / 30)}m`;
  };

  const formatReadTime = (minutes: number | null) => {
    return `${minutes || 1}min`;
  };

  const handleCardClick = (highlight: Highlight) => {
    navigate(`/spaces/${highlight.space_slug}/post/${highlight.slug || highlight.id}`);
  };

  if (authLoading) {
    return (
      <AppLayout>
        <div className="p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Destaques</h1>
          </div>
          <ScrollArea className="w-full pb-3">
            <div className="flex gap-2 px-4">
              {dateFilters.map((filter) => (
                <Button
                  key={filter.value}
                  variant={selectedFilter === filter.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedFilter(filter.value)}
                  className="shrink-0"
                >
                  <CalendarBlank className="h-4 w-4 mr-1" />
                  {filter.label}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <div className="p-4">
          {!user ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
              <p className="text-muted-foreground mb-4">Faça login para ver os destaques dos seus espaços</p>
              <Button onClick={() => navigate("/login")}>Fazer login</Button>
            </motion.div>
          ) : loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : highlights.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
              <p className="text-muted-foreground mb-4">Nenhum destaque encontrado para este período</p>
              <Button variant="outline" onClick={() => navigate("/spaces")}>Explorar espaços</Button>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {highlights.map((highlight, index) => (
                <motion.div
                  key={highlight.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => handleCardClick(highlight)}>
                    <div className="flex gap-3">
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <Badge variant="secondary" className="mb-2 text-xs">{highlight.space_name}</Badge>
                          <h3 className="font-medium text-sm leading-snug line-clamp-3">{highlight.title}</h3>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Heart className="h-3.5 w-3.5" />
                            <span>{highlight.likes_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ChatCircle className="h-3.5 w-3.5" />
                            <span>{highlight.comments_count}</span>
                          </div>
                          <span>·</span>
                          <span>{formatTime(highlight.published_at)}</span>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{formatReadTime(highlight.read_time_minutes)}</span>
                          </div>
                        </div>
                      </div>
                      {highlight.thumbnail_url && (
                        <div className="shrink-0">
                          <img
                            src={highlight.thumbnail_url}
                            alt=""
                            loading="lazy"
                            className="w-20 h-20 object-cover rounded-lg bg-muted"
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
