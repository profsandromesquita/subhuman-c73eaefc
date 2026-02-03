import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface SpaceUpdate {
  id: string;
  title: string;
  content: string | null;
  thumbnail_url: string | null;
  media_type: string | null;
  published_at: string | null;
  created_at: string;
  space_id: string;
  space_name?: string;
  space_slug?: string;
  likes_count: number;
  comments_count: number;
  is_liked?: boolean;
}

interface ChannelPost {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  channel_id: string;
  author_id: string | null;
  author_name: string;
  author_avatar: string | null;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  thumbnail_url: string | null;
}

// Fetch space updates with engagement counts (optimized - no N+1)
export function useSpaceUpdates(spaceId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["space-updates", spaceId, user?.id],
    queryFn: async (): Promise<SpaceUpdate[]> => {
      if (!spaceId) return [];

      // Fetch updates
      const { data: updates, error } = await supabase
        .from("space_updates")
        .select("id, title, content, thumbnail_url, media_type, published_at, created_at, space_id")
        .eq("space_id", spaceId)
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (error) throw error;
      if (!updates || updates.length === 0) return [];

      const updateIds = updates.map((u) => u.id);

      // Batch fetch likes and comments
      const [likesResult, commentsResult, userLikesResult] = await Promise.all([
        supabase.from("update_likes").select("update_id").in("update_id", updateIds),
        supabase.from("update_comments").select("update_id").in("update_id", updateIds),
        user
          ? supabase
              .from("update_likes")
              .select("update_id")
              .in("update_id", updateIds)
              .eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
      ]);

      // Count likes and comments per update
      const likesMap: Record<string, number> = {};
      const commentsMap: Record<string, number> = {};
      const userLikedSet = new Set<string>();

      likesResult.data?.forEach((like) => {
        likesMap[like.update_id] = (likesMap[like.update_id] || 0) + 1;
      });

      commentsResult.data?.forEach((comment) => {
        commentsMap[comment.update_id] = (commentsMap[comment.update_id] || 0) + 1;
      });

      userLikesResult.data?.forEach((like) => {
        userLikedSet.add(like.update_id);
      });

      return updates.map((update) => ({
        ...update,
        likes_count: likesMap[update.id] || 0,
        comments_count: commentsMap[update.id] || 0,
        is_liked: userLikedSet.has(update.id),
      }));
    },
    enabled: !!spaceId,
  });
}

// Fetch highlights (recent popular updates from subscribed spaces)
export function useHighlights() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["highlights", user?.id],
    queryFn: async (): Promise<SpaceUpdate[]> => {
      if (!user) return [];

      // Get subscribed spaces
      const { data: subscriptions } = await supabase
        .from("user_space_subscriptions")
        .select("space_id")
        .eq("user_id", user.id);

      if (!subscriptions || subscriptions.length === 0) return [];

      const spaceIds = subscriptions.map((s) => s.space_id);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Fetch recent updates from subscribed spaces
      const { data: updates, error } = await supabase
        .from("space_updates")
        .select(`
          id, title, content, thumbnail_url, media_type, published_at, space_id,
          spaces!inner(name, slug)
        `)
        .in("space_id", spaceIds)
        .eq("is_published", true)
        .gte("published_at", thirtyDaysAgo.toISOString())
        .order("published_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!updates || updates.length === 0) return [];

      const updateIds = updates.map((u) => u.id);

      // Batch fetch engagement
      const [likesResult, commentsResult] = await Promise.all([
        supabase.from("update_likes").select("update_id").in("update_id", updateIds),
        supabase.from("update_comments").select("update_id").in("update_id", updateIds),
      ]);

      const likesMap: Record<string, number> = {};
      const commentsMap: Record<string, number> = {};

      likesResult.data?.forEach((like) => {
        likesMap[like.update_id] = (likesMap[like.update_id] || 0) + 1;
      });

      commentsResult.data?.forEach((comment) => {
        commentsMap[comment.update_id] = (commentsMap[comment.update_id] || 0) + 1;
      });

      const highlightsData = updates.map((update) => ({
        id: update.id,
        title: update.title,
        content: update.content,
        thumbnail_url: update.thumbnail_url,
        media_type: update.media_type,
        published_at: update.published_at,
        created_at: update.published_at || "",
        space_id: update.space_id,
        space_name: (update.spaces as any)?.name || "",
        space_slug: (update.spaces as any)?.slug || "",
        likes_count: likesMap[update.id] || 0,
        comments_count: commentsMap[update.id] || 0,
      }));

      // Sort by engagement
      return highlightsData
        .sort((a, b) => {
          const engagementA = a.likes_count + a.comments_count;
          const engagementB = b.likes_count + b.comments_count;
          if (engagementB === engagementA) {
            return (
              new Date(b.published_at || 0).getTime() -
              new Date(a.published_at || 0).getTime()
            );
          }
          return engagementB - engagementA;
        })
        .slice(0, 5);
    },
    enabled: !!user,
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60 * 2,
  });
}

