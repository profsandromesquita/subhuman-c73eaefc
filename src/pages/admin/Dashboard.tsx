import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatsCard } from '@/components/admin/StatsCard';
import { DataTable } from '@/components/admin/DataTable';
import { Users, CreditCard, Article, Bell } from '@phosphor-icons/react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalPosts: number;
  newUsersWeek: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  created_at: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalPosts: 0,
    newUsersWeek: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch total users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch active subscriptions
      const { count: subCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Fetch total posts
      const { count: postCount } = await supabase
        .from('space_updates')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true);

      // Fetch new users this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: newUserCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

      setStats({
        totalUsers: userCount || 0,
        activeSubscriptions: subCount || 0,
        totalPosts: postCount || 0,
        newUsersWeek: newUserCount || 0
      });

      // Fetch recent notifications as activity
      const { data: notifications } = await supabase
        .from('notifications')
        .select('id, title, message, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentActivity(
        (notifications || []).map(n => ({
          id: n.id,
          type: 'notification',
          description: n.title,
          created_at: n.created_at
        }))
      );
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const activityColumns = [
    {
      key: 'type',
      header: 'Tipo',
      render: (item: RecentActivity) => (
        <span className="px-2 py-1 text-xs rounded-full bg-secondary text-foreground">
          {item.type}
        </span>
      )
    },
    {
      key: 'description',
      header: 'Descrição',
      render: (item: RecentActivity) => (
        <span className="text-foreground">{item.description}</span>
      )
    },
    {
      key: 'created_at',
      header: 'Data',
      render: (item: RecentActivity) => (
        <span className="text-muted-foreground">
          {new Date(item.created_at).toLocaleDateString('pt-BR')}
        </span>
      )
    }
  ];

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total de Usuários"
            value={stats.totalUsers}
            icon={<Users className="w-5 h-5" weight="bold" />}
            change={12}
            changeLabel="vs. mês passado"
          />
          <StatsCard
            title="Assinaturas Ativas"
            value={stats.activeSubscriptions}
            icon={<CreditCard className="w-5 h-5" weight="bold" />}
            change={8}
            changeLabel="vs. mês passado"
          />
          <StatsCard
            title="Conteúdos Publicados"
            value={stats.totalPosts}
            icon={<Article className="w-5 h-5" weight="bold" />}
          />
          <StatsCard
            title="Novos Usuários (7 dias)"
            value={stats.newUsersWeek}
            icon={<Bell className="w-5 h-5" weight="bold" />}
            change={stats.newUsersWeek > 0 ? 100 : 0}
          />
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Atividades Recentes
          </h2>
          <DataTable
            columns={activityColumns}
            data={recentActivity}
            loading={loading}
            emptyMessage="Nenhuma atividade recente"
          />
        </div>
      </motion.div>
    </AdminLayout>
  );
}
