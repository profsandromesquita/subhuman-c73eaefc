import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Heart, ChatCircle, PlayCircle } from "@phosphor-icons/react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getIconComponent } from "@/components/admin/IconPicker";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTime } from "@/lib/formatTime";
import { useSpace } from "@/hooks/useSpaces";
import { useSpaceUpdates } from "@/hooks/usePosts";
import { InfiniteScrollTrigger } from "@/components/InfiniteScrollTrigger";

const MAX_STAGGER_ITEMS = 4;
const STAGGER_DELAY = 0.04;

const SPACE_TAGLINES: Record<string, string> = {
  produtividade: "Produtividade não é trabalhar mais, é renderizar o resultado mais rápido.",
  marketing: "Marketing sem dados é arte; com IA, é ciência de conversão.",
  programacao: "Você não precisa ser sênior em Python, precisa ser sênior em resolver problemas.",
  audiovisual: "A qualidade de cinema agora cabe no orçamento de freelancer.",
  "estilo-vida": "A tecnologia deve servir ao humano, não o contrário.",
};

export default function SpaceDetail() {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const navigate = useNavigate();

  const { data: space, isLoading: loadingSpace } = useSpace(spaceSlug);
  const { data, isLoading: loadingUpdates, hasNextPage, isFetchingNextPage, fetchNextPage } = useSpaceUpdates(space?.id);
  const updates = data?.pages.flatMap((p) => p.items) ?? [];
  const loading = loadingSpace || loadingUpdates;

  if (loading) {
    return (
      <AppLayout>
        <div className="px-4 pt-4 pb-24 lg:px-10 lg:pt-8">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="w-9 h-9 rounded-xl" />
            <div><Skeleton className="h-5 w-40 mb-1" /><Skeleton className="h-3 w-24" /></div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!space) {
    return (
      <AppLayout>
        <div className="px-4 pt-8 text-center">
          <p className="text-muted-foreground mb-3">Espaço não encontrado</p>
          <Link to="/spaces" className="text-primary text-sm">Voltar para espaços</Link>
        </div>
      </AppLayout>
    );
  }

  const SpaceIcon = getIconComponent(space.icon);
  const tagline = spaceSlug ? SPACE_TAGLINES[spaceSlug] : null;

  return (
    <AppLayout>
      {/* ── Mobile sticky header ── */}
      <div className="lg:hidden sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-2 px-4 h-14">
          <Link to="/spaces" className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors rounded-xl">
            <ArrowLeft className="w-5 h-5" weight="bold" />
          </Link>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="p-1.5 rounded-lg bg-secondary shrink-0">
              <SpaceIcon className="w-4 h-4" weight="bold" />
            </div>
            <h1 className="font-semibold truncate">{space.name}</h1>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 pb-28 lg:px-10 lg:pt-8 lg:pb-10">
        <div className="lg:grid lg:grid-cols-[1fr_260px] lg:gap-10">

          {/* ── Main column ── */}
          <div>
            {/* Desktop header */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="hidden lg:flex items-center gap-4 mb-8">
              <Link to="/spaces" className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-accent">
                <ArrowLeft className="w-5 h-5" weight="bold" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-secondary">
                  <SpaceIcon className="w-6 h-6" weight="bold" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{space.name}</h1>
                  <p className="text-sm text-muted-foreground">{updates.length} publicações</p>
                </div>
              </div>
            </motion.div>

            {/* Tagline — mobile */}
            {tagline && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
                className="text-sm text-muted-foreground italic mb-5 leading-relaxed lg:hidden">
                "{tagline}"
              </motion.p>
            )}

            {/* Feed */}
            {updates.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">Nenhuma publicação ainda</div>
            ) : (
              <div className="space-y-3">
                {updates.map((update, i) => (
                  <motion.div key={update.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, MAX_STAGGER_ITEMS) * STAGGER_DELAY }}>
                    <button
                      onClick={() => navigate(`/spaces/${spaceSlug}/post/${(update as any).slug || update.id}`)}
                      className="w-full text-left group"
                    >
                      <div className="flex gap-3 p-4 rounded-2xl bg-card border border-border/60 hover:border-border hover:bg-card/80 transition-all duration-200 lg:p-5">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold leading-snug line-clamp-2 group-hover:text-foreground transition-colors lg:text-[15px]">
                            {update.title}
                          </h3>
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Heart className={`w-3.5 h-3.5 ${(update as any).is_liked ? "text-red-500" : ""}`} weight={(update as any).is_liked ? "fill" : "regular"} />
                                {update.likes_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <ChatCircle className="w-3.5 h-3.5" />
                                {update.comments_count}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                              <Clock className="w-3 h-3" />
                              <span>{formatTime(update.published_at || update.created_at)}</span>
                              <span>·</span>
                              <span>{(update as any).read_time_minutes ?? 1}min</span>
                            </div>
                          </div>
                        </div>
                        {update.thumbnail_url && (
                          <div className="relative w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0 bg-muted lg:w-28 lg:h-20 lg:rounded-2xl">
                            <img src={update.thumbnail_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                            {update.media_type === "video" && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <PlayCircle className="w-7 h-7 text-white" weight="fill" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  </motion.div>
                ))}
                <InfiniteScrollTrigger hasNextPage={hasNextPage} isFetchingNextPage={isFetchingNextPage} fetchNextPage={fetchNextPage} />
              </div>
            )}
          </div>

          {/* ── Right sidebar — desktop ── */}
          <aside className="hidden lg:block">
            <div className="sticky top-8 space-y-5">
              <div className="rounded-2xl border border-border/60 bg-card/50 p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-secondary">
                    <SpaceIcon className="w-5 h-5" weight="bold" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{space.name}</h3>
                    <p className="text-xs text-muted-foreground">{updates.length} publicações</p>
                  </div>
                </div>
                {space.description && <p className="text-sm text-muted-foreground leading-relaxed">{space.description}</p>}
                {tagline && (
                  <p className="text-xs text-muted-foreground/60 italic border-t border-border/40 pt-4 leading-relaxed">
                    “{tagline}”
                  </p>
                )}
              </div>
              <Link to="/spaces" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-1 group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Todos os espaços
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
