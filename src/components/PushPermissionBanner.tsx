import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useAuth';

const DISMISSED_KEY = 'push-banner-dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 dias

export function PushPermissionBanner() {
  const { user } = useAuth();
  const { permission, isSubscribed, isSupported, subscribe, loading } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true); // Começa oculto para evitar flash
  const [isVisible, setIsVisible] = useState(false);

  // Verificar se deve mostrar o banner
  useEffect(() => {
    if (!user || !isSupported) {
      setIsVisible(false);
      return;
    }

    // Se já tem permissão concedida e está inscrito, não mostra
    if (permission === 'granted' && isSubscribed) {
      setIsVisible(false);
      return;
    }

    // Se permissão foi negada permanentemente, não mostra
    if (permission === 'denied') {
      setIsVisible(false);
      return;
    }

    // Verificar se foi dispensado recentemente
    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < DISMISS_DURATION) {
        setDismissed(true);
        setIsVisible(false);
        return;
      }
    }

    // Mostrar banner após um pequeno delay
    setDismissed(false);
    const timer = setTimeout(() => setIsVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [user, isSupported, permission, isSubscribed]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    setDismissed(true);
    setIsVisible(false);
  };

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      setIsVisible(false);
    }
  };

  if (dismissed || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto"
      >
        <div className="bg-card border border-border rounded-xl p-4 shadow-lg">
          {/* Botão de fechar */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          <div className="flex items-start gap-3 pr-6">
            {/* Ícone */}
            <div className="p-2 rounded-full bg-primary/10 shrink-0">
              <Bell className="w-5 h-5 text-primary" weight="fill" />
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm">
                Ative as notificações
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Receba alertas quando novos conteúdos forem publicados nos seus espaços favoritos.
              </p>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleSubscribe}
              disabled={loading}
              size="sm"
              className="flex-1"
            >
              {loading ? 'Ativando...' : 'Ativar notificações'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-muted-foreground"
            >
              Agora não
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
