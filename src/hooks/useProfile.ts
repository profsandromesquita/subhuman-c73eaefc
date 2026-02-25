import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  occupation_type: string | null;
  company_name: string | null;
  job_title: string | null;
  industry: string | null;
  education: string | null;
  skills: string[] | null;
  hobbies: string | null;
  ai_experience_level: string | null;
  goals: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  account_type: string;
  cnpj: string | null;
  website: string | null;
  allow_ai_personalization: boolean;
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async (): Promise<Profile | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user,
  });
}
