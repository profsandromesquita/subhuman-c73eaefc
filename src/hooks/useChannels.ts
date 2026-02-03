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

// Fetch all active channels with stats (optimized with view)
export function useChannels() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["channels", user?.id],
    queryFn: async (): Promise<Channel[]> => {
      // Fetch user's subscription plan in parallel with channels
      const [planResult, channelsResult] = await Promise.all([
        user
          ? supabase
              .from("subscriptions")
              .select("plan_type")
              .eq("user_id", user.id)
              .eq("status", "active")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("channels")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .limit(50),
      ]);

      const userPlan = planResult.data?.plan_type || null;

      if (channelsResult.error) throw channelsResult.error;
      if (!channelsResult.data || channelsResult.data.length === 0) return [];

      const channelIds = channelsResult.data.map((c) => c.id);

      // Fetch stats from the view (much faster than fetching 1000 posts)
      const { data: statsData } = await supabase
        .from("channel_stats")
        .select("channel_id, posts_count, members_count, last_activity")
        .in("channel_id", channelIds);

      // Build stats map
      const statsMap: Record<
        string,
        { posts_count: number; members_count: number; last_activity: string | null }
      > = {};

      statsData?.forEach((stat) => {
        statsMap[stat.channel_id] = {
          posts_count: Number(stat.posts_count) || 0,
          members_count: Number(stat.members_count) || 0,
          last_activity: stat.last_activity,
        };
      });

      return channelsResult.data.map((channel) => {
        const accessType = (channel as any).access_type || "open";
        const stats = statsMap[channel.id] || { posts_count: 0, members_count: 0, last_activity: null };

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
          members_count: stats.members_count,
          posts_count: stats.posts_count,
          last_activity: stats.last_activity,
          has_access: hasAccess,
        };
      });
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
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
