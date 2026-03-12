import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export type AdminEvent = Tables<"events"> & {
  sessions: Tables<"event_sessions">[];
};

export function useAdminEvents() {
  return useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data: events, error } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

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

      return events.map((e) => ({
        ...e,
        sessions: sessionMap.get(e.id) || [],
      })) as AdminEvent[];
    },
  });
}

export interface SessionInput {
  starts_at: string;
  ends_at: string;
  session_url?: string;
}

export interface CreateEventInput {
  title: string;
  description?: string | null;
  event_type: string;
  modality: string;
  price?: number | null;
  is_free?: boolean;
  cover_url?: string | null;
  location?: string | null;
  max_participants?: number | null;
  checkout_url?: string | null;
  access_url?: string | null;
  youtube_url?: string | null;
  meet_url?: string | null;
  ticto_offer_id?: string | null;
  is_published?: boolean;
  sessions: SessionInput[];
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const { sessions, ...eventData } = input;

      const { data: event, error } = await supabase
        .from("events")
        .insert({
          ...eventData,
          created_by: user?.id,
          price: eventData.price ?? 0,
        } as any)
        .select()
        .single();

      if (error) throw error;

      if (sessions.length > 0) {
        const { error: sessError } = await supabase
          .from("event_sessions")
          .insert(
            sessions.map((s) => ({
              event_id: event.id,
              starts_at: new Date(s.starts_at).toISOString(),
              ends_at: new Date(s.ends_at).toISOString(),
              session_url: s.session_url || null,
            }))
          );
        if (sessError) throw sessError;
      }

      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Evento criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating event:", error);
      toast.error("Erro ao criar evento");
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, sessions, ...input }: CreateEventInput & { id: string }) => {
      const { error } = await supabase
        .from("events")
        .update(input)
        .eq("id", id);

      if (error) throw error;

      // Replace sessions: delete old, insert new
      await supabase.from("event_sessions").delete().eq("event_id", id);

      if (sessions.length > 0) {
        const { error: sessError } = await supabase
          .from("event_sessions")
          .insert(
            sessions.map((s) => ({
              event_id: id,
              starts_at: new Date(s.starts_at).toISOString(),
              ends_at: new Date(s.ends_at).toISOString(),
              session_url: s.session_url || null,
            }))
          );
        if (sessError) throw sessError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Evento atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating event:", error);
      toast.error("Erro ao atualizar evento");
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Evento excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting event:", error);
      toast.error("Erro ao excluir evento");
    },
  });
}

export function useEventPurchases(eventId: string | null) {
  return useQuery({
    queryKey: ["event-purchases-admin", eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from("event_purchases")
        .select("*")
        .eq("event_id", eventId)
        .order("purchased_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });
}
