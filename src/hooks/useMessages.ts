import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface ConversationContact {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Conversation {
  contact: ConversationContact;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export function useConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const messages = data as Message[];
      const conversationMap = new Map<string, { messages: Message[]; unread: number }>();

      for (const msg of messages) {
        const contactId = msg.sender_id === user!.id ? msg.receiver_id : msg.sender_id;
        if (!conversationMap.has(contactId)) {
          conversationMap.set(contactId, { messages: [], unread: 0 });
        }
        const conv = conversationMap.get(contactId)!;
        conv.messages.push(msg);
        if (!msg.is_read && msg.receiver_id === user!.id) {
          conv.unread++;
        }
      }

      if (conversationMap.size === 0) return [];

      const contactIds = Array.from(conversationMap.keys());
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", contactIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      const conversations: Conversation[] = contactIds.map(contactId => {
        const conv = conversationMap.get(contactId)!;
        const lastMsg = conv.messages[0];
        const profile = profileMap.get(contactId);
        return {
          contact: {
            id: contactId,
            full_name: profile?.full_name || null,
            avatar_url: profile?.avatar_url || null,
          },
          lastMessage: lastMsg.content,
          lastMessageAt: lastMsg.created_at,
          unreadCount: conv.unread,
        };
      });

      conversations.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      return conversations;
    },
  });
}

export function useConversationMessages(recipientId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conversation-messages", user?.id, recipientId],
    enabled: !!user && !!recipientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user!.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${user!.id})`
        )
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
  });
}

export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ receiverId, content }: { receiverId: string; content: string }) => {
      const { error } = await supabase.from("messages").insert({
        sender_id: user!.id,
        receiver_id: receiverId,
        content,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", user?.id, variables.receiverId] });
      queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
    },
  });
}

export function useMarkConversationRead(recipientId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!recipientId || !user) return;
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("sender_id", recipientId)
        .eq("receiver_id", user.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation-messages"] });
      queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
    },
  });
}

export function useUnreadMessagesCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unread-messages-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user!.id)
        .eq("is_read", false);

      if (error) throw error;
      return count || 0;
    },
  });
}

export function useMessagesRealtime(recipientId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || !recipientId) return;

    const channel = supabase
      .channel(`messages-${recipientId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversation-messages", user.id, recipientId] });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, recipientId, queryClient]);
}
