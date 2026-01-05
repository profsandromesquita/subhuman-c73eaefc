import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ChannelAccessResult {
  hasAccess: boolean;
  loading: boolean;
  accessType: 'open' | 'subscribers' | 'premium' | null;
  requiredPlan: string | null;
  userPlan: string | null;
}

export function useChannelAccess(channelId: string | undefined): ChannelAccessResult {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessType, setAccessType] = useState<'open' | 'subscribers' | 'premium' | null>(null);
  const [requiredPlan, setRequiredPlan] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string | null>(null);

  const checkAccess = useCallback(async () => {
    if (!channelId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Get channel access settings
      const { data: channel, error: channelError } = await supabase
        .from('channels')
        .select('access_type, required_plan')
        .eq('id', channelId)
        .single();

      if (channelError || !channel) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      const channelAccessType = (channel as any).access_type as 'open' | 'subscribers' | 'premium';
      const channelRequiredPlan = (channel as any).required_plan as string | null;
      
      setAccessType(channelAccessType);
      setRequiredPlan(channelRequiredPlan);

      // Open channels are accessible to everyone
      if (channelAccessType === 'open') {
        setHasAccess(true);
        setLoading(false);
        return;
      }

      // For non-open channels, user must be logged in
      if (!user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // Check user's subscription
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('plan_type, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError || !subscription) {
        setHasAccess(false);
        setUserPlan(null);
        setLoading(false);
        return;
      }

      setUserPlan(subscription.plan_type);

      // For 'subscribers' access type, any active subscription works
      if (channelAccessType === 'subscribers') {
        setHasAccess(true);
        setLoading(false);
        return;
      }

      // For 'premium' access type, require yearly plan
      if (channelAccessType === 'premium') {
        setHasAccess(subscription.plan_type === 'yearly');
        setLoading(false);
        return;
      }

      setHasAccess(false);
    } catch (error) {
      console.error('Error checking channel access:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  }, [channelId, user]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return { hasAccess, loading, accessType, requiredPlan, userPlan };
}
