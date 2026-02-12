import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SearchType = "all" | "users" | "companies";

export interface SearchResultUser {
  type: "user";
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  job_title: string | null;
}

export interface SearchResultCompany {
  type: "company";
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  industry: string | null;
}

export type SearchResult = SearchResultUser | SearchResultCompany;

export function useSearch(query: string, type: SearchType = "all") {
  return useQuery({
    queryKey: ["search", query, type],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!query || query.length < 2) return [];

      const results: SearchResult[] = [];

      if (type === "all" || type === "users") {
        const { data: users } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, bio, job_title")
          .ilike("full_name", `%${query}%`)
          .limit(20);

        if (users) {
          results.push(
            ...users.map((u) => ({
              type: "user" as const,
              id: u.id,
              name: u.full_name || "Sem nome",
              avatar_url: u.avatar_url,
              bio: u.bio,
              job_title: u.job_title,
            }))
          );
        }
      }

      if (type === "all" || type === "companies") {
        const { data: companies } = await supabase
          .from("companies")
          .select("id, name, slug, logo_url, description, industry")
          .eq("is_active", true)
          .ilike("name", `%${query}%`)
          .limit(20);

        if (companies) {
          results.push(
            ...companies.map((c) => ({
              type: "company" as const,
              id: c.id,
              name: c.name,
              slug: c.slug,
              logo_url: c.logo_url,
              description: c.description,
              industry: c.industry,
            }))
          );
        }
      }

      return results;
    },
    enabled: query.length >= 2,
  });
}

export function useMentionSearch(query: string) {
  return useQuery({
    queryKey: ["mention-search", query],
    queryFn: async () => {
      if (!query || query.length < 1) return [];

      const results: { id: string; label: string; type: "user" | "company"; avatar?: string | null; slug?: string }[] = [];

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
    },
    enabled: query.length >= 1,
  });
}
