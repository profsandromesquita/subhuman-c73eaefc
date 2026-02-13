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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: string[];
  subscription_status?: string;
  email?: string;
}

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'moderator' | 'user'>('user');

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

      // Fetch subscriptions with expires_at for real status
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('user_id, status, expires_at')
        .eq('status', 'active');

      if (subError) throw subError;

      // Fetch emails for admin
      const { data: emails } = await supabase.rpc('get_user_emails_admin');

      // Merge data
      const usersWithRoles = (profiles || []).map(profile => {
        const sub = (subscriptions || []).find(s => s.user_id === profile.id);
        let realStatus = 'none';
        if (sub) {
          realStatus = sub.status === 'active' && sub.expires_at && new Date(sub.expires_at) < new Date()
            ? 'expired'
            : sub.status;
        }
        return {
          ...profile,
          roles: (roles || [])
            .filter(r => r.user_id === profile.id)
            .map(r => r.role),
          subscription_status: realStatus,
          email: (emails || []).find((e: any) => e.user_id === profile.id)?.email || undefined,
        };
      });

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

  const handleViewProfile = (user: UserProfile) => {
    setSelectedUser(user);
    setShowProfileDialog(true);
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setEditName(user.full_name || '');
    setEditRole((user.roles[0] as 'admin' | 'moderator' | 'user') || 'user');
    setShowEditDialog(true);
  };

  const handleDeactivateUser = (user: UserProfile) => {
    setSelectedUser(user);
    setShowDeactivateDialog(true);
  };

  const confirmEditUser = async () => {
    if (!selectedUser) return;

    try {
      // Update profile name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: editName })
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      // Update role if changed
      const currentRole = selectedUser.roles[0];
      if (currentRole !== editRole) {
        // Delete old role
        if (currentRole) {
          await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', selectedUser.id)
            .eq('role', currentRole as 'admin' | 'moderator' | 'user');
        }
        
        // Insert new role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: selectedUser.id, role: editRole });

        if (roleError) throw roleError;
      }

      toast.success('Usuário atualizado com sucesso');
      setShowEditDialog(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Erro ao atualizar usuário');
    }
  };

  const confirmDeactivateUser = async () => {
    if (!selectedUser) return;

    try {
      // Cancel any active subscription
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', selectedUser.id)
        .eq('status', 'active');

      if (error) throw error;

      toast.success('Usuário desativado com sucesso');
      setShowDeactivateDialog(false);
      fetchUsers();
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast.error('Erro ao desativar usuário');
    }
  };

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
      key: 'email',
      header: 'Email',
      render: (item: UserProfile) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
          {item.email || '-'}
        </span>
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
          {item.subscription_status === 'active' ? 'Ativo' : 'Freemium'}
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
            <DropdownMenuItem onClick={() => handleViewProfile(item)}>
              Ver perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEditUser(item)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => handleDeactivateUser(item)}
            >
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

        {/* Profile Dialog */}
        <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Perfil do Usuário</DialogTitle>
              <DialogDescription>
                Informações detalhadas do usuário
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={selectedUser.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="w-8 h-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {selectedUser.full_name || 'Sem nome'}
                    </h3>
                    <p className="text-sm text-muted-foreground font-mono">
                      {selectedUser.id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Roles</Label>
                    <div className="flex gap-1 mt-1">
                      {selectedUser.roles.length > 0 ? (
                        selectedUser.roles.map(role => (
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
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">Nenhuma</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="mt-1 text-sm">{selectedUser.email || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Assinatura</Label>
                    <p className={`mt-1 ${
                      selectedUser.subscription_status === 'active' 
                        ? 'text-emerald-500' 
                        : 'text-muted-foreground'
                    }`}>
                      {selectedUser.subscription_status === 'active' ? 'Ativa' : 'Freemium'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Cadastro</Label>
                    <p>{new Date(selectedUser.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Altere as informações do usuário
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as 'admin' | 'moderator' | 'user')}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="moderator">Moderador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={confirmEditUser}>
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Deactivate Dialog */}
        <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desativar Usuário</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja desativar {selectedUser?.full_name || 'este usuário'}?
                Isso irá cancelar qualquer assinatura ativa.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeactivateUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Desativar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </AdminLayout>
  );
}
