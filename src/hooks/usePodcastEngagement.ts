import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface PodcastComment {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
  likesCount: number;
  isLiked: boolean;
  userId?: string;
  replies: PodcastComment[];
}

interface PodcastEngagementData {
  likesCount: number;
  isLiked: boolean;
  isSaved: boolean;
  comments: PodcastComment[];
}

export function usePodcastEngagement(podcastId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["podcast-engagement", podcastId, user?.id],
    queryFn: async (): Promise<PodcastEngagementData> => {
      if (!podcastId) return { likesCount: 0, isLiked: false, isSaved: false, comments: [] };

      // Parallel fetch: likes count, user like, user save, comments
      const [likesCountResult, userLikeResult, userSaveResult, commentsResult] =
        await Promise.all([
          supabase
            .from("podcast_likes")
            .select("id", { count: "exact", head: true })
            .eq("podcast_id", podcastId),
          user
            ? supabase.from("podcast_likes").select("id").eq("podcast_id", podcastId).eq("user_id", user.id).maybeSingle()
            : Promise.resolve({ data: null }),
          user
            ? supabase.from("saved_podcasts").select("id").eq("podcast_id", podcastId).eq("user_id", user.id).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase
            .from("podcast_comments")
            .select("id, content, user_id, parent_id, created_at")
            .eq("podcast_id", podcastId)
            .order("created_at", { ascending: false })
            .limit(100),
        ]);

      // Process comments
      let comments: PodcastComment[] = [];
      const commentsData = commentsResult.data || [];

      if (commentsData.length > 0) {
        const commentIds = commentsData.map((c) => c.id);
        const uniqueUserIds = [...new Set(commentsData.map((c) => c.user_id))];

        const [profilesResult, commentLikesResult, userCommentLikesResult] = await Promise.all([
          supabase.from("profiles").select("id, full_name").in("id", uniqueUserIds),
          supabase.from("podcast_comment_likes").select("comment_id").in("comment_id", commentIds),
          user
            ? supabase.from("podcast_comment_likes").select("comment_id").in("comment_id", commentIds).eq("user_id", user.id)
            : Promise.resolve({ data: [] }),
        ]);

        const profilesMap = new Map(profilesResult.data?.map((p) => [p.id, p.full_name]) || []);

        const likesCountMap: Record<string, number> = {};
        (commentLikesResult.data || []).forEach((like) => {
          likesCountMap[like.comment_id] = (likesCountMap[like.comment_id] || 0) + 1;
        });

        const userLikedSet = new Set(
          (userCommentLikesResult.data || []).map((l: any) => l.comment_id)
        );

        const commentsWithLikes = commentsData.map((comment) => ({
          id: comment.id,
          content: comment.content,
          authorName: profilesMap.get(comment.user_id) || "Usuário",
          createdAt: formatDistanceToNow(new Date(comment.created_at!), { addSuffix: false, locale: ptBR }),
          likesCount: likesCountMap[comment.id] || 0,
          isLiked: userLikedSet.has(comment.id),
          userId: comment.user_id,
          parentId: comment.parent_id,
          replies: [] as PodcastComment[],
        }));

        const parentComments: PodcastComment[] = [];
        const replyMap = new Map<string, PodcastComment[]>();

        commentsWithLikes.forEach((comment) => {
          if ((comment as any).parentId) {
            const existing = replyMap.get((comment as any).parentId) || [];
            existing.push({ ...comment, replies: [] });
            replyMap.set((comment as any).parentId, existing);
          } else {
            parentComments.push(comment);
          }
        });

        parentComments.forEach((parent) => {
          parent.replies = replyMap.get(parent.id) || [];
        });

        comments = parentComments;
      }

      return {
        likesCount: likesCountResult.count || 0,
        isLiked: !!userLikeResult.data,
        isSaved: !!userSaveResult.data,
        comments,
      };
    },
    enabled: !!podcastId,
    staleTime: 1000 * 60 * 2,
  });
}
