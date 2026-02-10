import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Podcast, formatDuration } from "@/hooks/usePodcasts";
import { Play, CheckCircle } from "@phosphor-icons/react";

interface PodcastCardProps {
  podcast: Podcast;
  isListened?: boolean;
  progressPercent?: number;
}

export function PodcastCard({ podcast, isListened, progressPercent = 0 }: PodcastCardProps) {
  const timeAgo = podcast.published_at
    ? formatDistanceToNow(new Date(podcast.published_at), {
        addSuffix: true,
        locale: ptBR,
      })
    : null;

  return (
    <Link
      to={`/podcasts/${podcast.slug}`}
      className="relative flex gap-4 p-4 bg-card rounded-xl hover:bg-elevated transition-colors overflow-hidden"
    >
      {/* Cover Image */}
      <div className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-secondary">
        {podcast.cover_url ? (
          <img
            src={podcast.cover_url}
            alt={podcast.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-8 h-8 text-muted-foreground" weight="fill" />
          </div>
        )}
        {/* Duration Badge */}
        <div className="absolute bottom-1 right-1 bg-background/80 backdrop-blur-sm text-xs font-medium px-1.5 py-0.5 rounded">
          {formatDuration(podcast.duration_seconds)}
        </div>
        {/* Listened indicator */}
        {isListened && (
          <div className="absolute top-1 left-1">
            <CheckCircle className="w-5 h-5 text-green-500" weight="fill" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-foreground line-clamp-1">
            {podcast.title}
          </h3>
          {podcast.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
              {podcast.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-2">
          {/* Tags */}
          {podcast.tags?.slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs bg-secondary hover:bg-secondary"
            >
              #{tag}
            </Badge>
          ))}
          
          {/* Space and Time */}
          <span className="text-xs text-muted-foreground">
            {podcast.spaces?.name}
            {timeAgo && ` · ${timeAgo}`}
          </span>
        </div>
      </div>

      {/* Progress bar at bottom */}
      {progressPercent > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/30">
          <div
            className={`h-full transition-all ${isListened ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      )}
    </Link>
  );
}
