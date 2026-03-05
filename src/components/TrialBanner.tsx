import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Gift, ArrowRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface TrialBannerProps {
  daysRemaining: number;
}

export function TrialBanner({ daysRemaining }: TrialBannerProps) {
  const navigate = useNavigate();
  
  // Check if banner was already shown this session
  const [shouldShow, setShouldShow] = useState(() => {
    return sessionStorage.getItem('trial_banner_shown') !== 'true';
  });
  const [isDismissed, setIsDismissed] = useState(false);

  // Mark as shown when component mounts for the first time
  useEffect(() => {
    if (shouldShow && !isDismissed) {
      sessionStorage.setItem('trial_banner_shown', 'true');
    }
  }, [shouldShow, isDismissed]);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!shouldShow || isDismissed) return;

    const timer = setTimeout(() => {
      setIsDismissed(true);
    }, 8000);

    return () => clearTimeout(timer);
  }, [shouldShow, isDismissed]);

  // Don't render if already shown this session or dismissed
  if (!shouldShow || isDismissed || daysRemaining <= 0) {
    return null;
  }

  const getDaysText = () => {
    if (daysRemaining === 1) {
      return 'Último dia de acesso gratuito!';
    }
    return `Você ainda tem ${daysRemaining} dias de acesso.`;
  };

  const isUrgent = daysRemaining <= 2;

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDismissed(true);
  };

  const handleNavigateToPlans = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDismissed(true);
    navigate('/plans');
  };

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          initial={{ opacity: 0, x: 100, y: 0 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 100, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-20 right-4 z-50 max-w-sm sm:bottom-6 lg:bottom-6"
        >
          <div 
            className={`
              relative overflow-hidden rounded-xl border bg-card p-4 shadow-lg
              ${isUrgent ? 'border-destructive/50' : 'border-border'}
            `}
          >
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 to-transparent pointer-events-none" />
            
            {/* Dismiss button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground transition-colors z-10"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative flex items-start gap-3">
              {/* Icon */}
              <div className={`
                flex-shrink-0 p-2 rounded-lg
                ${isUrgent ? 'bg-destructive/20 text-destructive' : 'bg-foreground/10 text-foreground'}
              `}>
                <Gift className="w-5 h-5" weight="fill" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-4">
                <h4 className="font-semibold text-sm text-foreground">
                  Período de teste
                </h4>
                <p className={`text-sm mt-0.5 ${isUrgent ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {getDaysText()}
                </p>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 -ml-2 h-8 text-xs font-medium hover:bg-foreground/10"
                  onClick={handleNavigateToPlans}
                >
                  Assinar agora
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
