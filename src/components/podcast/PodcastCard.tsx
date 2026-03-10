import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Podcast, formatDuration } from "@/hooks/usePodcasts";
import { Play, CheckCircle, Heart, ChatCircle, Clock } from "@phosphor-icons/react";

interface PodcastCardProps {
  podcast: Podcast;
  isListened?: boolean;
  progressPercent?: number;
  likesCount?: number;
  commentsCount?: number;
  isLikedByUser?: boolean;
}

export function PodcastCard({ podcast, isListened, progressPercent = 0, likesCount = 0, commentsCount = 0, isLikedByUser = false }: PodcastCardProps) {
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

  return (
    <Link to={`/podcasts/${podcast.slug}`} className="block">
      <Card className="relative p-3 lg:p-4 cursor-pointer hover:bg-white/5 border-border/60 hover:border-border transition-all duration-200 overflow-hidden">
        <div className="flex gap-3">
          {/* Text content — left side */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              {podcast.spaces?.name && (
                <Badge variant="secondary" className="mb-2 text-xs">{podcast.spaces.name}</Badge>
              )}
              <h3 className="font-medium text-sm leading-snug line-clamp-2 lg:text-[15px]">
                {podcast.title}
              </h3>
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <div className={`flex items-center gap-1 ${isLikedByUser ? 'text-red-500' : ''}`}>
                <Heart className="h-3.5 w-3.5" weight={isLikedByUser ? "fill" : "regular"} />
                <span>{likesCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <ChatCircle className="h-3.5 w-3.5" />
                <span>{commentsCount}</span>
              </div>
              <span className="text-border">·</span>
              <span>{formatTime(podcast.published_at)}</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatDuration(podcast.duration_seconds)}</span>
              </div>
            </div>
          </div>

          {/* Thumbnail — right side */}
          <div className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-secondary lg:w-24 lg:h-24 lg:rounded-2xl">
            {podcast.cover_url ? (
              <img
                src={podcast.cover_url}
                alt={podcast.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="w-8 h-8 text-muted-foreground" weight="fill" />
              </div>
            )}
            {isListened && (
              <div className="absolute top-1 left-1">
                <CheckCircle className="w-5 h-5 text-green-500" weight="fill" />
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/30">
            <div
              className={`h-full transition-all ${isListened ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        )}
      </Card>
    </Link>
  );
}
