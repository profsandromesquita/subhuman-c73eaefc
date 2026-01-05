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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { IconPicker, getIconComponent } from '@/components/admin/IconPicker';

interface Space {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export default function Spaces() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: ''
  });

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setSpaces(data || []);
    } catch (error) {
      console.error('Error fetching spaces:', error);
      toast.error('Erro ao carregar espaços');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingSpace) {
        const { error } = await supabase
          .from('spaces')
          .update({
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
            icon: formData.icon
          })
          .eq('id', editingSpace.id);

        if (error) throw error;
        toast.success('Espaço atualizado com sucesso!');
      } else {
        const { error } = await supabase.from('spaces').insert({
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          icon: formData.icon,
          sort_order: spaces.length
        });

        if (error) throw error;
        toast.success('Espaço criado com sucesso!');
      }

      setIsDialogOpen(false);
      setEditingSpace(null);
      setFormData({ name: '', slug: '', description: '', icon: '' });
      fetchSpaces();
    } catch (error) {
      console.error('Error saving space:', error);
      toast.error('Erro ao salvar espaço');
    }
  };

  const handleEdit = (space: Space) => {
    setEditingSpace(space);
    setFormData({
      name: space.name,
      slug: space.slug,
      description: space.description || '',
      icon: space.icon || ''
    });
    setIsDialogOpen(true);
  };

  const handleToggleActive = async (space: Space) => {
    try {
      const { error } = await supabase
        .from('spaces')
        .update({ is_active: !space.is_active })
        .eq('id', space.id);

      if (error) throw error;
      toast.success(space.is_active ? 'Espaço desativado' : 'Espaço ativado');
      fetchSpaces();
    } catch (error) {
      console.error('Error toggling space:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleDelete = async (space: Space) => {
    if (!confirm('Tem certeza que deseja excluir este espaço?')) return;

    try {
      const { error } = await supabase
        .from('spaces')
        .delete()
        .eq('id', space.id);

      if (error) throw error;
      toast.success('Espaço excluído com sucesso!');
      fetchSpaces();
    } catch (error) {
      console.error('Error deleting space:', error);
      toast.error('Erro ao excluir espaço');
    }
  };

  const filteredSpaces = spaces.filter(space =>
    space.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: 'icon',
      header: '',
      render: (item: Space) => {
        const IconComponent = getIconComponent(item.icon);
        return (
          <div className="p-2 bg-secondary rounded-lg w-fit">
            <IconComponent className="w-5 h-5" weight="bold" />
          </div>
        );
      },
      className: 'w-16'
    },
    {
      key: 'name',
      header: 'Nome',
      render: (item: Space) => (
        <div>
          <p className="font-medium text-foreground">{item.name}</p>
          <p className="text-sm text-muted-foreground">/{item.slug}</p>
        </div>
      )
    },
    {
      key: 'description',
      header: 'Descrição',
      render: (item: Space) => (
        <span className="text-muted-foreground line-clamp-1">
          {item.description || '-'}
        </span>
      )
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (item: Space) => (
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
      render: (item: Space) => (
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
            <h1 className="text-2xl font-bold text-foreground">Espaços</h1>
            <p className="text-muted-foreground">
              Gerencie os espaços temáticos
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="glow"
                onClick={() => {
                  setEditingSpace(null);
                  setFormData({ name: '', slug: '', description: '', icon: '' });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Espaço
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingSpace ? 'Editar Espaço' : 'Novo Espaço'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Ícone
                  </label>
                  <IconPicker
                    value={formData.icon}
                    onChange={(value) => setFormData({ ...formData, icon: value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Nome
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Produtividade"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Slug
                  </label>
                  <Input
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    placeholder="produtividade"
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
                    placeholder="Dicas para aumentar sua produtividade"
                  />
                </div>
                <Button onClick={handleSave} className="w-full">
                  {editingSpace ? 'Salvar Alterações' : 'Criar Espaço'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar espaços..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredSpaces}
          loading={loading}
          emptyMessage="Nenhum espaço encontrado"
        />
      </motion.div>
    </AdminLayout>
  );
}
