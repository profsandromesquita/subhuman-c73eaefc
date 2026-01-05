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
  PencilSimple,
  Trash,
  Eye,
  EyeSlash
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
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

interface Channel {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  post_count?: number;
}

export default function AdminChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Get post counts
      const { data: posts } = await supabase
        .from('channel_posts')
        .select('channel_id');

      const channelsWithCounts = (data || []).map(channel => ({
        ...channel,
        post_count: (posts || []).filter(p => p.channel_id === channel.id).length
      }));

      setChannels(channelsWithCounts);
    } catch (error) {
      console.error('Error fetching channels:', error);
      toast.error('Erro ao carregar canais');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingChannel) {
        const { error } = await supabase
          .from('channels')
          .update({
            name: formData.name,
            description: formData.description
          })
          .eq('id', editingChannel.id);

        if (error) throw error;
        toast.success('Canal atualizado!');
      } else {
        const { error } = await supabase.from('channels').insert({
          name: formData.name,
          description: formData.description,
          sort_order: channels.length
        });

        if (error) throw error;
        toast.success('Canal criado!');
      }

      setIsDialogOpen(false);
      setEditingChannel(null);
      setFormData({ name: '', description: '' });
      fetchChannels();
    } catch (error) {
      console.error('Error saving channel:', error);
      toast.error('Erro ao salvar canal');
    }
  };

  const handleEdit = (channel: Channel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      description: channel.description || ''
    });
    setIsDialogOpen(true);
  };

  const handleToggleActive = async (channel: Channel) => {
    try {
      const { error } = await supabase
        .from('channels')
        .update({ is_active: !channel.is_active })
        .eq('id', channel.id);

      if (error) throw error;
      toast.success(channel.is_active ? 'Canal desativado' : 'Canal ativado');
      fetchChannels();
    } catch (error) {
      console.error('Error toggling channel:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleDelete = async (channel: Channel) => {
    if (!confirm('Tem certeza que deseja excluir este canal?')) return;

    try {
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', channel.id);

      if (error) throw error;
      toast.success('Canal excluído!');
      fetchChannels();
    } catch (error) {
      console.error('Error deleting channel:', error);
      toast.error('Erro ao excluir canal');
    }
  };

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: 'name',
      header: 'Nome',
      render: (item: Channel) => (
        <div>
          <p className="font-medium text-foreground">{item.name}</p>
          <p className="text-sm text-muted-foreground">
            {item.post_count} posts
          </p>
        </div>
      )
    },
    {
      key: 'description',
      header: 'Descrição',
      render: (item: Channel) => (
        <span className="text-muted-foreground line-clamp-1">
          {item.description || '-'}
        </span>
      )
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (item: Channel) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={item.is_active}
            onCheckedChange={() => handleToggleActive(item)}
          />
          <span className={item.is_active ? 'text-emerald-500' : 'text-muted-foreground'}>
            {item.is_active ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      )
    },
    {
      key: 'actions',
      header: '',
      render: (item: Channel) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <DotsThree className="w-5 h-5" weight="bold" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(item)}>
              <PencilSimple className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleToggleActive(item)}>
              {item.is_active ? (
                <>
                  <EyeSlash className="w-4 h-4 mr-2" />
                  Desativar
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Ativar
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleDelete(item)}
            >
              <Trash className="w-4 h-4 mr-2" />
              Excluir
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
            <h1 className="text-2xl font-bold text-foreground">Canais</h1>
            <p className="text-muted-foreground">
              Gerencie os canais da comunidade
            </p>
          </div>
          <Button
            variant="glow"
            onClick={() => {
              setEditingChannel(null);
              setFormData({ name: '', description: '' });
              setIsDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Canal
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar canais..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredChannels}
          loading={loading}
          emptyMessage="Nenhum canal encontrado"
        />

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingChannel ? 'Editar Canal' : 'Novo Canal'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Nome
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Geral"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Descrição
                </label>
                <Input
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Discussões gerais da comunidade"
                />
              </div>
              <Button onClick={handleSave} className="w-full">
                {editingChannel ? 'Salvar Alterações' : 'Criar Canal'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AdminLayout>
  );
}
