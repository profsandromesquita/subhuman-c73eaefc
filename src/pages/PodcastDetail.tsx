import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PodcastPlayer } from "@/components/podcast/PodcastPlayer";
import { usePodcast } from "@/hooks/usePodcasts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PodcastDetail() {
  const { podcastId } = useParams<{ podcastId: string }>();
  const navigate = useNavigate();
  const { data: podcast, isLoading } = usePodcast(podcastId || "");

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 pt-8 pb-24 space-y-6 animate-pulse">
          <div className="h-8 w-24 bg-secondary rounded" />
          <div className="aspect-video w-full rounded-2xl bg-secondary" />
          <div className="h-8 w-3/4 bg-secondary rounded mx-auto" />
          <div className="h-4 w-1/2 bg-secondary rounded mx-auto" />
          <div className="h-12 w-full bg-secondary rounded" />
        </div>
      </AppLayout>
    );
  }

  if (!podcast) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 pt-8 pb-24 flex flex-col items-center justify-center py-16 text-center">
          <h3 className="font-medium text-foreground">Podcast não encontrado</h3>
          <Button
            variant="ghost"
            onClick={() => navigate("/podcasts")}
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  const timeAgo = podcast.published_at
    ? formatDistanceToNow(new Date(podcast.published_at), {
        addSuffix: true,
        locale: ptBR,
      })
    : null;

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-8 pb-24 space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/podcasts")}
          className="p-0 h-auto hover:bg-transparent"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </Button>

        {/* Player */}
        <PodcastPlayer
          audioUrl={podcast.audio_url}
          title={podcast.title}
          coverUrl={podcast.cover_url}
        />

        {/* Info */}
        <div className="space-y-4 text-center">
          <h1 className="text-2xl font-bold text-foreground">{podcast.title}</h1>
          
          {podcast.spaces && (
            <p className="text-sm text-muted-foreground">
              {podcast.spaces.name}
              {timeAgo && ` · ${timeAgo}`}
            </p>
          )}

          {/* Tags */}
          {podcast.tags && podcast.tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {podcast.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs"
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Description */}
          {podcast.description && (
            <div className="text-muted-foreground text-left mt-6 whitespace-pre-wrap leading-relaxed">
              {podcast.description}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
