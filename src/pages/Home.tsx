import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { formatTime } from "@/lib/formatTime";
import { ArrowRight, Heart, ChatCircle, Bell, BookmarkSimple, Envelope, TrendUp, Clock } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/AppLayout";
import { PushPermissionBanner } from "@/components/PushPermissionBanner";
import { OnboardingModal } from "@/components/OnboardingModal";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useSubscribedSpaces } from "@/hooks/useSpaces";
import { useHighlights, useRecentDiscussions, useRecentHighlights, useRecentDiscussionsChronological } from "@/hooks/usePosts";
import { getIconComponent } from "@/components/admin/IconPicker";
import { useUnreadNotificationsCount } from "@/hooks/useNotifications";
import { useUnreadMessagesCount } from "@/hooks/useMessages";

const MAX_STAGGER_ITEMS = 4;
const STAGGER_DELAY = 0.04;

export default function Home() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [feedSort, setFeedSort] = useState<"trending" | "recent">("trending");

  const { data: trendingHighlights = [], isLoading: loadingTrendingHighlights } = useHighlights();
  const { data: recentHighlights = [], isLoading: loadingRecentHighlights } = useRecentHighlights();
  const { data: trendingDiscussions = [], isLoading: loadingTrendingDiscussions } = useRecentDiscussions();
  const { data: chronoDiscussions = [], isLoading: loadingChronoDiscussions } = useRecentDiscussionsChronological();
  const { data: subscribedSpaces = [], isLoading: loadingSpaces } = useSubscribedSpaces();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const { data: unreadMessages = 0 } = useUnreadMessagesCount();

  const highlights = feedSort === "trending" ? trendingHighlights : recentHighlights;
  const loadingHighlights = feedSort === "trending" ? loadingTrendingHighlights : loadingRecentHighlights;
  const discussions = feedSort === "trending" ? trendingDiscussions : chronoDiscussions;
  const loadingDiscussions = feedSort === "trending" ? loadingTrendingDiscussions : loadingChronoDiscussions;

  const showOnboarding = !!(user && !authLoading && !loadingSpaces && subscribedSpaces.length === 0);

  const handleHighlightClick = (h: { space_slug?: string; slug?: string; id: string }) =>
    navigate(`/spaces/${h.space_slug}/post/${h.slug || h.id}`);

  return (
    <AppLayout>
      <OnboardingModal
        isOpen={showOnboarding}
        onNavigateToSpaces={() => navigate("/spaces")}
        onDismiss={() => {}}
      />
      {!showOnboarding && <PushPermissionBanner />}

      {/* ── Mobile header ── */}
      <div className="lg:hidden sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-14">
          <Logo size="sm" />
          <div className="flex items-center gap-0.5">
            <button onClick={() => navigate("/profile/saved")} className="p-2 rounded-xl hover:bg-accent transition-colors">
              <BookmarkSimple className="w-5 h-5" />
            </button>
            <button onClick={() => navigate("/messages")} className="relative p-2 rounded-xl hover:bg-accent transition-colors">
              <Envelope className="w-5 h-5" weight={unreadMessages > 0 ? "fill" : "regular"} />
              {unreadMessages > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" />
              )}
            </button>
            <button onClick={() => navigate("/notifications")} className="relative p-2 rounded-xl hover:bg-accent transition-colors">
              <Bell className="w-5 h-5" weight={unreadCount > 0 ? "fill" : "regular"} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 pb-28 lg:px-0 lg:pt-0 lg:pb-0">
        {/* ── Desktop two-column ── */}
        <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-0 lg:min-h-screen">

          {/* ── Main column ── */}
          <div className="space-y-8 lg:px-10 lg:py-8 lg:border-r lg:border-border/40">
            {/* Desktop title */}
            <div className="hidden lg:flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Início</h1>
                <p className="text-muted-foreground mt-1">Seu feed personalizado</p>
              </div>
            </div>

            {/* Feed sort toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setFeedSort("trending")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  feedSort === "trending"
                    ? "bg-foreground text-background"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <TrendUp className="w-4 h-4" weight="bold" />
                Em alta
              </button>
              <button
                onClick={() => setFeedSort("recent")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  feedSort === "recent"
                    ? "bg-foreground text-background"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Clock className="w-4 h-4" weight="bold" />
                Mais recentes
              </button>
            </div>

            {/* Highlights */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-base lg:text-lg">
                  {feedSort === "trending" ? "Destaques da semana" : "Atualizações recentes"}
                </h2>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1 -mr-2" onClick={() => navigate("/highlights")}>
                  Ver tudo <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              {!user ? (
                <EmptyCard message="Faça login para ver os destaques" action={{ label: "Fazer login", onClick: () => navigate("/login") }} />
              ) : loadingHighlights || authLoading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-[88px] w-full rounded-2xl" />)}</div>
              ) : highlights.length === 0 ? (
                <EmptyCard
                  message={subscribedSpaces.length === 0 ? "Inscreva-se em espaços para ver destaques" : "Nenhum destaque nos seus espaços ainda"}
                  action={{ label: "Explorar espaços", onClick: () => navigate("/spaces") }}
                />
              ) : (
                <div className="space-y-2.5 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0">
                  {highlights.map((h, i) => (
                    <motion.div key={h.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, MAX_STAGGER_ITEMS) * STAGGER_DELAY }}>
                      <button
                        onClick={() => handleHighlightClick(h)}
                        className="w-full text-left group"
                      >
                        <div className="flex gap-3 p-3.5 rounded-2xl bg-card border border-border/60 hover:border-border hover:bg-card/80 transition-all duration-200 lg:p-4">
                          <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
                            <div>
                              <Badge variant="secondary" className="mb-2 text-[11px] h-5">{h.space_name}</Badge>
                              <p className="font-medium text-sm leading-snug line-clamp-2 group-hover:text-foreground transition-colors lg:text-[15px] lg:line-clamp-2">
                                {h.title}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Heart className={`h-3.5 w-3.5 ${h.is_liked ? "text-red-500" : ""}`} weight={h.is_liked ? "fill" : "regular"} />
                                {h.likes_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <ChatCircle className="h-3.5 w-3.5" />
                                {h.comments_count}
                              </span>
                              <span className="text-muted-foreground/60">·</span>
                              <span>{formatTime(h.published_at)}</span>
                            </div>
                          </div>
                          {h.thumbnail_url && (
                            <img
                              src={h.thumbnail_url}
                              alt=""
                              loading="lazy"
                              className="w-[72px] h-[72px] object-cover rounded-xl bg-muted shrink-0 lg:w-24 lg:h-24 lg:rounded-2xl"
                            />
                          )}
                        </div>
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>

            {/* Discussions */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-base lg:text-lg">
                  {feedSort === "trending" ? "Em alta nos canais" : "Últimas discussões"}
                </h2>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1 -mr-2" onClick={() => navigate("/channels")}>
                  Ver tudo <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              {loadingDiscussions || authLoading ? (
                <div className="space-y-2.5">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
              ) : discussions.length === 0 ? (
                <EmptyCard message="Nenhuma discussão em alta no momento" />
              ) : (
                <div className="space-y-2.5">
                  {discussions.map((d, i) => (
                    <motion.div key={d.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, MAX_STAGGER_ITEMS) * STAGGER_DELAY }}>
                      <button
                        onClick={() => navigate(`/channels/${d.channel_id}/post/${d.id}`)}
                        className="w-full text-left group"
                      >
                        <div className="flex gap-3 p-3.5 rounded-2xl bg-card border border-border/60 hover:border-border hover:bg-card/80 transition-all duration-200 lg:p-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Badge variant="outline" className="text-[11px] h-5 border-border/60">{d.channel_name}</Badge>
                              <span className="text-xs text-muted-foreground truncate">por {d.author_name}</span>
                            </div>
                            <p className="font-medium text-sm leading-snug line-clamp-2 group-hover:text-foreground transition-colors">{d.title}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Heart className={`h-3.5 w-3.5 ${d.is_liked ? "text-red-500" : ""}`} weight={d.is_liked ? "fill" : "regular"} />
                                {d.likes_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <ChatCircle className="h-3.5 w-3.5" />
                                {d.comments_count}
                              </span>
                              <span className="text-muted-foreground/60">·</span>
                              <span>{formatTime(d.created_at)}</span>
                            </div>
                          </div>
                          {d.thumbnail_url && (
                            <img src={d.thumbnail_url} alt="" loading="lazy" className="w-14 h-14 object-cover rounded-xl bg-muted shrink-0" />
                          )}
                        </div>
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>

            {/* Spaces — mobile only */}
            <section className="space-y-4 lg:hidden">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-base">Seus espaços</h2>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1 -mr-2" onClick={() => navigate("/spaces")}>
                  Ver todos <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
              <SpacesGrid
                user={user}
                loading={loadingSpaces || authLoading}
                spaces={subscribedSpaces}
                onNavigate={navigate}
              />
            </section>
          </div>

          {/* ── Right sidebar — desktop only ── */}
          <aside className="hidden lg:block lg:w-[280px] lg:shrink-0">
            <div className="sticky top-0 h-screen overflow-y-auto px-5 py-8 space-y-6">
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-xs text-muted-foreground uppercase tracking-widest">Seus espaços</h2>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-7 -mr-2" onClick={() => navigate("/spaces")}>
                    Ver todos <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
                {!user ? (
                  <EmptyCard message="Faça login para ver seus espaços" action={{ label: "Entrar", onClick: () => navigate("/login") }} />
                ) : loadingSpaces || authLoading ? (
                  <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-11 w-full rounded-xl" />)}</div>
                ) : subscribedSpaces.length === 0 ? (
                  <EmptyCard message="Nenhum espaço seguido" action={{ label: "Explorar", onClick: () => navigate("/spaces") }} />
                ) : (
                  <div className="space-y-1">
                    {subscribedSpaces.map((space, i) => {
                      const SpaceIcon = getIconComponent(space.icon);
                      return (
                        <motion.button
                          key={space.id}
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i, MAX_STAGGER_ITEMS) * STAGGER_DELAY }}
                          onClick={() => navigate(`/spaces/${space.slug}`)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/50 transition-colors text-left group"
                        >
                          <div className="p-1.5 rounded-lg bg-secondary shrink-0 group-hover:bg-secondary/80 transition-colors">
                            <SpaceIcon className="w-3.5 h-3.5" weight="bold" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{space.name}</p>
                            <p className="text-xs text-muted-foreground">{space.updates_count} atualizações</p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Quick links */}
              <section className="space-y-1 pt-4 border-t border-border/40">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Explorar</p>
                {[
                  { label: "Destaques", path: "/highlights" },
                  { label: "Podcasts", path: "/podcasts" },
                  { label: "Eventos", path: "/events" },
                  { label: "Canais", path: "/channels" },
                ].map(({ label, path }) => (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors group"
                  >
                    {label}
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                  </button>
                ))}
              </section>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}

function EmptyCard({ message, action }: { message: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 p-5 text-center">
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      {action && (
        <Button size="sm" variant="outline" onClick={action.onClick} className="rounded-xl">{action.label}</Button>
      )}
    </div>
  );
}

function SpacesGrid({ user, loading, spaces, onNavigate }: any) {
  if (!user) return <EmptyCard message="Faça login para gerenciar seus espaços" action={{ label: "Fazer login", onClick: () => onNavigate("/login") }} />;
  if (loading) return (
    <div className="grid grid-cols-2 gap-2.5">
      {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />)}
    </div>
  );
  if (spaces.length === 0) return <EmptyCard message="Você ainda não segue nenhum espaço" action={{ label: "Explorar espaços", onClick: () => onNavigate("/spaces") }} />;
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {spaces.map((space: any, i: number) => {
        const SpaceIcon = getIconComponent(space.icon);
        return (
          <motion.button
            key={space.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i, 4) * 0.04 }}
            onClick={() => onNavigate(`/spaces/${space.slug}`)}
            className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-card border border-border/60 hover:border-border hover:bg-card/80 transition-all duration-200 text-left"
          >
            <div className="p-2 rounded-xl bg-secondary shrink-0">
              <SpaceIcon className="w-4 h-4" weight="bold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{space.name}</p>
              <p className="text-xs text-muted-foreground">{space.updates_count} atualizações</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
