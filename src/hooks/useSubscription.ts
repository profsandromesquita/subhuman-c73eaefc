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
  const userId = user?.id;
  const [status, setStatus] = useState<'active' | 'trial' | 'expired' | 'none'>('none');
  const [planType, setPlanType] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  const checkSubscription = useCallback(async (): Promise<SubscriptionResult> => {
    if (authLoading) {
      return { status: 'none', planType: null };
    }

    if (!userId) {
      setStatus('none');
      setPlanType(null);
      setExpiresAt(null);
      setDaysRemaining(null);
      setHasChecked(true);
      return { status: 'none', planType: null };
    }

    try {
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('plan_type, status, expires_at, starts_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !subscription) {
        setStatus('none');
        setPlanType(null);
        setExpiresAt(null);
        setDaysRemaining(null);
        setHasChecked(true);
        return { status: 'none', planType: null };
      }

      const subscriptionPlanType = subscription.plan_type;
      const subscriptionExpiresAt = subscription.expires_at 
        ? new Date(subscription.expires_at) 
        : null;

      setPlanType(subscriptionPlanType);
      setExpiresAt(subscriptionExpiresAt);

      let resultStatus: 'active' | 'trial' | 'expired' | 'none' = 'none';

      if (subscriptionExpiresAt) {
        const now = new Date();
        const isExpired = subscriptionExpiresAt < now;

        if (isExpired) {
          setStatus('expired');
          setDaysRemaining(0);
          resultStatus = 'expired';
        } else {
          const diffTime = subscriptionExpiresAt.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysRemaining(diffDays);

          if (subscriptionPlanType === 'trial') {
            setStatus('trial');
            resultStatus = 'trial';
          } else {
            setStatus('active');
            resultStatus = 'active';
          }
        }
      } else {
        setStatus('active');
        setDaysRemaining(null);
        resultStatus = 'active';
      }
      
      setHasChecked(true);
      return { status: resultStatus, planType: subscriptionPlanType };
    } catch (error) {
      console.error('Error checking subscription:', error);
      setStatus('none');
      setPlanType(null);
      setExpiresAt(null);
      setDaysRemaining(null);
      setHasChecked(true);
      return { status: 'none', planType: null };
    }
  }, [userId, authLoading]);

  useEffect(() => {
    if (!authLoading) {
      checkSubscription();
    }
  }, [checkSubscription, authLoading]);

  // Loading permanece true até que auth termine E subscription seja verificada
  const effectiveLoading = authLoading || !hasChecked;

  return { 
    status, 
    planType, 
    expiresAt, 
    daysRemaining, 
    loading: effectiveLoading,
    refetch: checkSubscription 
  };
}