// Fetch channel posts with engagement (optimized - no N+1)
export function useChannelPosts(channelId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["channel-posts", channelId, user?.id],
    queryFn: async (): Promise<ChannelPost[]> => {
      if (!channelId) return [];

      // Fetch posts
      const { data: posts, error } = await supabase
        .from("channel_posts")
        .select("id, title, content, created_at, channel_id, author_id")
        .eq("channel_id", channelId)
        .eq("is_moderated", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!posts || posts.length === 0) return [];

      const postIds = posts.map((p) => p.id);
      const authorIds = [...new Set(posts.map((p) => p.author_id).filter(Boolean))] as string[];

      // Batch fetch all related data
      const [profilesResult, likesResult, commentsResult, mediaResult, userLikesResult] =
        await Promise.all([
          authorIds.length > 0
            ? supabase
                .from("profiles")
                .select("id, full_name, avatar_url")
                .in("id", authorIds)
            : Promise.resolve({ data: [] }),
          supabase.from("channel_post_likes").select("post_id").in("post_id", postIds),
          supabase.from("channel_post_comments").select("post_id").in("post_id", postIds),
          supabase
            .from("channel_post_media")
            .select("post_id, file_url")
            .in("post_id", postIds)
            .in("file_type", ["image", "video"])
            .order("sort_order", { ascending: true }),
          user
            ? supabase
                .from("channel_post_likes")
                .select("post_id")
                .in("post_id", postIds)
                .eq("user_id", user.id)
            : Promise.resolve({ data: [] }),
        ]);

      // Build maps for quick lookup
      const profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }> =
        {};
      profilesResult.data?.forEach((p) => {
        profilesMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
      });

      const likesMap: Record<string, number> = {};
      likesResult.data?.forEach((like) => {
        likesMap[like.post_id] = (likesMap[like.post_id] || 0) + 1;
      });

      const commentsMap: Record<string, number> = {};
      commentsResult.data?.forEach((comment) => {
        commentsMap[comment.post_id] = (commentsMap[comment.post_id] || 0) + 1;
      });

      const mediaMap: Record<string, string> = {};
      mediaResult.data?.forEach((media) => {
        if (!mediaMap[media.post_id]) {
          mediaMap[media.post_id] = media.file_url;
        }
      });

      const userLikedSet = new Set<string>();
      userLikesResult.data?.forEach((like) => {
        userLikedSet.add(like.post_id);
      });

      return posts.map((post) => {
        const profile = post.author_id ? profilesMap[post.author_id] : null;
        return {
          id: post.id,
          title: (post as any).title || null,
          content: post.content,
          created_at: post.created_at,
          channel_id: post.channel_id,
          author_id: post.author_id,
          author_name: profile?.full_name || "Usuário",
          author_avatar: profile?.avatar_url || null,
          likes_count: likesMap[post.id] || 0,
          comments_count: commentsMap[post.id] || 0,
          is_liked: userLikedSet.has(post.id),
          thumbnail_url: mediaMap[post.id] || null,
        };
      });
    },
    enabled: !!channelId,
  });
}

