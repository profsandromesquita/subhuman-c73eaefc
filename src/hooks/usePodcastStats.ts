import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PodcastStats {
  likesCount: number;
  commentsCount: number;
}

export function usePodcastStats(podcastIds: string[]) {
  return useQuery({
    queryKey: ["podcast-stats", podcastIds],
    queryFn: async (): Promise<Map<string, PodcastStats>> => {
      if (podcastIds.length === 0) return new Map();

      const [likesResult, commentsResult] = await Promise.all([
        supabase
          .from("podcast_likes")
          .select("podcast_id")
          .in("podcast_id", podcastIds),
        supabase
          .from("podcast_comments")
          .select("podcast_id")
          .in("podcast_id", podcastIds),
      ]);

      const statsMap = new Map<string, PodcastStats>();

      // Initialize all IDs
      podcastIds.forEach((id) => statsMap.set(id, { likesCount: 0, commentsCount: 0 }));

      // Count likes
      (likesResult.data || []).forEach((row) => {
        const stat = statsMap.get(row.podcast_id)!;
        stat.likesCount++;
      });

      // Count comments
      (commentsResult.data || []).forEach((row) => {
        const stat = statsMap.get(row.podcast_id)!;
        stat.commentsCount++;
      });

      return statsMap;
    },
    enabled: podcastIds.length > 0,
    staleTime: 1000 * 60 * 2,
  });
}
