import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PromoCoupon {
  id: string;
  code: string;
  plan_type: string;
  days_granted: number;
  max_uses: number;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CouponRedemption {
  id: string;
  coupon_id: string;
  user_id: string;
  subscription_id: string | null;
  redeemed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  promo_coupons?: PromoCoupon;
}

interface CreateCouponInput {
  prefix?: string;
  quantity: number;
  daysGranted: number;
  expiresAt?: string;
}

// Generate coupon code with format: PREFIX-XXXX-YYYY-ZZZZ or SUB-XXXX-YYYY-ZZZZ
function generateCouponCode(prefix?: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed I, O, 0, 1 for readability
  
  const randomPart = (length: number) => {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  const base = prefix?.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'SUB';
  return `${base}-${randomPart(4)}-${randomPart(4)}-${randomPart(4)}`;
}

// Hook to fetch all coupons (admin)
export function useCoupons() {
  return useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PromoCoupon[];
    },
  });
}

// Hook to fetch coupon redemptions (admin)
export function useCouponRedemptions(couponId?: string) {
  return useQuery({
    queryKey: ["coupon-redemptions", couponId],
    queryFn: async () => {
      let query = supabase
        .from("coupon_redemptions")
        .select("*")
        .order("redeemed_at", { ascending: false });
      
      if (couponId) {
        query = query.eq("coupon_id", couponId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CouponRedemption[];
    },
    enabled: couponId !== undefined || true,
  });
}

// Hook to create coupons (admin)
export function useCreateCoupons() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCouponInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const coupons = [];
      const existingCodes = new Set<string>();

      // Generate unique codes
      for (let i = 0; i < input.quantity; i++) {
        let code: string;
        let attempts = 0;
        
        do {
          code = generateCouponCode(input.prefix);
          attempts++;
        } while (existingCodes.has(code) && attempts < 100);
        
        existingCodes.add(code);
        
        coupons.push({
          code,
          days_granted: input.daysGranted,
          expires_at: input.expiresAt || null,
          created_by: user.id,
        });
      }

      const { data, error } = await supabase
        .from("promo_coupons")
        .insert(coupons as any)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success(`${data.length} cupom(ns) criado(s) com sucesso!`);
    },
    onError: (error: Error) => {
      console.error("Error creating coupons:", error);
      toast.error("Erro ao criar cupons: " + error.message);
    },
  });
}

// Hook to toggle coupon active status (admin)
export function useToggleCouponStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("promo_coupons")
        .update({ is_active } as any)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Status do cupom atualizado");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar cupom: " + error.message);
    },
  });
}

// Hook to delete coupon (admin)
export function useDeleteCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("promo_coupons")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Cupom excluído");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir cupom: " + error.message);
    },
  });
}

// Hook to redeem coupon (user)
export function useRedeemCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.functions.invoke("redeem-coupon", {
        body: { code },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      toast.success(data.message || "Cupom resgatado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao resgatar cupom");
    },
  });
}
