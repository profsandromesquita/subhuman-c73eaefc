import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Logo } from "@/components/Logo";
import { PodcastCard } from "@/components/podcast/PodcastCard";
import { PodcastFilters } from "@/components/podcast/PodcastFilters";
import { usePodcasts } from "@/hooks/usePodcasts";
import { Microphone } from "@phosphor-icons/react";

export default function Podcasts() {
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const { data: podcasts, isLoading } = usePodcasts(selectedSpaceId);

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-8 pb-24 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground">Podcast</h1>
            <Logo size="sm" />
          </div>
          <p className="text-muted-foreground mt-1">
            Ouça episódios sobre IA e tecnologia
          </p>
        </div>

        {/* Filters */}
        <PodcastFilters
          selectedSpaceId={selectedSpaceId}
          onSpaceSelect={setSelectedSpaceId}
        />

        {/* Podcast List */}
        <div className="space-y-3">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-4 p-4 bg-card rounded-xl animate-pulse"
              >
                <div className="w-20 h-20 rounded-lg bg-secondary" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 bg-secondary rounded" />
                  <div className="h-4 w-1/2 bg-secondary rounded" />
                  <div className="h-4 w-1/4 bg-secondary rounded" />
                </div>
              </div>
            ))
          ) : podcasts && podcasts.length > 0 ? (
            podcasts.map((podcast) => (
              <PodcastCard key={podcast.id} podcast={podcast} />
            ))
          ) : (
            // Empty state
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Microphone className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground">
                Nenhum podcast encontrado
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedSpaceId
                  ? "Não há episódios nesta categoria ainda"
                  : "Novos episódios em breve"}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
