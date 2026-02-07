import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BookmarkSimple, MusicNote } from "@phosphor-icons/react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useSavedArticles,
  useSavedPodcasts,
  useRemoveSavedArticle,
  useRemoveSavedPodcast,
} from "@/hooks/useSavedContent";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatDuration(seconds: number | null) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <BookmarkSimple className="w-10 h-10 mb-3" weight="thin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function SavedArticlesList() {
  const { data: articles, isLoading } = useSavedArticles();
  const removeMutation = useRemoveSavedArticle();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!articles?.length) {
    return <EmptyState label="Nenhum artigo salvo ainda" />;
  }

  return (
    <div className="space-y-2 mt-4">
      {articles.map((article, index) => (
        <motion.div
          key={article.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          className="flex items-center gap-3 p-3 rounded-xl bg-card cursor-pointer active:opacity-80 transition-opacity"
          onClick={() =>
            navigate(`/spaces/${article.spaceSlug}/post/${article.postSlug}`)
          }
        >
          {article.thumbnailUrl ? (
            <img
              src={article.thumbnailUrl}
              alt=""
              className="w-12 h-12 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-muted shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{article.title}</p>
            <p className="text-xs text-muted-foreground">
              Salvo{" "}
              {formatDistanceToNow(new Date(article.savedAt), {
                addSuffix: true,
                locale: ptBR,
              })}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              removeMutation.mutate(article.id, {
                onSuccess: () => toast.success("Artigo removido dos salvos"),
              });
            }}
          >
            <BookmarkSimple className="w-5 h-5" weight="fill" />
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

function SavedPodcastsList() {
  const { data: podcasts, isLoading } = useSavedPodcasts();
  const removeMutation = useRemoveSavedPodcast();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!podcasts?.length) {
    return <EmptyState label="Nenhum podcast salvo ainda" />;
  }

  return (
    <div className="space-y-2 mt-4">
      {podcasts.map((podcast, index) => (
        <motion.div
          key={podcast.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          className="flex items-center gap-3 p-3 rounded-xl bg-card cursor-pointer active:opacity-80 transition-opacity"
          onClick={() => navigate(`/podcasts/${podcast.slug}`)}
        >
          {podcast.coverUrl ? (
            <img
              src={podcast.coverUrl}
              alt=""
              className="w-12 h-12 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-muted shrink-0 flex items-center justify-center">
              <MusicNote className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{podcast.title}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {podcast.durationSeconds && (
                <span>{formatDuration(podcast.durationSeconds)}</span>
              )}
              <span>
                Salvo{" "}
                {formatDistanceToNow(new Date(podcast.savedAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              removeMutation.mutate(podcast.id, {
                onSuccess: () => toast.success("Podcast removido dos salvos"),
              });
            }}
          >
            <BookmarkSimple className="w-5 h-5" weight="fill" />
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export default function SavedContent() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate("/profile")}
          >
            <ArrowLeft className="w-5 h-5" weight="bold" />
          </Button>
          <h1 className="text-xl font-bold">Conteúdos salvos</h1>
        </div>

        <Tabs defaultValue="articles">
          <TabsList className="w-full">
            <TabsTrigger value="articles" className="flex-1">
              Artigos
            </TabsTrigger>
            <TabsTrigger value="podcasts" className="flex-1">
              Podcasts
            </TabsTrigger>
          </TabsList>
          <TabsContent value="articles">
            <SavedArticlesList />
          </TabsContent>
          <TabsContent value="podcasts">
            <SavedPodcastsList />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
