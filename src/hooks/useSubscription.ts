import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface SubscriptionStatus {
  status: 'active' | 'trial' | 'expired' | 'none';
  planType: string | null;
  expiresAt: Date | null;
  daysRemaining: number | null;
  loading: boolean;
}

export function useSubscription(): SubscriptionStatus {
  const { user } = useAuth();
  const [status, setStatus] = useState<'active' | 'trial' | 'expired' | 'none'>('none');
  const [planType, setPlanType] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setStatus('none');
      setPlanType(null);
      setExpiresAt(null);
      setDaysRemaining(null);
      setLoading(false);
      return;
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
        return;
      }

      const subscriptionPlanType = subscription.plan_type;
      const subscriptionExpiresAt = subscription.expires_at 
        ? new Date(subscription.expires_at) 
        : null;

      setPlanType(subscriptionPlanType);
      setExpiresAt(subscriptionExpiresAt);

      // Check if subscription has expired
      if (subscriptionExpiresAt) {
        const now = new Date();
        const isExpired = subscriptionExpiresAt < now;

        if (isExpired) {
          setStatus('expired');
          setDaysRemaining(0);
        } else {
          // Calculate days remaining
          const diffTime = subscriptionExpiresAt.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysRemaining(diffDays);

          // Determine status based on plan type
          if (subscriptionPlanType === 'trial') {
            setStatus('trial');
          } else {
            setStatus('active');
          }
        }
      } else {
        // No expiration date = active paid subscription
        setStatus('active');
        setDaysRemaining(null);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setStatus('none');
      setPlanType(null);
      setExpiresAt(null);
      setDaysRemaining(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  return { status, planType, expiresAt, daysRemaining, loading };
}
