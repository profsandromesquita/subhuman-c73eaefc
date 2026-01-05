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
        user_name: profiles?.find(p => p.id === sub.user_id)?.full_name || 'Usuário'
      }));

      setSubscriptions(subscriptionsWithNames);

      // Calculate stats
      const activeCount = (data || []).filter(s => s.status === 'active').length;
      const monthlyPrice = 29.90;
      const yearlyPrice = 299.90 / 12;

      const mrr = (data || [])
        .filter(s => s.status === 'active')
        .reduce((acc, s) => {
          return acc + (s.plan_type === 'monthly' ? monthlyPrice : yearlyPrice);
        }, 0);

      setStats({
        total: (data || []).length,
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
      render: (item: Subscription) => (
        <span className="px-2 py-1 text-xs rounded-full bg-secondary text-foreground">
          {item.plan_type === 'monthly' ? 'Mensal' : 'Anual'}
        </span>
      )
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
      render: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <DotsThree className="w-5 h-5" weight="bold" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
            <DropdownMenuItem>Alterar plano</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
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
      </motion.div>
    </AdminLayout>
  );
}
