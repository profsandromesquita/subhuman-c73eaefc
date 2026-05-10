import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type BadgeType = 'blue' | 'gold' | null;

export function useUserBadge(userId: string | undefined): BadgeType {
  const { data } = useQuery({
    queryKey: ["user-badge", userId],
    queryFn: async (): Promise<BadgeType> => {
      if (!userId) return null;
      const { data } = await supabase.rpc("get_user_badge", { _user_id: userId });
      if (!data) return null;
      return data === "lifetime" ? "gold" : "blue";
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  return data ?? null;
}