// Fetch recent discussions for home page
export function useRecentDiscussions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recent-discussions", user?.id],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: posts, error } = await supabase
        .from("channel_posts")
        .select(`
          id, title, content, created_at, channel_id, author_id,
          channels!inner(name, slug),
          profiles:author_id(full_name)
        `)
        .eq("is_moderated", false)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!posts || posts.length === 0) return [];

      const postIds = posts.map((p) => p.id);

      const [likesResult, commentsResult, mediaResult] = await Promise.all([
        supabase.from("channel_post_likes").select("post_id").in("post_id", postIds),
        supabase.from("channel_post_comments").select("post_id").in("post_id", postIds),
        supabase
          .from("channel_post_media")
          .select("post_id, file_url")
          .in("post_id", postIds)
          .in("file_type", ["image", "video"]),
      ]);

      const likesMap: Record<string, number> = {};
      const commentsMap: Record<string, number> = {};
      const mediaMap: Record<string, string> = {};

      likesResult.data?.forEach((like) => {
        likesMap[like.post_id] = (likesMap[like.post_id] || 0) + 1;
      });

      commentsResult.data?.forEach((comment) => {
        commentsMap[comment.post_id] = (commentsMap[comment.post_id] || 0) + 1;
      });

      mediaResult.data?.forEach((media) => {
        if (!mediaMap[media.post_id]) {
          mediaMap[media.post_id] = media.file_url;
        }
      });

      const discussions = posts.map((post) => ({
        id: post.id,
        title: (post as any).title || post.content.substring(0, 100),
        content: post.content,
        created_at: post.created_at,
        channel_id: post.channel_id,
        channel_name: (post.channels as any)?.name || "",
        channel_slug: (post.channels as any)?.slug || "",
        author_name: (post.profiles as any)?.full_name || "Usuário",
        likes_count: likesMap[post.id] || 0,
        comments_count: commentsMap[post.id] || 0,
        thumbnail_url: mediaMap[post.id] || null,
      }));

      // Sort by engagement
      return discussions
        .sort((a, b) => {
          const engA = a.likes_count + a.comments_count;
          const engB = b.likes_count + b.comments_count;
          if (engB === engA) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return engB - engA;
        })
        .slice(0, 5);
    },
    enabled: !!user,
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60 * 2,
  });
}

// Like/unlike a space update (article)
export function useLikeSpaceUpdate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ updateId, isLiked }: { updateId: string; isLiked: boolean }) => {
      if (!user) throw new Error("User not authenticated");

      if (isLiked) {
        await supabase
          .from("update_likes")
          .delete()
          .eq("update_id", updateId)
          .eq("user_id", user.id);
      } else {
        await supabase.from("update_likes").insert({ update_id: updateId, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["highlights"] });
      queryClient.invalidateQueries({ queryKey: ["space-updates"] });
    },
  });
}

// Add comment to a space update
export function useAddSpaceUpdateComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      updateId,
      content,
      parentId,
    }: {
      updateId: string;
      content: string;
      parentId?: string;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("update_comments").insert({
        update_id: updateId,
        user_id: user.id,
        content,
        parent_id: parentId || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["highlights"] });
      queryClient.invalidateQueries({ queryKey: ["space-updates"] });
    },
  });
}

// Like/unlike a channel post
export function useLikeChannelPost() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (!user) throw new Error("User not authenticated");

      if (isLiked) {
        await supabase
          .from("channel_post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else {
        await supabase.from("channel_post_likes").insert({ post_id: postId, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-posts"] });
      queryClient.invalidateQueries({ queryKey: ["recent-discussions"] });
    },
  });
}

// Hook para deletar publicação de canal
export function useDeleteChannelPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      // Primeiro buscar IDs dos comentários para deletar os likes dos comentários
      const { data: commentIds } = await supabase
        .from("channel_post_comments")
        .select("id")
        .eq("post_id", postId);

      // Deletar likes dos comentários
      if (commentIds && commentIds.length > 0) {
        await supabase
          .from("channel_post_comment_likes")
          .delete()
          .in("comment_id", commentIds.map(c => c.id));
      }

      // Deletar comentários
      await supabase
        .from("channel_post_comments")
        .delete()
        .eq("post_id", postId);

      // Deletar likes do post
      await supabase
        .from("channel_post_likes")
        .delete()
        .eq("post_id", postId);

      // Deletar mídia
      await supabase
        .from("channel_post_media")
        .delete()
        .eq("post_id", postId);

      // Finalmente deletar o post
      const { error } = await supabase
        .from("channel_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-posts"] });
      queryClient.invalidateQueries({ queryKey: ["recent-discussions"] });
    },
  });
}

// Hook para atualizar publicação de canal
export function useUpdateChannelPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      title,
      content,
    }: {
      postId: string;
      title: string | null;
      content: string;
    }) => {
      const { error } = await supabase
        .from("channel_posts")
        .update({
          title,
          content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId);

      if (error) throw error;
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["channel-posts"] });
      queryClient.invalidateQueries({ queryKey: ["channel-post", postId] });
    },
  });
}
