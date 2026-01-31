import { useState, useEffect, useCallback } from 'react';
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

export function useSubscription(): SubscriptionStatus {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'active' | 'trial' | 'expired' | 'none'>('none');
  const [planType, setPlanType] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async (): Promise<{
    status: 'active' | 'trial' | 'expired' | 'none';
    planType: string | null;
  }> => {
    // Don't check if auth is still loading
    if (authLoading) {
      return { status: 'none', planType: null };
    }

    if (!user) {
      setStatus('none');
      setPlanType(null);
      setExpiresAt(null);
      setDaysRemaining(null);
      setLoading(false);
      return { status: 'none', planType: null };
    }

    setLoading(true);

    try {
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('plan_type, status, expires_at, starts_at')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !subscription) {
        setStatus('none');
        setPlanType(null);
        setExpiresAt(null);
        setDaysRemaining(null);
        setLoading(false);
        return { status: 'none', planType: null };
      }

      const subscriptionPlanType = subscription.plan_type;
      const subscriptionExpiresAt = subscription.expires_at 
        ? new Date(subscription.expires_at) 
        : null;

      setPlanType(subscriptionPlanType);
      setExpiresAt(subscriptionExpiresAt);

      let resultStatus: 'active' | 'trial' | 'expired' | 'none' = 'none';

      // Check if subscription has expired
      if (subscriptionExpiresAt) {
        const now = new Date();
        const isExpired = subscriptionExpiresAt < now;

        if (isExpired) {
          setStatus('expired');
          setDaysRemaining(0);
          resultStatus = 'expired';
        } else {
          // Calculate days remaining
          const diffTime = subscriptionExpiresAt.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysRemaining(diffDays);

          // Determine status based on plan type
          if (subscriptionPlanType === 'trial') {
            setStatus('trial');
            resultStatus = 'trial';
          } else {
            setStatus('active');
            resultStatus = 'active';
          }
        }
      } else {
        // No expiration date = active paid subscription
        setStatus('active');
        setDaysRemaining(null);
        resultStatus = 'active';
      }
      
      setLoading(false);
      return { status: resultStatus, planType: subscriptionPlanType };
    } catch (error) {
      console.error('Error checking subscription:', error);
      setStatus('none');
      setPlanType(null);
      setExpiresAt(null);
      setDaysRemaining(null);
      setLoading(false);
      return { status: 'none', planType: null };
    }
  }, [user, authLoading]);

  useEffect(() => {
    // Only run when auth is done loading
    if (!authLoading) {
      checkSubscription();
    }
  }, [checkSubscription, authLoading]);

  // Keep loading true while auth is loading
  const effectiveLoading = authLoading || loading;

  return { 
    status, 
    planType, 
    expiresAt, 
    daysRemaining, 
    loading: effectiveLoading,
    refetch: checkSubscription 
  };
}
