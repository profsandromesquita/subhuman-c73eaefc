import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionGuardProps {
  children: ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // If not logged in, save current URL and redirect to login
  if (!user) {
    const returnTo = location.pathname + location.search;
    sessionStorage.setItem('returnTo', returnTo);
    navigate('/login', { replace: true, state: { returnTo } });
    return null;
  }

  // Freemium users can now access the app — restrictions are handled by useUserAccess + ContentPaywall
  return <>{children}</>;
}
