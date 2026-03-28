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
  Clock,
  Check,
  Brain,
} from '@phosphor-icons/react';
import { useConvertToRAG } from '@/hooks/useRAGDocuments';
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
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { MediaUploader } from '@/components/editor/MediaUploader';
import { useMediaUpload, MediaFile } from '@/hooks/useMediaUpload';

interface SpaceUpdate {
  id: string;
  space_id: string;
  title: string;
  content: string | null;
  is_published: boolean;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  space_name?: string;
}

interface Space {
  id: string;
  name: string;
}

async function indexArticleRAG(articleId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/index-article-rag`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ article_id: articleId }),
      }
    );
    console.log('RAG indexing triggered for article:', articleId);
  } catch (err) {
    console.error('RAG indexing error:', err);
  }
}

async function generateArticleAudio(postId: string, htmlContent: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-generate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ post_id: postId, html_content: htmlContent }),
      }
    );

    if (!response.ok) {
      console.error('Audio generation failed:', await response.text());
      return;
    }

    const { audio_url } = await response.json();
    console.log('Audio generated:', audio_url);
  } catch (err) {
    console.error('Audio generation error:', err);
  }
}

export default function SpaceContent() {
  const { user } = useAdminAuth();
  const { saveMediaToSpaceUpdate, deleteMediaFromSpaceUpdate, getMediaForSpaceUpdate } = useMediaUpload();
  const { convert: convertToRAG, isConverting } = useConvertToRAG();
  const [updates, setUpdates] = useState<SpaceUpdate[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<SpaceUpdate | null>(null);
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [formData, setFormData] = useState({
    space_id: '',
    title: '',
    content: '',
    scheduled_at: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch spaces
      const { data: spacesData } = await supabase
        .from('spaces')
        .select('id, name')
        .eq('is_active', true);
      setSpaces(spacesData || []);

      // Fetch updates
      const { data, error } = await supabase
        .from('space_updates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const updatesWithSpaces = (data || []).map(update => ({
        ...update,
        space_name: spacesData?.find(s => s.id === update.space_id)?.name || 'Desconhecido'
      }));

      setUpdates(updatesWithSpaces);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar conteúdos');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (publish = false) => {
    try {
      // Find first image for thumbnail
      const firstImage = media.find(m => m.type === 'image');

      const updateData = {
        space_id: formData.space_id,
        title: formData.title,
        content: formData.content,
        author_id: user?.id,
        is_published: publish,
        published_at: publish ? new Date().toISOString() : null,
        scheduled_at: formData.scheduled_at || null,
        thumbnail_url: firstImage?.url || null,
        media_type: firstImage ? 'image' : null
      };

      let updateId: string | undefined;

      if (editingUpdate) {
        const { error } = await supabase
          .from('space_updates')
          .update(updateData)
          .eq('id', editingUpdate.id);

        if (error) throw error;
        updateId = editingUpdate.id;

        // Delete old media and save new
        await deleteMediaFromSpaceUpdate(editingUpdate.id);
        toast.success('Conteúdo atualizado!');
      } else {
        // slug is auto-generated by database trigger
        const { data, error } = await supabase
          .from('space_updates')
          .insert(updateData as any)
          .select('id')
          .single();

        if (error) throw error;
        updateId = data?.id;
        toast.success(publish ? 'Conteúdo publicado!' : 'Rascunho salvo!');
      }

      // Dispara geração de áudio e indexação RAG em background após publicação
      if (publish && updateId && formData.content) {
        generateArticleAudio(updateId, formData.content);
        indexArticleRAG(updateId);
      }

      // Re-indexa RAG quando artigo já publicado é editado
      if (editingUpdate?.is_published && updateId && !publish) {
        indexArticleRAG(updateId);
      }

      // Save media if any
      if (updateId && media.length > 0) {
        await saveMediaToSpaceUpdate(updateId, media);
      }

      setIsDialogOpen(false);
      setEditingUpdate(null);
      setFormData({ space_id: '', title: '', content: '', scheduled_at: '' });
      setMedia([]);
      fetchData();
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Erro ao salvar conteúdo');
    }
  };

  const handleEdit = async (update: SpaceUpdate) => {
    setEditingUpdate(update);
    setFormData({
      space_id: update.space_id,
      title: update.title,
      content: update.content || '',
      scheduled_at: update.scheduled_at || ''
    });
    // Load existing media
    const existingMedia = await getMediaForSpaceUpdate(update.id);
    setMedia(existingMedia);
    setIsDialogOpen(true);
  };

  const handlePublish = async (update: SpaceUpdate) => {
    try {
      const { error } = await supabase
        .from('space_updates')
        .update({
          is_published: true,
          published_at: new Date().toISOString()
        })
        .eq('id', update.id);

      if (error) throw error;
      toast.success('Conteúdo publicado!');

      // Dispara geração de áudio e indexação RAG em background
      if (update.content) {
        generateArticleAudio(update.id, update.content);
      }
      indexArticleRAG(update.id);

      fetchData();
    } catch (error) {
      console.error('Error publishing:', error);
      toast.error('Erro ao publicar');
    }
  };

  const handleDelete = async (update: SpaceUpdate) => {
    if (!confirm('Tem certeza que deseja excluir este conteúdo?')) return;

    try {
      const { error } = await supabase
        .from('space_updates')
        .delete()
        .eq('id', update.id);

      if (error) throw error;
      toast.success('Conteúdo excluído!');
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Erro ao excluir');
    }
  };

  const filteredUpdates = updates.filter(update =>
    update.title.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: 'title',
      header: 'Título',
      render: (item: SpaceUpdate) => (
        <div>
          <p className="font-medium text-foreground">{item.title}</p>
          <p className="text-sm text-muted-foreground">{item.space_name}</p>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: SpaceUpdate) => {
        if (item.is_published) {
          return (
            <span className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-500 flex items-center gap-1 w-fit">
              <Check className="w-3 h-3" />
              Publicado
            </span>
          );
        }
        if (item.scheduled_at) {
          return (
            <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-500 flex items-center gap-1 w-fit">
              <Clock className="w-3 h-3" />
              Agendado
            </span>
          );
        }
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-secondary text-muted-foreground">
            Rascunho
          </span>
        );
      }
    },
    {
      key: 'created_at',
      header: 'Criado em',
      render: (item: SpaceUpdate) => (
        <span className="text-muted-foreground">
          {new Date(item.created_at).toLocaleDateString('pt-BR')}
        </span>
      )
    },
    {
      key: 'actions',
      header: '',
      render: (item: SpaceUpdate) => (
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
            {!item.is_published && (
              <DropdownMenuItem onClick={() => handlePublish(item)}>
                <Check className="w-4 h-4 mr-2" />
                Publicar agora
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleDelete(item)}
            >
              <Trash className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
            {item.is_published && item.content && (
              <DropdownMenuItem
                onClick={() => convertToRAG({
                  title: item.title,
                  content: item.content || '',
                  source_type: 'space_update',
                  tags: ['artigo', item.space_name || ''],
                })}
                disabled={isConverting}
              >
                <Brain className="w-4 h-4 mr-2" />
                {isConverting ? 'Convertendo...' : 'Converter em RAG'}
              </DropdownMenuItem>
            )}
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
            <h1 className="text-2xl font-bold text-foreground">Conteúdos</h1>
            <p className="text-muted-foreground">
              Publique e agende conteúdos nos espaços
            </p>
          </div>
          <Button
            variant="glow"
            onClick={() => {
              setEditingUpdate(null);
              setFormData({ space_id: '', title: '', content: '', scheduled_at: '' });
              setMedia([]);
              setIsDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Conteúdo
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conteúdos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredUpdates}
          loading={loading}
          emptyMessage="Nenhum conteúdo encontrado"
        />

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingUpdate ? 'Editar Conteúdo' : 'Novo Conteúdo'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Espaço
                </label>
                <Select
                  value={formData.space_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, space_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um espaço" />
                  </SelectTrigger>
                  <SelectContent>
                    {spaces.map((space) => (
                      <SelectItem key={space.id} value={space.id}>
                        {space.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Título
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Título do conteúdo"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Conteúdo
                </label>
                <RichTextEditor
                  content={formData.content}
                  onChange={(content) =>
                    setFormData({ ...formData, content })
                  }
                  placeholder="Escreva o conteúdo aqui..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Mídia
                </label>
                <MediaUploader
                  media={media}
                  onMediaAdd={(m) => setMedia(prev => [...prev, m])}
                  onMediaRemove={(i) => setMedia(prev => prev.filter((_, idx) => idx !== i))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Agendar para (opcional)
                </label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduled_at: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => handleSave(false)}
                  className="flex-1"
                >
                  Salvar Rascunho
                </Button>
                <Button
                  variant="glow"
                  onClick={() => handleSave(true)}
                  className="flex-1"
                >
                  Publicar Agora
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AdminLayout>
  );
}
