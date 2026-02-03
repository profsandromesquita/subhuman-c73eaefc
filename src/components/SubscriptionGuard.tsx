import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SubscriptionGuardProps {
  children: ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { status, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Wait for both auth and subscription to load
    if (authLoading || subLoading) return;

    // If not logged in, let other guards handle it
    if (!user) return;

    // If expired or no subscription, redirect to plans
    if (status === 'expired' || status === 'none') {
      setIsRedirecting(true);
      if (status === 'expired') {
        toast.error('Seu período de teste expirou. Escolha um plano para continuar.');
      }
      navigate('/plans', { replace: true });
      return;
    }
  }, [authLoading, subLoading, user, status, navigate]);

  // Show loading overlay but DON'T unmount children to preserve form state
  if (authLoading || subLoading) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
        {/* Children stay hidden but mounted to preserve state */}
        <div className="opacity-0 pointer-events-none">
          {children}
        </div>
      </div>
    );
  }

  // If not logged in, render children (let other guards handle auth)
  if (!user) {
    return <>{children}</>;
  }

  // If expired or no subscription, don't render (redirect will happen)
  if (isRedirecting || status === 'expired' || status === 'none') {
    return null;
  }

  // User has valid subscription (active or trial)
  return <>{children}</>;
}
