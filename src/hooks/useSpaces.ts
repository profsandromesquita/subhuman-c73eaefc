import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface Space {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  updates_count?: number;
}

// Fetch all active spaces
export function useSpaces() {
  return useQuery({
    queryKey: ["spaces"],
    queryFn: async (): Promise<Space[]> => {
      const { data, error } = await supabase
        .from("spaces")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch user's space subscriptions (which spaces they follow)
export function useUserSpaceSubscriptions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-space-subscriptions", user?.id],
    queryFn: async (): Promise<Record<string, boolean>> => {
      if (!user) return {};

      const { data, error } = await supabase
        .from("user_space_subscriptions")
        .select("space_id")
        .eq("user_id", user.id);

      if (error) throw error;

      const subsMap: Record<string, boolean> = {};
      data?.forEach((sub) => {
        subsMap[sub.space_id] = true;
      });
      return subsMap;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Toggle space subscription mutation
export function useToggleSpaceSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ spaceId, isSubscribed }: { spaceId: string; isSubscribed: boolean }) => {
      if (!user) throw new Error("Not authenticated");

      if (isSubscribed) {
        const { error } = await supabase
          .from("user_space_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("space_id", spaceId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_space_subscriptions")
          .insert({ user_id: user.id, space_id: spaceId });
        if (error) throw error;
      }

      return !isSubscribed;
    },
    onSuccess: (_, { isSubscribed }) => {
      toast.success(isSubscribed ? "Inscrição removida" : "Inscrito com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["user-space-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["subscribed-spaces"] });
      queryClient.invalidateQueries({ queryKey: ["highlights"] });
    },
    onError: () => {
      toast.error("Erro ao atualizar inscrição");
    },
  });
}

// Fetch subscribed spaces with update counts
export function useSubscribedSpaces() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["subscribed-spaces", user?.id],
    queryFn: async (): Promise<Space[]> => {
      if (!user) return [];

      // Fetch subscriptions with space details
      const { data: subscriptions, error: subError } = await supabase
        .from("user_space_subscriptions")
        .select(`
          space_id,
          spaces!inner(id, name, slug, icon, description)
        `)
        .eq("user_id", user.id);

      if (subError) throw subError;
      if (!subscriptions || subscriptions.length === 0) return [];

      // Get update counts in a single batch query
      const spaceIds = subscriptions.map((s) => s.space_id);
      
      const { data: updateCounts } = await supabase
        .from("space_updates")
        .select("space_id")
        .in("space_id", spaceIds)
        .eq("is_published", true);

      // Count updates per space
      const countsMap: Record<string, number> = {};
      updateCounts?.forEach((update) => {
        countsMap[update.space_id] = (countsMap[update.space_id] || 0) + 1;
      });

      return subscriptions.map((sub) => {
        const space = sub.spaces as any;
        return {
          id: space.id,
          name: space.name,
          slug: space.slug,
          description: space.description,
          icon: space.icon || "Folder",
          is_active: true,
          updates_count: countsMap[space.id] || 0,
        };
      });
    },
    enabled: !!user,
  });
}

// Fetch a single space by slug
export function useSpace(slug: string | undefined) {
  return useQuery({
    queryKey: ["space", slug],
    queryFn: async () => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from("spaces")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
}

// Check if user is subscribed to a space
export function useSpaceSubscription(spaceId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["space-subscription", spaceId, user?.id],
    queryFn: async () => {
      if (!spaceId || !user) return false;

      const { data, error } = await supabase
        .from("user_space_subscriptions")
        .select("id")
        .eq("space_id", spaceId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!spaceId && !!user,
  });
}
