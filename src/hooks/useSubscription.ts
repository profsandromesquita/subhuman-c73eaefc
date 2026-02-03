import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface SubscriptionResult {
  status: 'active' | 'trial' | 'expired' | 'none';
  planType: string | null;
}

export interface SubscriptionStatus {
  status: 'active' | 'trial' | 'expired' | 'none';
  planType: string | null;
  expiresAt: Date | null;
  daysRemaining: number | null;
  loading: boolean;
  refetch: () => Promise<SubscriptionResult>;
}

interface SubscriptionData {
  plan_type: string;
  status: string;
  expires_at: string | null;
  starts_at: string;
}

function computeSubscriptionStatus(subscription: SubscriptionData | null): {
  status: 'active' | 'trial' | 'expired' | 'none';
  planType: string | null;
  expiresAt: Date | null;
  daysRemaining: number | null;
} {
  if (!subscription) {
    return { status: 'none', planType: null, expiresAt: null, daysRemaining: null };
  }

  const planType = subscription.plan_type;
  const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null;

  if (expiresAt) {
    const now = new Date();
    const isExpired = expiresAt < now;

    if (isExpired) {
      return { status: 'expired', planType, expiresAt, daysRemaining: 0 };
    }

    const diffTime = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (planType === 'trial') {
      return { status: 'trial', planType, expiresAt, daysRemaining };
    }

    return { status: 'active', planType, expiresAt, daysRemaining };
  }

  return { status: 'active', planType, expiresAt: null, daysRemaining: null };
}

export function useSubscription(): SubscriptionStatus {
  const { user, loading: authLoading } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async (): Promise<SubscriptionData | null> => {
      if (!user) return null;

      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('plan_type, status, expires_at, starts_at')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error checking subscription:', error);
        return null;
      }

      return subscription;
    },
    enabled: !!user && !authLoading,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  const computed = computeSubscriptionStatus(data ?? null);

  const handleRefetch = async (): Promise<SubscriptionResult> => {
    const result = await refetch();
    const newComputed = computeSubscriptionStatus(result.data ?? null);
    return { status: newComputed.status, planType: newComputed.planType };
  };

  return {
    status: computed.status,
    planType: computed.planType,
    expiresAt: computed.expiresAt,
    daysRemaining: computed.daysRemaining,
    loading: authLoading || isLoading,
    refetch: handleRefetch,
  };
}
