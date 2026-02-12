import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { User, Buildings } from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

export interface MentionSuggestionItem {
  id: string;
  label: string;
  type: "user" | "company";
  avatar?: string | null;
  slug?: string;
}

interface MentionListProps {
  items: MentionSuggestionItem[];
  command: (item: MentionSuggestionItem) => void;
}

export const MentionList = forwardRef<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean }, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (prev + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          if (items[selectedIndex]) {
            command(items[selectedIndex]);
          }
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
          <p className="text-xs text-muted-foreground px-2 py-1">Nenhum resultado</p>
        </div>
      );
    }

    return (
      <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
        {items.map((item, index) => (
          <button
            key={`${item.type}-${item.id}`}
            onClick={() => command(item)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
              index === selectedIndex ? "bg-secondary" : "hover:bg-secondary/50"
            }`}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={item.avatar || undefined} />
              <AvatarFallback className="text-[10px] bg-muted">
                {item.type === "user" ? <User className="w-3 h-3" /> : <Buildings className="w-3 h-3" />}
              </AvatarFallback>
            </Avatar>
            <span className="truncate flex-1">{item.label}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {item.type === "user" ? "Pessoa" : "Empresa"}
            </span>
          </button>
        ))}
      </div>
    );
  }
);

MentionList.displayName = "MentionList";

// Suggestion fetcher for tiptap mention extension
export async function fetchMentionSuggestions(query: string): Promise<MentionSuggestionItem[]> {
  if (!query || query.length < 1) return [];

  const results: MentionSuggestionItem[] = [];

  const [usersRes, companiesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .ilike("full_name", `%${query}%`)
      .limit(5),
    supabase
      .from("companies")
      .select("id, name, logo_url, slug")
      .eq("is_active", true)
      .ilike("name", `%${query}%`)
      .limit(5),
  ]);

  if (usersRes.data) {
    results.push(
      ...usersRes.data.map((u) => ({
        id: u.id,
        label: u.full_name || "Sem nome",
        type: "user" as const,
        avatar: u.avatar_url,
      }))
    );
  }

  if (companiesRes.data) {
    results.push(
      ...companiesRes.data.map((c) => ({
        id: c.id,
        label: c.name,
        type: "company" as const,
        avatar: c.logo_url,
        slug: c.slug,
      }))
    );
  }

  return results;
}
