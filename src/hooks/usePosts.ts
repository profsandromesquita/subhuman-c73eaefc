import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface SpaceUpdate {
  id: string;
  title: string;
  slug?: string;
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
  read_time_minutes?: number | null;
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

const PAGE_SIZE = 20;

// Fetch space updates with engagement counts via database view (paginated)
export function useSpaceUpdates(spaceId: string | undefined) {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ["space-updates", spaceId, user?.id],
    queryFn: async ({ pageParam = 0 }): Promise<{ items: SpaceUpdate[]; nextPage: number | undefined }> => {
      if (!spaceId) return { items: [], nextPage: undefined };

      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: updates, error } = await supabase
        .from("space_updates")
        .select("id, title, slug, thumbnail_url, media_type, published_at, created_at, space_id, read_time_minutes")
        .eq("space_id", spaceId)
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      if (!updates || updates.length === 0) return { items: [], nextPage: undefined };

      const updateIds = updates.map((u) => u.id);

      const [statsResult, userLikesResult] = await Promise.all([
        supabase.from("space_update_stats").select("update_id, likes_count, comments_count").in("update_id", updateIds),
        user
          ? supabase.from("update_likes").select("update_id").in("update_id", updateIds).eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
      ]);

      const statsMap: Record<string, { likes_count: number; comments_count: number }> = {};
      (statsResult.data || []).forEach((s: any) => {
        statsMap[s.update_id] = { likes_count: Number(s.likes_count), comments_count: Number(s.comments_count) };
      });

      const userLikedSet = new Set<string>();
      (userLikesResult.data || []).forEach((like: any) => {
        userLikedSet.add(like.update_id);
      });

      const items = updates.map((update) => ({
        ...update,
        content: null,
        likes_count: statsMap[update.id]?.likes_count || 0,
        comments_count: statsMap[update.id]?.comments_count || 0,
        is_liked: userLikedSet.has(update.id),
      }));

      return {
        items,
        nextPage: updates.length === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
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

      const { data: subscriptions } = await supabase
        .from("user_space_subscriptions")
        .select("space_id")
        .eq("user_id", user.id);

      if (!subscriptions || subscriptions.length === 0) return [];

      const spaceIds = subscriptions.map((s) => s.space_id);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Fetch WITHOUT content
      const { data: updates, error } = await supabase
        .from("space_updates")
        .select(`
          id, title, slug, thumbnail_url, media_type, published_at, space_id, read_time_minutes,
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

      // Fetch counts from view + user likes in parallel
      const [statsResult, userLikesResult] = await Promise.all([
        supabase.from("space_update_stats").select("update_id, likes_count, comments_count").in("update_id", updateIds),
        supabase.from("update_likes").select("update_id").eq("user_id", user.id).in("update_id", updateIds),
      ]);

      const statsMap: Record<string, { likes_count: number; comments_count: number }> = {};
      (statsResult.data || []).forEach((s: any) => {
        statsMap[s.update_id] = { likes_count: Number(s.likes_count), comments_count: Number(s.comments_count) };
      });

      const likedSet = new Set((userLikesResult.data || []).map((l: any) => l.update_id));

      const highlightsData = updates.map((update) => ({
        id: update.id,
        title: update.title,
        slug: (update as any).slug || "",
        content: null,
        thumbnail_url: update.thumbnail_url,
        media_type: update.media_type,
        published_at: update.published_at,
        created_at: update.published_at || "",
        space_id: update.space_id,
        space_name: (update.spaces as any)?.name || "",
        space_slug: (update.spaces as any)?.slug || "",
        likes_count: statsMap[update.id]?.likes_count || 0,
        comments_count: statsMap[update.id]?.comments_count || 0,
        is_liked: likedSet.has(update.id),
        read_time_minutes: (update as any).read_time_minutes,
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

      // Batch fetch: profiles, stats from view, media, user likes
      const [profilesResult, statsResult, mediaResult, userLikesResult] =
        await Promise.all([
          authorIds.length > 0
            ? supabase.from("profiles").select("id, full_name, avatar_url").in("id", authorIds)
            : Promise.resolve({ data: [] }),
          supabase.from("channel_post_stats").select("post_id, likes_count, comments_count").in("post_id", postIds),
          supabase
            .from("channel_post_media")
            .select("post_id, file_url")
            .in("post_id", postIds)
            .in("file_type", ["image", "video"])
            .order("sort_order", { ascending: true }),
          user
            ? supabase.from("channel_post_likes").select("post_id").in("post_id", postIds).eq("user_id", user.id)
            : Promise.resolve({ data: [] }),
        ]);

      const profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      (profilesResult.data || []).forEach((p: any) => {
        profilesMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
      });

      const statsMap: Record<string, { likes_count: number; comments_count: number }> = {};
      (statsResult.data || []).forEach((s: any) => {
        statsMap[s.post_id] = { likes_count: Number(s.likes_count), comments_count: Number(s.comments_count) };
      });

      const mediaMap: Record<string, string> = {};
      (mediaResult.data || []).forEach((media: any) => {
        if (!mediaMap[media.post_id]) {
          mediaMap[media.post_id] = media.file_url;
        }
      });

      const userLikedSet = new Set<string>();
      (userLikesResult.data || []).forEach((like: any) => {
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
          likes_count: statsMap[post.id]?.likes_count || 0,
          comments_count: statsMap[post.id]?.comments_count || 0,
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
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: posts, error } = await supabase
        .from("channel_posts")
        .select(`
          id, title, content, created_at, channel_id, author_id,
          channels!inner(name, slug),
          profiles:author_id(full_name)
        `)
        .eq("is_moderated", false)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!posts || posts.length === 0) return [];

      const postIds = posts.map((p) => p.id);

      // Use view for stats + media + user likes in parallel
      const [statsResult, mediaResult, userLikesResult] = await Promise.all([
        supabase.from("channel_post_stats").select("post_id, likes_count, comments_count").in("post_id", postIds),
        supabase
          .from("channel_post_media")
          .select("post_id, file_url")
          .in("post_id", postIds)
          .in("file_type", ["image", "video"]),
        user
          ? supabase.from("channel_post_likes").select("post_id").in("post_id", postIds).eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
      ]);

      const statsMap: Record<string, { likes_count: number; comments_count: number }> = {};
      (statsResult.data || []).forEach((s: any) => {
        statsMap[s.post_id] = { likes_count: Number(s.likes_count), comments_count: Number(s.comments_count) };
      });

      const mediaMap: Record<string, string> = {};
      (mediaResult.data || []).forEach((media: any) => {
        if (!mediaMap[media.post_id]) {
          mediaMap[media.post_id] = media.file_url;
        }
      });

      const likedSet = new Set((userLikesResult.data || []).map((l: any) => l.post_id));

      const discussions = posts.map((post) => ({
        id: post.id,
        title: (post as any).title || post.content.substring(0, 100),
        content: post.content,
        created_at: post.created_at,
        channel_id: post.channel_id,
        channel_name: (post.channels as any)?.name || "",
        channel_slug: (post.channels as any)?.slug || "",
        author_name: (post.profiles as any)?.full_name || "Usuário",
        likes_count: statsMap[post.id]?.likes_count || 0,
        comments_count: statsMap[post.id]?.comments_count || 0,
        is_liked: likedSet.has(post.id),
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
      queryClient.invalidateQueries({ queryKey: ["post-detail"] });
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
      queryClient.invalidateQueries({ queryKey: ["post-detail"] });
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
      const { data: commentIds } = await supabase
        .from("channel_post_comments")
        .select("id")
        .eq("post_id", postId);

      if (commentIds && commentIds.length > 0) {
        await supabase
          .from("channel_post_comment_likes")
          .delete()
          .in("comment_id", commentIds.map(c => c.id));
      }

      await supabase.from("channel_post_comments").delete().eq("post_id", postId);
      await supabase.from("channel_post_likes").delete().eq("post_id", postId);
      await supabase.from("channel_post_media").delete().eq("post_id", postId);

      const { error } = await supabase.from("channel_posts").delete().eq("id", postId);
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
