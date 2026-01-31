import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Gift, ArrowRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface TrialBannerProps {
  daysRemaining: number;
}

export function TrialBanner({ daysRemaining }: TrialBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Reset dismissed state when route changes
  useEffect(() => {
    setIsDismissed(false);
  }, [location.pathname]);

  if (isDismissed || daysRemaining <= 0) {
    return null;
  }

  const getDaysText = () => {
    if (daysRemaining === 1) {
      return 'Último dia de acesso gratuito!';
    }
    return `Você ainda tem ${daysRemaining} dias de acesso.`;
  };

  const isUrgent = daysRemaining <= 2;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100, y: 0 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: 100, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-20 right-4 z-50 max-w-sm sm:bottom-6"
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
            onClick={() => setIsDismissed(true)}
            className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground transition-colors"
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
                variant="ghost"
                size="sm"
                className="mt-2 -ml-2 h-8 text-xs font-medium hover:bg-foreground/10"
                onClick={() => navigate('/plans')}
              >
                Assinar agora
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
