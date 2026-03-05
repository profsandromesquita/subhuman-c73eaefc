import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Logo } from "@/components/Logo";
import { PodcastCard } from "@/components/podcast/PodcastCard";
import { PodcastFilters } from "@/components/podcast/PodcastFilters";
import { usePodcasts, useListenedPodcasts } from "@/hooks/usePodcasts";
import { usePodcastStats } from "@/hooks/usePodcastStats";
import { Microphone } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Podcasts() {
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const { data: podcasts, isLoading } = usePodcasts(selectedSpaceId);
  const { data: listenedPodcasts } = useListenedPodcasts();

  const progressMap = new Map<string, { completed: boolean; progress_seconds: number }>();
  listenedPodcasts?.forEach(l => progressMap.set(l.podcast_id, l));
  const listenedSet = new Set(listenedPodcasts?.filter(l => l.completed).map(l => l.podcast_id) || []);

  const podcastIds = podcasts?.map(p => p.id) || [];
  const { data: statsMap } = usePodcastStats(podcastIds);

  return (
    <AppLayout>
      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="font-semibold">Podcast</h1>
          <Logo size="sm" />
        </div>
      </div>

      <div className="px-4 pt-5 pb-28 space-y-5 lg:px-10 lg:pt-8 lg:pb-10">
        {/* Desktop title */}
        <div className="hidden lg:block">
          <h1 className="text-3xl font-bold tracking-tight">Podcast</h1>
          <p className="text-muted-foreground mt-1">Ouça episódios sobre IA e tecnologia</p>
        </div>

        {/* Mobile subtitle */}
        <p className="text-sm text-muted-foreground lg:hidden">Ouça episódios sobre IA e tecnologia</p>

        <PodcastFilters selectedSpaceId={selectedSpaceId} onSpaceSelect={setSelectedSpaceId} />

        <div className="space-y-3 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-4 bg-card rounded-2xl animate-pulse">
                <div className="w-20 h-20 rounded-xl bg-secondary shrink-0" />
                <div className="flex-1 space-y-2.5 py-1">
                  <div className="h-4 w-3/4 bg-secondary rounded-lg" />
                  <div className="h-3 w-1/2 bg-secondary rounded-lg" />
                  <div className="h-3 w-1/4 bg-secondary rounded-lg" />
                </div>
              </div>
            ))
          ) : podcasts && podcasts.length > 0 ? (
            podcasts.map(podcast => (
              <PodcastCard
                key={podcast.id}
                podcast={podcast}
                isListened={listenedSet.has(podcast.id)}
                likesCount={statsMap?.get(podcast.id)?.likesCount}
                commentsCount={statsMap?.get(podcast.id)?.commentsCount}
                isLikedByUser={statsMap?.get(podcast.id)?.isLikedByUser}
                progressPercent={
                  progressMap.has(podcast.id) && podcast.duration_seconds
                    ? Math.round((progressMap.get(podcast.id)!.progress_seconds / podcast.duration_seconds) * 100)
                    : 0
                }
              />
            ))
          ) : (
            <div className="col-span-2 flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <Microphone className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">Nenhum podcast encontrado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedSpaceId ? "Não há episódios nesta categoria ainda" : "Novos episódios em breve"}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
