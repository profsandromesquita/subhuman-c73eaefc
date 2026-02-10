import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Author {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  education: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
}

interface Post {
  id: string;
  title: string;
  content: string | null;
  thumbnail_url: string | null;
  media_type: string | null;
  published_at: string | null;
  created_at: string;
  author_id: string | null;
  author: Author | null;
  space: {
    name: string;
    slug: string;
  };
}

export interface PostComment {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
  likesCount: number;
  isLiked: boolean;
  userId?: string;
  replies: PostComment[];
}

interface PostDetailData {
  post: Post;
  likesCount: number;
  media: any[];
  comments: PostComment[];
  isLiked: boolean;
  isSaved: boolean;
}

export function usePostDetail(spaceSlug: string | undefined, postSlug: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["post-detail", spaceSlug, postSlug, user?.id],
    queryFn: async (): Promise<PostDetailData | null> => {
      if (!spaceSlug || !postSlug) return null;

      // Unified query: post + space in one call
      const { data: postData, error: postError } = await supabase
        .from("space_updates")
        .select(`
          id, title, slug, content, thumbnail_url, media_type,
          published_at, created_at, author_id,
          spaces!inner(name, slug)
        `)
        .eq("spaces.slug", spaceSlug)
        .eq("slug", postSlug)
        .eq("is_published", true)
        .maybeSingle();

      if (postError || !postData) return null;

      // Parallel fetch: author, likes count, media, comments, user interactions
      const [authorResult, likesCountResult, mediaResult, commentsResult, userLikeResult, userSaveResult] =
        await Promise.all([
          postData.author_id
            ? supabase
                .from("profiles")
                .select("id, full_name, avatar_url, bio, education, instagram_url, linkedin_url")
                .eq("id", postData.author_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          supabase
            .from("update_likes")
            .select("id", { count: "exact", head: true })
            .eq("update_id", postData.id),
          supabase
            .from("space_update_media")
            .select("*")
            .eq("update_id", postData.id)
            .order("sort_order"),
          supabase
            .from("update_comments")
            .select("id, content, user_id, parent_id, created_at")
            .eq("update_id", postData.id)
            .order("created_at", { ascending: false })
            .limit(100),
          user
            ? supabase
                .from("update_likes")
                .select("id")
                .eq("update_id", postData.id)
                .eq("user_id", user.id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          user
            ? supabase
                .from("saved_updates")
                .select("id")
                .eq("update_id", postData.id)
                .eq("user_id", user.id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

      // Process comments
      let comments: PostComment[] = [];
      const commentsData = commentsResult.data || [];

      if (commentsData.length > 0) {
        const commentIds = commentsData.map((c) => c.id);
        const uniqueUserIds = [...new Set(commentsData.map((c) => c.user_id))];

        const [profilesResult, commentLikesResult, userCommentLikesResult] = await Promise.all([
          supabase.from("profiles").select("id, full_name").in("id", uniqueUserIds),
          supabase.from("comment_likes").select("comment_id").in("comment_id", commentIds),
          user
            ? supabase.from("comment_likes").select("comment_id").in("comment_id", commentIds).eq("user_id", user.id)
            : Promise.resolve({ data: [] }),
        ]);

        const profilesMap = new Map(
          profilesResult.data?.map((p) => [p.id, p.full_name]) || []
        );

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
          replies: [] as PostComment[],
        }));

        const parentComments: PostComment[] = [];
        const replyMap = new Map<string, PostComment[]>();

        commentsWithLikes.forEach((comment) => {
          if (comment.parentId) {
            const existing = replyMap.get(comment.parentId) || [];
            existing.push({ ...comment, replies: [] });
            replyMap.set(comment.parentId, existing);
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
        post: {
          ...postData,
          author_id: postData.author_id,
          author: authorResult.data as Author | null,
          space: postData.spaces as { name: string; slug: string },
        },
        likesCount: likesCountResult.count || 0,
        media: mediaResult.data || [],
        comments,
        isLiked: !!userLikeResult.data,
        isSaved: !!userSaveResult.data,
      };
    },
    enabled: !!spaceSlug && !!postSlug,
    staleTime: 1000 * 60 * 2,
  });
}
