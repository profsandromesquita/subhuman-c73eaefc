import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SubscriptionGuardProps {
  children: ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { status, daysRemaining, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Wait for both auth and subscription to load
    if (authLoading || subLoading) return;

    // If not logged in, let other guards handle it
    if (!user) return;

    // If expired or no subscription, redirect to plans
    if (status === 'expired' || status === 'none') {
      if (status === 'expired') {
        toast.error('Seu período de teste expirou. Escolha um plano para continuar.');
      }
      navigate('/plans', { replace: true });
      return;
    }

    // Show toast when trial is about to expire (1 day remaining)
    if (status === 'trial' && daysRemaining === 1) {
      toast.warning('Seu período de teste expira amanhã! Assine para continuar usando.', {
        duration: 5000,
      });
    }
  }, [authLoading, subLoading, user, status, daysRemaining, navigate, location.pathname]);

  // Show nothing while loading
  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // If not logged in, render children (let other guards handle auth)
  if (!user) {
    return <>{children}</>;
  }

  // If expired or no subscription, don't render (redirect will happen)
  if (status === 'expired' || status === 'none') {
    return null;
  }

  // User has valid subscription (active or trial)
  return <>{children}</>;
}
