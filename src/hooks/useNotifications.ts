import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect, useMemo } from "react";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  space_id: string | null;
  space_name?: string;
  space_slug?: string;
  isGlobal?: boolean;
  notification_url: string | null;
}

// Hook para subscrição realtime de notificações
function useNotificationsRealtime() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          console.log('New notification received:', payload);
          // Invalidar queries para buscar novos dados
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          // Atualizar quando notificação é marcada como lida
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        }
      )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notification_reads',
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      }
    )
      .subscribe((status) => {
        console.log('Notifications realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
}

// Fetch user notifications
export function useNotifications() {
  const { user } = useAuth();

  // Ativar subscription realtime
  useNotificationsRealtime();

  return useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async (): Promise<Notification[]> => {
      if (!user) return [];

      // Fetch notifications for user or global (user_id is null) with user_id column
      const { data: notifications, error } = await supabase
        .from("notifications")
        .select(`
          id, type, title, message, is_read, created_at, space_id, user_id, notification_url,
          spaces(name, slug)
        `)
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch global notification read statuses for this user
      const globalNotificationIds = (notifications || [])
        .filter(n => n.user_id === null)
        .map(n => n.id);

      let readStatusMap: Record<string, boolean> = {};

      if (globalNotificationIds.length > 0) {
        const { data: readStatuses } = await supabase
          .from("notification_reads")
          .select("notification_id")
          .eq("user_id", user.id)
          .in("notification_id", globalNotificationIds);

        readStatuses?.forEach(r => {
          readStatusMap[r.notification_id] = true;
        });
      }

      return (notifications || []).map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        is_read: n.user_id === null ? (readStatusMap[n.id] || false) : n.is_read,
        created_at: n.created_at,
        space_id: n.space_id,
        space_name: (n.spaces as any)?.name || null,
        space_slug: (n.spaces as any)?.slug || null,
        isGlobal: n.user_id === null,
        notification_url: n.notification_url || null,
      }));
    },
    enabled: !!user,
    staleTime: 1000 * 60, // 1 minuto - mais curto para notificações
  });
}

// Mark notification as read
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ notificationId, isGlobal }: { notificationId: string; isGlobal?: boolean }) => {
      if (!user) throw new Error("User not authenticated");

      if (isGlobal) {
        // For global notifications, insert into notification_reads
        const { error } = await supabase
          .from("notification_reads")
          .insert({
            notification_id: notificationId,
            user_id: user.id
          });

        // Ignore unique constraint violation (already marked as read)
        if (error && error.code !== '23505') throw error;
      } else {
        // For user-specific notifications, update the notification itself
        const { error } = await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", notificationId)
          .eq("user_id", user.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

// Mark all notifications as read
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");

      // Mark user-specific notifications as read
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (updateError) throw updateError;

      // Get unread global notifications
      const { data: globalNotifs } = await supabase
        .from("notifications")
        .select("id")
        .is("user_id", null);

      if (globalNotifs && globalNotifs.length > 0) {
        // Mark all global notifications as read for this user
        const inserts = globalNotifs.map(n => ({
          notification_id: n.id,
          user_id: user.id
        }));

        // Use upsert to handle already-read notifications
        await supabase
          .from("notification_reads")
          .upsert(inserts, { onConflict: 'notification_id,user_id' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

// Get unread notifications count via RPC (single query instead of 3)
export function useUnreadNotificationsCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notifications-unread-count", user?.id],
    queryFn: async (): Promise<number> => {
      if (!user) return 0;

      const { data, error } = await supabase.rpc("get_unread_notifications_count", {
        p_user_id: user.id,
      });

      if (error) throw error;
      return data || 0;
    },
    enabled: !!user,
    staleTime: 1000 * 30,
  });
}
