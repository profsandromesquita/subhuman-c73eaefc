import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface MentionData {
  mentionedUserId?: string;
  mentionedCompanyId?: string;
  contextType: string;
  contextId: string;
}

export function useCreateMentions() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (mentions: MentionData[]) => {
      if (!user || mentions.length === 0) return;

      const rows = mentions.map((m) => ({
        author_id: user.id,
        mentioned_user_id: m.mentionedUserId || null,
        mentioned_company_id: m.mentionedCompanyId || null,
        context_type: m.contextType,
        context_id: m.contextId,
      }));

      const { error } = await supabase.from("mentions").insert(rows);
      if (error) throw error;

      // Create notifications for mentioned users
      const notifications = mentions
        .filter((m) => m.mentionedUserId)
        .map((m) => ({
          user_id: m.mentionedUserId!,
          title: "Você foi mencionado",
          message: "Alguém mencionou você em uma publicação",
          type: "mention",
        }));

      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications);
      }
    },
  });
}

// Extract mention data from HTML content with data attributes
export function extractMentionsFromHTML(html: string): { userId?: string; companyId?: string }[] {
  const mentions: { userId?: string; companyId?: string }[] = [];
  const regex = /data-mention-type="(user|company)" data-mention-id="([^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (match[1] === "user") {
      mentions.push({ userId: match[2] });
    } else {
      mentions.push({ companyId: match[2] });
    }
  }
  return mentions;
}
