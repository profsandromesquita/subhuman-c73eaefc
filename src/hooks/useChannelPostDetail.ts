import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ChannelPostComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author_name: string;
  author_avatar: string | null;
  parent_id: string | null;
  likes_count: number;
  is_liked: boolean;
  replies: ChannelPostComment[];
}

interface ChannelPost {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  author_id: string | null;
  author_name: string | null;
  author_avatar: string | null;
  channel_name: string;
}

interface ChannelPostDetailData {
  post: ChannelPost;
  media: any[];
  comments: ChannelPostComment[];
  likesCount: number;
  isLiked: boolean;
}

export function useChannelPostDetail(postId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["channel-post-detail", postId, user?.id],
    queryFn: async (): Promise<ChannelPostDetailData | null> => {
      if (!postId) return null;

      // Fetch post with channel name
      const { data: postData, error: postError } = await supabase
        .from("channel_posts")
        .select("*")
        .eq("id", postId)
        .single();

      if (postError || !postData) {
        console.error("Erro ao buscar post do canal:", postError);
        return null;
      }

      // Parallel fetch: author, likes count, media, comments, user like
      const [authorResult, likesCountResult, mediaResult, commentsResult, userLikeResult, channelResult] =
        await Promise.all([
          postData.author_id
            ? supabase
                .from("profiles")
                .select("full_name, avatar_url")
                .eq("id", postData.author_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          supabase
            .from("channel_post_likes")
            .select("id", { count: "exact", head: true })
            .eq("post_id", postId),
          supabase
            .from("channel_post_media")
            .select("*")
            .eq("post_id", postId)
            .order("sort_order", { ascending: true }),
          supabase
            .from("channel_post_comments")
            .select("*")
            .eq("post_id", postId)
            .order("created_at", { ascending: true })
            .limit(100),
          user
            ? supabase
                .from("channel_post_likes")
                .select("id")
                .eq("post_id", postId)
                .eq("user_id", user.id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          supabase
            .from("channels")
            .select("name")
            .eq("id", postData.channel_id)
            .maybeSingle(),
        ]);

      // Process comments
      let comments: ChannelPostComment[] = [];
      const commentsData = commentsResult.data || [];

      if (commentsData.length > 0) {
        const commentIds = commentsData.map((c) => c.id);
        const uniqueUserIds = [...new Set(commentsData.map((c) => c.user_id))];

        const [profilesResult, commentLikesResult, userCommentLikesResult] = await Promise.all([
          supabase.from("profiles").select("id, full_name, avatar_url").in("id", uniqueUserIds),
          supabase.from("channel_post_comment_likes").select("comment_id").in("comment_id", commentIds),
          user
            ? supabase.from("channel_post_comment_likes").select("comment_id").in("comment_id", commentIds).eq("user_id", user.id)
            : Promise.resolve({ data: [] }),
        ]);

        const profilesMap = new Map(
          profilesResult.data?.map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]) || []
        );

        const likesCountMap: Record<string, number> = {};
        (commentLikesResult.data || []).forEach((like) => {
          likesCountMap[like.comment_id] = (likesCountMap[like.comment_id] || 0) + 1;
        });

        const userLikedSet = new Set(
          (userCommentLikesResult.data || []).map((l: any) => l.comment_id)
        );

        const enrichedComments = commentsData.map((comment) => {
          const profile = profilesMap.get(comment.user_id);
          return {
            id: comment.id,
            content: comment.content,
            created_at: comment.created_at || new Date().toISOString(),
            user_id: comment.user_id,
            author_name: profile?.full_name || "Usuário",
            author_avatar: profile?.avatar_url || null,
            parent_id: comment.parent_id,
            likes_count: likesCountMap[comment.id] || 0,
            is_liked: userLikedSet.has(comment.id),
            replies: [] as ChannelPostComment[],
          };
        });

        const commentMap = new Map<string, ChannelPostComment>();
        const rootComments: ChannelPostComment[] = [];

        enrichedComments.forEach((comment) => commentMap.set(comment.id, comment));
        enrichedComments.forEach((comment) => {
          if (comment.parent_id && commentMap.has(comment.parent_id)) {
            commentMap.get(comment.parent_id)!.replies.push(comment);
          } else {
            rootComments.push(comment);
          }
        });

        comments = rootComments;
      }

      return {
        post: {
          id: postData.id,
          title: (postData as any).title || null,
          content: postData.content,
          created_at: postData.created_at,
          author_id: postData.author_id,
          author_name: authorResult.data?.full_name || "Usuário",
          author_avatar: authorResult.data?.avatar_url || null,
          channel_name: channelResult.data?.name || "Canal",
        },
        media: mediaResult.data || [],
        comments,
        likesCount: likesCountResult.count || 0,
        isLiked: !!userLikeResult.data,
      };
    },
    enabled: !!postId,
    staleTime: 1000 * 60 * 2,
  });
}
