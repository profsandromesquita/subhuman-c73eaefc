import { useNavigate } from 'react-router-dom';
import { CreditCard, Crown, Gift, CalendarBlank, ArrowRight } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  const navigate = useNavigate();
  const { status, planType, expiresAt, daysRemaining, loading } = useSubscription();

  const handleNavigateToPlans = () => {
    onClose();
    navigate('/plans');
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'trial':
        return <Badge variant="secondary" className="gap-1"><Gift className="w-3 h-3" /> Período de Teste</Badge>;
      case 'active':
        return <Badge variant="default" className="gap-1 bg-green-600"><Crown className="w-3 h-3" /> Ativo</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expirado</Badge>;
      default:
        return <Badge variant="outline">Sem assinatura</Badge>;
    }
  };

  const getPlanName = () => {
    switch (planType) {
      case 'trial':
        return 'Trial (7 dias)';
      case 'monthly':
        return 'Mensal';
      case 'yearly':
        return 'Anual (Premium)';
      default:
        return 'Nenhum';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'trial':
        return <Gift className="w-8 h-8 text-foreground" weight="fill" />;
      case 'active':
        return <Crown className="w-8 h-8 text-yellow-500" weight="fill" />;
      default:
        return <CreditCard className="w-8 h-8 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Sua Assinatura
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Card */}
            <div className="rounded-lg border bg-secondary/30 p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-secondary">
                  {getStatusIcon()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusBadge()}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Plano: {getPlanName()}
                  </p>
                </div>
              </div>

              {/* Expiration Info */}
              {expiresAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground border-t border-border pt-3">
                  <CalendarBlank className="w-4 h-4" />
                  <span>
                    {status === 'expired' ? 'Expirou em: ' : 'Expira em: '}
                    {format(expiresAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}

              {/* Days Remaining */}
              {daysRemaining !== null && daysRemaining > 0 && status !== 'expired' && (
                <div className={`text-sm font-medium ${daysRemaining <= 3 ? 'text-destructive' : 'text-foreground'}`}>
                  {daysRemaining === 1 
                    ? 'Último dia de acesso!' 
                    : `${daysRemaining} dias restantes`}
                </div>
              )}
            </div>

            {/* CTA Button */}
            <Button 
              className="w-full gap-2" 
              onClick={handleNavigateToPlans}
            >
              {status === 'active' && planType !== 'trial' 
                ? 'Gerenciar Plano' 
                : 'Ver Planos Disponíveis'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
