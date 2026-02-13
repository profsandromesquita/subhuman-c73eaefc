import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type BadgeType = 'blue' | 'gold' | null;

export function useUserBadge(userId: string | undefined): BadgeType {
  const { data } = useQuery({
    queryKey: ["user-badge", userId],
    queryFn: async (): Promise<BadgeType> => {
      if (!userId) return null;
      const { data } = await supabase
        .from("subscriptions")
        .select("plan_type")
        .eq("user_id", userId)
        .eq("status", "active")
        .in("plan_type", ["yearly", "lifetime"])
        .maybeSingle();

      if (!data) return null;
      return data.plan_type === "lifetime" ? "gold" : "blue";
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  return data ?? null;
}
