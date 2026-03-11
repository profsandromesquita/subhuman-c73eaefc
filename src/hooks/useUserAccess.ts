import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSubscription } from './useSubscription';
import { useAdminAuth } from './useAdminAuth';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export type AccessTier = 'freemium' | 'coupon' | 'student' | 'trial' | 'monthly' | 'yearly' | 'lifetime' | 'admin';

export interface UserAccess {
  tier: AccessTier;
  canReadFullArticles: boolean;
  canReadFullChannelPosts: boolean;
  canComment: boolean;
  canLike: boolean;
  canListenPodcast: boolean;
  canUseAI: boolean;
  aiDailyLimit: number;
  canPostInChannels: boolean;
  canViewMemberCards: boolean;
  canAccessEvent: (eventId: string, eventType?: string, modality?: string) => boolean;
  canAccessFreeEvents: boolean;
  canAccessAllOnlineEvents: boolean;
  hasPremiumBadge: 'blue' | 'gold' | null;
  hasAccessToPremiumChannel: boolean;
  loading: boolean;
}

const TIER_PERMISSIONS: Record<AccessTier, Omit<UserAccess, 'tier' | 'canAccessEvent' | 'loading'>> = {
  freemium: {
    canReadFullArticles: false,
    canReadFullChannelPosts: false,
    canComment: false,
    canLike: true,
    canListenPodcast: false,
    canUseAI: true,
    aiDailyLimit: 1,
    canPostInChannels: false,
    canViewMemberCards: false,
    canAccessFreeEvents: false,
    canAccessAllOnlineEvents: false,
    hasPremiumBadge: null,
    hasAccessToPremiumChannel: false,
  },
  coupon: {
    canReadFullArticles: true,
    canReadFullChannelPosts: true,
    canComment: true,
    canLike: true,
    canListenPodcast: true,
    canUseAI: true,
    aiDailyLimit: 2,
    canPostInChannels: true,
    canViewMemberCards: true,
    canAccessFreeEvents: true,
    canAccessAllOnlineEvents: false,
    hasPremiumBadge: null,
    hasAccessToPremiumChannel: false,
  },
  student: {
    canReadFullArticles: false,
    canReadFullChannelPosts: false,
    canComment: false,
    canLike: true,
    canListenPodcast: false,
    canUseAI: true,
    aiDailyLimit: 1,
    canPostInChannels: false,
    canViewMemberCards: false,
    canAccessFreeEvents: false,
    canAccessAllOnlineEvents: false,
    hasPremiumBadge: null,
    hasAccessToPremiumChannel: false,
  },
  trial: {
    canReadFullArticles: true,
    canReadFullChannelPosts: true,
    canComment: true,
    canLike: true,
    canListenPodcast: true,
    canUseAI: true,
    aiDailyLimit: 3,
    canPostInChannels: true,
    canViewMemberCards: true,
    canAccessFreeEvents: true,
    canAccessAllOnlineEvents: false,
    hasPremiumBadge: null,
    hasAccessToPremiumChannel: false,
  },
  monthly: {
    canReadFullArticles: true,
    canReadFullChannelPosts: true,
    canComment: true,
    canLike: true,
    canListenPodcast: true,
    canUseAI: true,
    aiDailyLimit: 10,
    canPostInChannels: true,
    canViewMemberCards: true,
    canAccessFreeEvents: true,
    canAccessAllOnlineEvents: false,
    hasPremiumBadge: null,
    hasAccessToPremiumChannel: false,
  },
  yearly: {
    canReadFullArticles: true,
    canReadFullChannelPosts: true,
    canComment: true,
    canLike: true,
    canListenPodcast: true,
    canUseAI: true,
    aiDailyLimit: 20,
    canPostInChannels: true,
    canViewMemberCards: true,
    canAccessFreeEvents: true,
    canAccessAllOnlineEvents: false,
    hasPremiumBadge: 'blue',
    hasAccessToPremiumChannel: true,
  },
  lifetime: {
    canReadFullArticles: true,
    canReadFullChannelPosts: true,
    canComment: true,
    canLike: true,
    canListenPodcast: true,
    canUseAI: true,
    aiDailyLimit: 25,
    canPostInChannels: true,
    canViewMemberCards: true,
    canAccessFreeEvents: true,
    canAccessAllOnlineEvents: true,
    hasPremiumBadge: 'gold',
    hasAccessToPremiumChannel: true,
  },
  admin: {
    canReadFullArticles: true,
    canReadFullChannelPosts: true,
    canComment: true,
    canLike: true,
    canListenPodcast: true,
    canUseAI: true,
    aiDailyLimit: 999,
    canPostInChannels: true,
    canViewMemberCards: true,
    canAccessFreeEvents: true,
    canAccessAllOnlineEvents: true,
    hasPremiumBadge: null,
    hasAccessToPremiumChannel: true,
  },
};

