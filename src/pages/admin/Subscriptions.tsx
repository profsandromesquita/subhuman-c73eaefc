import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/DataTable';
import { StatsCard } from '@/components/admin/StatsCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  MagnifyingGlass,
  CurrencyDollar,
  Users,
  TrendUp,
  DotsThree
} from '@phosphor-icons/react';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Subscription {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  starts_at: string;
  expires_at: string | null;
  user_name?: string;
}

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    mrr: 0
  });
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [newPlanType, setNewPlanType] = useState('');

  const computeRealStatus = (sub: { status: string; expires_at: string | null }): string => {
    if (sub.status === 'active' && sub.expires_at) {
      return new Date(sub.expires_at) < new Date() ? 'expired' : 'active';
    }
    return sub.status;
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user names
      const userIds = [...new Set((data || []).map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const subscriptionsWithNames = (data || []).map(sub => ({
        ...sub,
        status: computeRealStatus(sub),
        user_name: profiles?.find(p => p.id === sub.user_id)?.full_name || 'Usuário'
      }));

      setSubscriptions(subscriptionsWithNames);

      // Calculate stats — only truly active paid plans
      const paidPlans = ['monthly', 'yearly'];
      const activeCount = subscriptionsWithNames.filter(s => 
        s.status === 'active' && paidPlans.includes(s.plan_type)
      ).length;

      const mrr = subscriptionsWithNames
        .filter(s => s.status === 'active' && paidPlans.includes(s.plan_type))
        .reduce((acc, s) => {
          return acc + (s.plan_type === 'monthly' ? 29.90 : 299.90 / 12);
        }, 0);

      setStats({
        total: subscriptionsWithNames.length,
        active: activeCount,
        mrr
      });
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Erro ao carregar assinaturas');
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub =>
    sub.user_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleViewDetails = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowDetailsDialog(true);
  };

  const handleChangePlan = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setNewPlanType(subscription.plan_type);
    setShowChangePlanDialog(true);
  };

  const handleCancelSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowCancelDialog(true);
  };

  const confirmChangePlan = async () => {
    if (!selectedSubscription || !newPlanType) return;
    
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ plan_type: newPlanType })
        .eq('id', selectedSubscription.id);

      if (error) throw error;

      toast.success('Plano alterado com sucesso');
      setShowChangePlanDialog(false);
      fetchSubscriptions();
    } catch (error) {
      console.error('Error changing plan:', error);
      toast.error('Erro ao alterar plano');
    }
  };

  const confirmCancelSubscription = async () => {
    if (!selectedSubscription) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', selectedSubscription.id);

      if (error) throw error;

      toast.success('Assinatura cancelada com sucesso');
      setShowCancelDialog(false);
      fetchSubscriptions();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error('Erro ao cancelar assinatura');
    }
  };

  const columns = [
    {
      key: 'user',
      header: 'Usuário',
      render: (item: Subscription) => (
        <span className="font-medium text-foreground">
          {item.user_name}
        </span>
      )
    },
    {
      key: 'plan_type',
      header: 'Plano',
       render: (item: Subscription) => {
         const planLabels: Record<string, string> = {
           monthly: 'Mensal',
           yearly: 'Anual',
           trial: 'Trial',
           promo: 'Promo'
         };
         return (
           <span className="px-2 py-1 text-xs rounded-full bg-secondary text-foreground">
             {planLabels[item.plan_type] || item.plan_type}
           </span>
         );
       }
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Subscription) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            item.status === 'active'
              ? 'bg-emerald-500/20 text-emerald-500'
              : item.status === 'cancelled'
              ? 'bg-red-500/20 text-red-500'
              : 'bg-secondary text-muted-foreground'
          }`}
        >
          {item.status === 'active'
            ? 'Ativo'
            : item.status === 'cancelled'
            ? 'Cancelado'
            : item.status === 'expired'
            ? 'Expirado'
            : 'Pendente'}
        </span>
      )
    },
    {
      key: 'starts_at',
      header: 'Início',
      render: (item: Subscription) => (
        <span className="text-muted-foreground">
          {new Date(item.starts_at).toLocaleDateString('pt-BR')}
        </span>
      )
    },
    {
      key: 'expires_at',
      header: 'Expira',
      render: (item: Subscription) => (
        <span className="text-muted-foreground">
          {item.expires_at
            ? new Date(item.expires_at).toLocaleDateString('pt-BR')
            : '-'}
        </span>
      )
    },
    {
      key: 'actions',
      header: '',
      render: (item: Subscription) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <DotsThree className="w-5 h-5" weight="bold" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleViewDetails(item)}>
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleChangePlan(item)}>
              Alterar plano
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => handleCancelSubscription(item)}
            >
              Cancelar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: 'w-12'
    }
  ];

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assinaturas</h1>
          <p className="text-muted-foreground">
            Gerencie as assinaturas dos usuários
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Total de Assinaturas"
            value={stats.total}
            icon={<Users className="w-5 h-5" weight="bold" />}
          />
          <StatsCard
            title="Assinaturas Ativas"
            value={stats.active}
            icon={<TrendUp className="w-5 h-5" weight="bold" />}
          />
          <StatsCard
            title="MRR"
            value={`R$ ${stats.mrr.toFixed(2)}`}
            icon={<CurrencyDollar className="w-5 h-5" weight="bold" />}
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar assinaturas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredSubscriptions}
          loading={loading}
          emptyMessage="Nenhuma assinatura encontrada"
        />

        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes da Assinatura</DialogTitle>
              <DialogDescription>
                Informações completas da assinatura
              </DialogDescription>
            </DialogHeader>
            {selectedSubscription && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Usuário</Label>
                    <p className="font-medium">{selectedSubscription.user_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">ID</Label>
                    <p className="font-mono text-sm">{selectedSubscription.id.slice(0, 8)}...</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Plano</Label>
                    <p className="font-medium">
                      {selectedSubscription.plan_type === 'monthly' ? 'Mensal' : 
                       selectedSubscription.plan_type === 'yearly' ? 'Anual' : 
                       selectedSubscription.plan_type === 'trial' ? 'Trial' : 
                       selectedSubscription.plan_type}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p className={`font-medium ${
                      selectedSubscription.status === 'active' ? 'text-emerald-500' : 'text-muted-foreground'
                    }`}>
                      {selectedSubscription.status === 'active' ? 'Ativo' : 
                       selectedSubscription.status === 'cancelled' ? 'Cancelado' : 
                       selectedSubscription.status}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Início</Label>
                    <p>{new Date(selectedSubscription.starts_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Expira em</Label>
                    <p>
                      {selectedSubscription.expires_at 
                        ? new Date(selectedSubscription.expires_at).toLocaleDateString('pt-BR')
                        : 'Sem data'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Change Plan Dialog */}
        <Dialog open={showChangePlanDialog} onOpenChange={setShowChangePlanDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Plano</DialogTitle>
              <DialogDescription>
                Selecione o novo plano para {selectedSubscription?.user_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Novo Plano</Label>
                <Select value={newPlanType} onValueChange={setNewPlanType}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial (7 dias)</SelectItem>
                    <SelectItem value="monthly">Mensal (R$ 29,90)</SelectItem>
                    <SelectItem value="yearly">Anual (R$ 299,90)</SelectItem>
                    <SelectItem value="promo">Promocional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowChangePlanDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={confirmChangePlan}>
                  Confirmar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cancel Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar Assinatura</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja cancelar a assinatura de {selectedSubscription?.user_name}?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmCancelSubscription}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Cancelar Assinatura
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </AdminLayout>
  );
}
