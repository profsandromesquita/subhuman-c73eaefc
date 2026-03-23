import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Event } from "./useEvents";

export type EventMaterial = Tables<"event_materials">;

export function useEventBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["event-detail", slug],
    queryFn: async () => {
      if (!slug) throw new Error("Slug não informado");

      // Fetch event
      const { data: event, error } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .eq("is_active", true)
        .single();

      if (error) throw error;

      // Fetch sessions
      const { data: sessions } = await supabase
        .from("event_sessions")
        .select("*")
        .eq("event_id", event.id)
        .order("starts_at", { ascending: true });

      // Fetch materials
      const { data: materials } = await supabase
        .from("event_materials")
        .select("*")
        .eq("event_id", event.id)
        .order("sort_order", { ascending: true });

      const fullEvent: Event = {
        ...event,
        sessions: sessions || [],
      };

      return {
        event: fullEvent,
        materials: (materials || []) as EventMaterial[],
      };
    },
    enabled: !!slug,
  });
}