export function useUserAccess(): UserAccess {
  const { user } = useAuth();
  const { status, planType, loading: subLoading } = useSubscription();
  const { isAdminOrModerator, loading: adminLoading } = useAdminAuth();

  // Check if user has an active coupon-based subscription
  const { data: hasCoupon, isLoading: couponLoading } = useQuery({
    queryKey: ['user-coupon', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { count } = await supabase
        .from('coupon_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      return (count ?? 0) > 0;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  // Check if user has any event purchases
  const { data: eventPurchases, isLoading: eventsLoading } = useQuery({
    queryKey: ['user-event-purchases', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('event_purchases')
        .select('event_id')
        .eq('user_id', user.id)
        .eq('status', 'active');
      return (data ?? []).map(p => p.event_id);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const loading = subLoading || adminLoading || couponLoading || eventsLoading;

  const tier: AccessTier = useMemo(() => {
    if (isAdminOrModerator) return 'admin';
    if (status === 'active' && planType === 'lifetime') return 'lifetime';
    if (status === 'active' && planType === 'yearly') return 'yearly';
    if (status === 'active' && planType === 'monthly') return 'monthly';
    if (status === 'trial') return 'trial';
    // Coupon: has active promo subscription
    if (status === 'active' && planType === 'promo') return 'coupon';
    if (hasCoupon && status === 'active') return 'coupon';
    // Student: has event purchases but no subscription
    if ((eventPurchases ?? []).length > 0 && (status === 'none' || status === 'expired')) return 'student';
    return 'freemium';
  }, [isAdminOrModerator, status, planType, hasCoupon, eventPurchases]);

  const permissions = TIER_PERMISSIONS[tier];
  const purchasedEventIds = eventPurchases ?? [];

  const canAccessEvent = useMemo(() => {
    return (eventId: string, eventType?: string, modality?: string): boolean => {
      if (tier === 'admin') return true;

      // Purchased individually
      if (purchasedEventIds.includes(eventId)) return true;

      // No tier-based access for these
      if (['freemium', 'coupon', 'student', 'trial'].includes(tier)) return false;

      // Monthly: palestra, workshop, curso — only online_gravado
      if (tier === 'monthly') {
        const allowedTypes = ['palestra', 'workshop', 'curso'];
        const allowedModalities = ['online_gravado'];
        return !!eventType && !!modality && allowedTypes.includes(eventType) && allowedModalities.includes(modality);
      }

      // Yearly: + mentoria_grupo, + online_ao_vivo, hibrido
      if (tier === 'yearly') {
        const allowedTypes = ['palestra', 'workshop', 'curso', 'mentoria_grupo'];
        const allowedModalities = ['online_gravado', 'online_ao_vivo', 'hibrido'];
        return !!eventType && !!modality && allowedTypes.includes(eventType) && allowedModalities.includes(modality);
      }

      // Lifetime: full access
      if (tier === 'lifetime') return true;

      return false;
    };
  }, [tier, purchasedEventIds]);

  return {
    tier,
    ...permissions,
    canAccessEvent,
    loading,
  };
}
