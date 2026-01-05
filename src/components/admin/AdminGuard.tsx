import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Spinner } from '@phosphor-icons/react';

interface AdminGuardProps {
  children: ReactNode;
  requireAdmin?: boolean; // If true, only admins can access (not moderators)
}

export function AdminGuard({ children, requireAdmin = false }: AdminGuardProps) {
  const { user, isAdmin, isAdminOrModerator, loading } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/admin/login', { replace: true });
      return;
    }

    const hasAccess = requireAdmin ? isAdmin : isAdminOrModerator;
    
    if (!hasAccess) {
      navigate('/admin/login', { replace: true });
    }
  }, [user, isAdmin, isAdminOrModerator, loading, navigate, requireAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasAccess = requireAdmin ? isAdmin : isAdminOrModerator;

  if (!user || !hasAccess) {
    return null;
  }

  return <>{children}</>;
}
