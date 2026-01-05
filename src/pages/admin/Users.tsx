import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MagnifyingGlass, DotsThree, User } from '@phosphor-icons/react';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: string[];
  subscription_status?: string;
}

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profileError) throw profileError;

      // Fetch roles for all users
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('user_id, status')
        .eq('status', 'active');

      if (subError) throw subError;

      // Merge data
      const usersWithRoles = (profiles || []).map(profile => ({
        ...profile,
        roles: (roles || [])
          .filter(r => r.user_id === profile.id)
          .map(r => r.role),
        subscription_status: (subscriptions || [])
          .find(s => s.user_id === profile.id)?.status || 'none'
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: 'user',
      header: 'Usuário',
      render: (item: UserProfile) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            {item.avatar_url ? (
              <img
                src={item.avatar_url}
                alt={item.full_name || ''}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">
              {item.full_name || 'Sem nome'}
            </p>
            <p className="text-sm text-muted-foreground">
              ID: {item.id.slice(0, 8)}...
            </p>
          </div>
        </div>
      )
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (item: UserProfile) => (
        <div className="flex gap-1">
          {item.roles.map(role => (
            <span
              key={role}
              className={`px-2 py-1 text-xs rounded-full ${
                role === 'admin'
                  ? 'bg-amber-500/20 text-amber-500'
                  : role === 'moderator'
                  ? 'bg-blue-500/20 text-blue-500'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {role}
            </span>
          ))}
        </div>
      )
    },
    {
      key: 'subscription',
      header: 'Assinatura',
      render: (item: UserProfile) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            item.subscription_status === 'active'
              ? 'bg-emerald-500/20 text-emerald-500'
              : 'bg-secondary text-muted-foreground'
          }`}
        >
          {item.subscription_status === 'active' ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      key: 'created_at',
      header: 'Cadastro',
      render: (item: UserProfile) => (
        <span className="text-muted-foreground">
          {new Date(item.created_at).toLocaleDateString('pt-BR')}
        </span>
      )
    },
    {
      key: 'actions',
      header: '',
      render: (item: UserProfile) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <DotsThree className="w-5 h-5" weight="bold" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Ver perfil</DropdownMenuItem>
            <DropdownMenuItem>Editar</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              Desativar
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
            <p className="text-muted-foreground">
              Gerencie os usuários do sistema
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuários..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredUsers}
          loading={loading}
          emptyMessage="Nenhum usuário encontrado"
        />
      </motion.div>
    </AdminLayout>
  );
}
