import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Company {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  cnpj: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Fields safe to read for any caller. CNPJ is intentionally excluded — it is
// fetched separately by the owner via the get_my_company_cnpj RPC.
const COMPANY_PUBLIC_FIELDS =
  "id, owner_id, name, slug, description, logo_url, website, industry, city, state, instagram_url, linkedin_url, is_verified, is_active, created_at, updated_at";

export function useMyCompany() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-company", user?.id],
    queryFn: async (): Promise<Company | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("companies")
        .select(COMPANY_PUBLIC_FIELDS)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      // Owner can read their own CNPJ via SECURITY DEFINER RPC
      const { data: cnpj } = await supabase.rpc("get_my_company_cnpj", {
        _company_id: data.id,
      });

      return { ...(data as any), cnpj: (cnpj as string | null) ?? null } as Company;
    },
    enabled: !!user,
  });
}

export function useCompanyBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["company", slug],
    queryFn: async (): Promise<Company | null> => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("companies")
        .select(COMPANY_PUBLIC_FIELDS)
        .eq("slug", slug)
        .single();
      if (error) throw error;
      // CNPJ is never exposed via public lookup
      return { ...(data as any), cnpj: null } as Company;
    },
    enabled: !!slug,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string | null; logo_url?: string | null; website?: string | null; industry?: string | null; city?: string | null; state?: string | null; cnpj?: string | null; instagram_url?: string | null; linkedin_url?: string | null }) => {
      if (!user) throw new Error("Não autenticado");
      const { data: company, error } = await supabase
        .from("companies")
        .insert([{ ...data, owner_id: user.id, slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }])
        .select()
        .single();
      if (error) throw error;
      return company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-company"] });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Company> & { id: string }) => {
      const { data: company, error } = await supabase
        .from("companies")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return company;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-company"] });
      queryClient.invalidateQueries({ queryKey: ["company", data.slug] });
    },
  });
}

export function useSearchCompanies(query: string) {
  return useQuery({
    queryKey: ["search-companies", query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, slug, logo_url, industry")
        .eq("is_active", true)
        .ilike("name", `%${query}%`)
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: query.length >= 2,
  });
}
