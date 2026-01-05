import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  MagnifyingGlass,
  DotsThree,
  Trash,
  User,
  Shield,
  ShieldCheck
} from '@phosphor-icons/react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface SystemUser {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  full_name?: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
}

export default function SystemUsers() {
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    role: 'moderator' as 'admin' | 'moderator'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch admin/moderator roles
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('*')
        .in('role', ['admin', 'moderator'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch all profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name');

      setAllProfiles(profiles || []);

      const usersWithNames = (roles || []).map(role => ({
        ...role,
        full_name: profiles?.find(p => p.id === role.user_id)?.full_name || 'Sem nome'
      }));

      setSystemUsers(usersWithNames);
    } catch (error) {
      console.error('Error fetching system users:', error);
      toast.error('Erro ao carregar usuários do sistema');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    try {
      // Check if user already has this role
      const existing = systemUsers.find(
        u => u.user_id === formData.user_id && u.role === formData.role
      );

      if (existing) {
        toast.error('Este usuário já possui essa role');
        return;
      }

      const { error } = await supabase.from('user_roles').insert({
        user_id: formData.user_id,
        role: formData.role
      });

      if (error) throw error;

      toast.success('Role adicionada com sucesso!');
      setIsDialogOpen(false);
      setFormData({ user_id: '', role: 'moderator' });
      fetchData();
    } catch (error) {
      console.error('Error adding role:', error);
      toast.error('Erro ao adicionar role');
    }
  };

  const handleRemoveRole = async (userRole: SystemUser) => {
    if (!confirm('Tem certeza que deseja remover esta role?')) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', userRole.id);

      if (error) throw error;
      toast.success('Role removida!');
      fetchData();
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Erro ao remover role');
    }
  };

  const filteredUsers = systemUsers.filter(user =>
    user.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Get users that don't have admin/moderator roles yet
  const availableUsers = allProfiles.filter(
    profile => !systemUsers.some(su => su.user_id === profile.id)
  );

  const columns = [
    {
      key: 'user',
      header: 'Usuário',
      render: (item: SystemUser) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">{item.full_name}</p>
            <p className="text-sm text-muted-foreground">
              {item.user_id.slice(0, 8)}...
            </p>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      header: 'Role',
      render: (item: SystemUser) => (
        <div className="flex items-center gap-2">
          {item.role === 'admin' ? (
            <ShieldCheck className="w-4 h-4 text-amber-500" />
          ) : (
            <Shield className="w-4 h-4 text-blue-500" />
          )}
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              item.role === 'admin'
                ? 'bg-amber-500/20 text-amber-500'
                : 'bg-blue-500/20 text-blue-500'
            }`}
          >
            {item.role === 'admin' ? 'Admin' : 'Moderador'}
          </span>
        </div>
      )
    },
    {
      key: 'created_at',
      header: 'Desde',
      render: (item: SystemUser) => (
        <span className="text-muted-foreground">
          {new Date(item.created_at).toLocaleDateString('pt-BR')}
        </span>
      )
    },
    {
      key: 'actions',
      header: '',
      render: (item: SystemUser) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <DotsThree className="w-5 h-5" weight="bold" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleRemoveRole(item)}
            >
              <Trash className="w-4 h-4 mr-2" />
              Remover Role
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
            <h1 className="text-2xl font-bold text-foreground">
              Usuários do Sistema
            </h1>
            <p className="text-muted-foreground">
              Gerencie administradores e moderadores
            </p>
          </div>
          <Button variant="glow" onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Role
          </Button>
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
          emptyMessage="Nenhum administrador ou moderador"
        />

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Usuário
                </label>
                <Select
                  value={formData.user_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, user_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || 'Sem nome'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Role
                </label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'admin' | 'moderator') =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moderator">Moderador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAddRole}
                className="w-full"
                disabled={!formData.user_id}
              >
                Adicionar Role
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AdminLayout>
  );
}
