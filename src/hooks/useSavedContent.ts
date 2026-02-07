import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useSavedArticles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["saved-articles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_updates")
        .select(`
          id,
          created_at,
          update_id,
          space_updates!inner (
            title,
            thumbnail_url,
            slug,
            space_id,
            spaces!inner (
              slug
            )
          )
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((item: any) => ({
        id: item.id,
        savedAt: item.created_at,
        updateId: item.update_id,
        title: item.space_updates.title,
        thumbnailUrl: item.space_updates.thumbnail_url,
        postSlug: item.space_updates.slug,
        spaceSlug: item.space_updates.spaces.slug,
      }));
    },
  });
}

export function useSavedPodcasts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["saved-podcasts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_podcasts")
        .select(`
          id,
          created_at,
          podcast_id,
          podcasts!inner (
            title,
            cover_url,
            slug,
            duration_seconds
          )
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((item: any) => ({
        id: item.id,
        savedAt: item.created_at,
        podcastId: item.podcast_id,
        title: item.podcasts.title,
        coverUrl: item.podcasts.cover_url,
        slug: item.podcasts.slug,
        durationSeconds: item.podcasts.duration_seconds,
      }));
    },
  });
}

export function useRemoveSavedArticle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (savedId: string) => {
      const { error } = await supabase
        .from("saved_updates")
        .delete()
        .eq("id", savedId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-articles", user?.id] });
    },
  });
}

export function useRemoveSavedPodcast() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (savedId: string) => {
      const { error } = await supabase
        .from("saved_podcasts")
        .delete()
        .eq("id", savedId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-podcasts", user?.id] });
    },
  });
}
