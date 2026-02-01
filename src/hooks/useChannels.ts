import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  access_type: "open" | "subscribers" | "premium";
  icon: string | null;
  slug: string | null;
  members_count: number;
  posts_count: number;
  last_activity: string | null;
  has_access: boolean;
}

// Fetch all active channels with stats
export function useChannels() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["channels", user?.id],
    queryFn: async (): Promise<Channel[]> => {
      // First get user's subscription plan
      let userPlan: string | null = null;
      if (user) {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("plan_type")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        userPlan = sub?.plan_type || null;
      }

      // Fetch channels
      const { data: channelsData, error } = await supabase
        .from("channels")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(50);

      if (error) throw error;
      if (!channelsData || channelsData.length === 0) return [];

      const channelIds = channelsData.map((c) => c.id);

      // Batch fetch posts for all channels
      const { data: allPosts } = await supabase
        .from("channel_posts")
        .select("id, channel_id, author_id, created_at")
        .in("channel_id", channelIds)
        .eq("is_moderated", false)
        .order("created_at", { ascending: false })
        .limit(1000);

      // Process posts to get stats per channel
      const statsMap: Record<
        string,
        { posts_count: number; members: Set<string>; last_activity: string | null }
      > = {};

      channelIds.forEach((id) => {
        statsMap[id] = { posts_count: 0, members: new Set(), last_activity: null };
      });

      allPosts?.forEach((post) => {
        const stats = statsMap[post.channel_id];
        if (stats) {
          stats.posts_count++;
          if (post.author_id) stats.members.add(post.author_id);
          if (!stats.last_activity || post.created_at > stats.last_activity) {
            stats.last_activity = post.created_at;
          }
        }
      });

      return channelsData.map((channel) => {
        const accessType = (channel as any).access_type || "open";
        const stats = statsMap[channel.id];

        // Check access based on user plan
        let hasAccess = accessType === "open";
        if (user && userPlan) {
          if (accessType === "subscribers") {
            hasAccess = true;
          } else if (accessType === "premium") {
            hasAccess = userPlan === "yearly";
          }
        }

        return {
          id: channel.id,
          name: channel.name,
          description: channel.description,
          access_type: accessType,
          icon: (channel as any).icon || "ChatCircle",
          slug: (channel as any).slug,
          members_count: stats.members.size,
          posts_count: stats.posts_count,
          last_activity: stats.last_activity,
          has_access: hasAccess,
        };
      });
    },
  });
}

// Fetch a single channel by ID
export function useChannel(channelId: string | undefined) {
  return useQuery({
    queryKey: ["channel", channelId],
    queryFn: async () => {
      if (!channelId) return null;

      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .eq("id", channelId)
        .single();

      if (error) throw error;
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        access_type: (data as any).access_type || "open",
        icon: (data as any).icon || "ChatCircle",
        slug: (data as any).slug,
      };
    },
    enabled: !!channelId,
  });
}
