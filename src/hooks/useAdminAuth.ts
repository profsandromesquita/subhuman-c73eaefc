import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type AppRole = 'admin' | 'moderator' | 'user';

export function useAdminAuth() {
  const { user, session, loading: authLoading } = useAuth();
  const userId = user?.id; // Extract ID for stable dependency
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      setRoles([]);
      setLoading(false);
      return;
    }

    // Defer Supabase call with setTimeout to prevent deadlock
    const timeoutId = setTimeout(() => {
      fetchRoles(userId);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [userId, authLoading]); // Use userId instead of user

  const fetchRoles = async (userIdToFetch: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userIdToFetch);

      if (error) throw error;

      setRoles((data || []).map(r => r.role as AppRole));
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = roles.includes('admin');
  const isModerator = roles.includes('moderator');
  const isAdminOrModerator = isAdmin || isModerator;

  return {
    user,
    session,
    roles,
    isAdmin,
    isModerator,
    isAdminOrModerator,
    loading: authLoading || loading
  };
}
