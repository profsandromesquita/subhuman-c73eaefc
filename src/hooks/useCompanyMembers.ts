import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  job_title: string | null;
  status: string;
  requested_at: string;
  responded_at: string | null;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useCompanyMembers(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company-members", companyId],
    queryFn: async (): Promise<CompanyMember[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("company_members")
        .select("*, profiles(full_name, avatar_url)")
        .eq("company_id", companyId)
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });
}

export function useMyMembership(companyId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-membership", companyId, user?.id],
    queryFn: async () => {
      if (!companyId || !user) return null;
      const { data, error } = await supabase
        .from("company_members")
        .select("*")
        .eq("company_id", companyId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId && !!user,
  });
}

export function useRequestMembership() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ companyId, jobTitle }: { companyId: string; jobTitle?: string }) => {
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("company_members")
        .insert({
          company_id: companyId,
          user_id: user.id,
          job_title: jobTitle || null,
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;

      // Create notification for company owner
      const { data: company } = await supabase
        .from("companies")
        .select("owner_id, name")
        .eq("id", companyId)
        .single();

      if (company) {
        await supabase.from("notifications").insert({
          user_id: company.owner_id,
          title: "Solicitação de vínculo",
          message: `Um usuário solicitou vínculo com ${company.name}`,
          type: "membership_request",
        });
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["my-membership", variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ["company-members", variables.companyId] });
    },
  });
}

export function useRespondMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, status }: { memberId: string; status: "approved" | "rejected" }) => {
      const { data, error } = await supabase
        .from("company_members")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", memberId)
        .select("*, profiles(full_name)")
        .single();
      if (error) throw error;

      // Notify the user
      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", data.company_id)
        .single();

      await supabase.from("notifications").insert({
        user_id: data.user_id,
        title: status === "approved" ? "Vínculo aprovado!" : "Vínculo recusado",
        message: status === "approved"
          ? `Seu vínculo com ${company?.name} foi aprovado`
          : `Seu vínculo com ${company?.name} foi recusado`,
        type: "membership_response",
      });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["company-members", data.company_id] });
    },
  });
}
