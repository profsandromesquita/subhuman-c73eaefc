import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PodcastStats {
  likesCount: number;
  commentsCount: number;
  isLikedByUser: boolean;
}

export function usePodcastStats(podcastIds: string[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["podcast-stats", podcastIds, user?.id],
    queryFn: async (): Promise<Map<string, PodcastStats>> => {
      if (podcastIds.length === 0) return new Map();

      const likesPromise = supabase
        .from("podcast_likes")
        .select("podcast_id")
        .in("podcast_id", podcastIds);

      const commentsPromise = supabase
        .from("podcast_comments")
        .select("podcast_id")
        .in("podcast_id", podcastIds);

      const userLikesPromise = user
        ? supabase
            .from("podcast_likes")
            .select("podcast_id")
            .in("podcast_id", podcastIds)
            .eq("user_id", user.id)
        : null;

      const [likesResult, commentsResult, userLikesResult] = await Promise.all([
        likesPromise,
        commentsPromise,
        userLikesPromise,
      ]);

      const statsMap = new Map<string, PodcastStats>();

      // Initialize all IDs
      podcastIds.forEach((id) =>
        statsMap.set(id, { likesCount: 0, commentsCount: 0, isLikedByUser: false })
      );

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

      // Mark user likes
      if (userLikesResult?.data) {
        userLikesResult.data.forEach((row) => {
          const stat = statsMap.get(row.podcast_id);
          if (stat) stat.isLikedByUser = true;
        });
      }

      return statsMap;
    },
    enabled: podcastIds.length > 0,
    staleTime: 1000 * 60 * 2,
  });
}
