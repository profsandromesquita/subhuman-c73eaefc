import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  MagnifyingGlass,
  DotsThree,
  PencilSimple,
  Trash,
  Eye,
  EyeSlash,
  Lock,
  Crown,
  Globe,
  ChatCircle,
  Question,
  Users,
  Rocket,
  Wrench,
  Handshake
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
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface Channel {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  access_type: 'open' | 'subscribers' | 'premium';
  icon: string | null;
  post_count?: number;
}

const iconOptions = [
  { value: 'ChatCircle', label: 'Chat', icon: ChatCircle },
  { value: 'Question', label: 'Dúvidas', icon: Question },
  { value: 'Users', label: 'Usuários', icon: Users },
  { value: 'Rocket', label: 'Projetos', icon: Rocket },
  { value: 'Wrench', label: 'Ferramentas', icon: Wrench },
  { value: 'Handshake', label: 'Networking', icon: Handshake },
];

export default function AdminChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    access_type: 'open' as 'open' | 'subscribers' | 'premium',
    icon: 'ChatCircle'
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
        id: channel.id,
        name: channel.name,
        description: channel.description,
        is_active: channel.is_active,
        sort_order: channel.sort_order || 0,
        created_at: channel.created_at,
        access_type: ((channel as any).access_type || 'open') as 'open' | 'subscribers' | 'premium',
        icon: (channel as any).icon || 'ChatCircle',
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
            description: formData.description,
            access_type: formData.access_type,
            icon: formData.icon
          } as any)
          .eq('id', editingChannel.id);

        if (error) throw error;
        toast.success('Canal atualizado!');
      } else {
        const { error } = await supabase.from('channels').insert({
          name: formData.name,
          description: formData.description,
          access_type: formData.access_type,
          icon: formData.icon,
          sort_order: channels.length
        } as any);

        if (error) throw error;
        toast.success('Canal criado!');
      }

      setIsDialogOpen(false);
      setEditingChannel(null);
      setFormData({ name: '', description: '', access_type: 'open', icon: 'ChatCircle' });
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
      description: channel.description || '',
      access_type: channel.access_type,
      icon: channel.icon || 'ChatCircle'
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

  const getAccessBadge = (accessType: string) => {
    switch (accessType) {
      case 'premium':
        return (
          <Badge variant="secondary" className="gap-1 text-yellow-600 bg-yellow-500/10">
            <Crown className="w-3 h-3" weight="fill" />
            Premium
          </Badge>
        );
      case 'subscribers':
        return (
          <Badge variant="secondary" className="gap-1">
            <Lock className="w-3 h-3" />
            Assinantes
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Globe className="w-3 h-3" />
            Aberto
          </Badge>
        );
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Nome',
      render: (item: Channel) => {
        const IconComp = iconOptions.find(i => i.value === item.icon)?.icon || ChatCircle;
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">
              <IconComp className="w-4 h-4" weight="bold" />
            </div>
            <div>
              <p className="font-medium text-foreground">{item.name}</p>
              <p className="text-sm text-muted-foreground">
                {item.post_count} posts
              </p>
            </div>
          </div>
        );
      }
    },
    {
      key: 'access_type',
      header: 'Acesso',
      render: (item: Channel) => getAccessBadge(item.access_type)
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
              setFormData({ name: '', description: '', access_type: 'open', icon: 'ChatCircle' });
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingChannel ? 'Editar Canal' : 'Novo Canal'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Geral"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Discussões gerais da comunidade"
                />
              </div>

              <div className="space-y-2">
                <Label>Ícone</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) => setFormData({ ...formData, icon: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map(option => {
                      const Icon = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Tipo de Acesso</Label>
                <RadioGroup
                  value={formData.access_type}
                  onValueChange={(value: 'open' | 'subscribers' | 'premium') => 
                    setFormData({ ...formData, access_type: value })
                  }
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="open" id="open" />
                    <Label htmlFor="open" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-emerald-500" />
                        <span className="font-medium">Aberto</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Todos podem acessar e participar
                      </p>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="subscribers" id="subscribers" />
                    <Label htmlFor="subscribers" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">Assinantes</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Apenas usuários com assinatura ativa
                      </p>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="premium" id="premium" />
                    <Label htmlFor="premium" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium">Premium</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Exclusivo para plano anual
                      </p>
                    </Label>
                  </div>
                </RadioGroup>
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
