import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

export type Event = Tables<"events"> & {
  sessions: Tables<"event_sessions">[];
};

export interface EventFilters {
  period?: "all" | "future" | "past";
  modality?: string;
  eventType?: string;
  enrolled?: "all" | "enrolled" | "not_enrolled";
}

export function useEvents(filters?: EventFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["events", filters],
    queryFn: async () => {
      const { data: events, error } = await supabase
        .from("events")
        .select("*")
        .eq("is_published", true)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch sessions for all events
      const eventIds = events.map((e) => e.id);
      const { data: sessions } = await supabase
        .from("event_sessions")
        .select("*")
        .in("event_id", eventIds)
        .order("starts_at", { ascending: true });

      const sessionMap = new Map<string, Tables<"event_sessions">[]>();
      sessions?.forEach((s) => {
        const arr = sessionMap.get(s.event_id) || [];
        arr.push(s);
        sessionMap.set(s.event_id, arr);
      });

      let result: Event[] = events.map((e) => ({
        ...e,
        sessions: sessionMap.get(e.id) || [],
      }));

      // Apply filters
      if (filters?.modality && filters.modality !== "all") {
        result = result.filter((e) => e.modality === filters.modality);
      }
      if (filters?.eventType && filters.eventType !== "all") {
        result = result.filter((e) => e.event_type === filters.eventType);
      }
      if (filters?.period === "future") {
        const now = new Date().toISOString();
        result = result.filter((e) =>
          e.sessions.some((s) => s.starts_at > now)
        );
      } else if (filters?.period === "past") {
        const now = new Date().toISOString();
        result = result.filter(
          (e) =>
            e.sessions.length > 0 &&
            e.sessions.every((s) => s.ends_at < now)
        );
      }

      return result;
    },
  });
}

export function useUserEventPurchases() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["event-purchases", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("event_purchases")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
