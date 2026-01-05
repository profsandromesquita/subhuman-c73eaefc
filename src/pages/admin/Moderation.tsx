import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MagnifyingGlass,
  Check,
  Trash,
  Warning,
  User
} from '@phosphor-icons/react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReportedPost {
  id: string;
  channel_id: string;
  author_id: string | null;
  content: string;
  is_reported: boolean;
  created_at: string;
  channel_name?: string;
  author_name?: string;
}

export default function Moderation() {
  const [posts, setPosts] = useState<ReportedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchReportedPosts();
  }, []);

  const fetchReportedPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('channel_posts')
        .select('*')
        .eq('is_reported', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch channel names
      const channelIds = [...new Set((data || []).map(p => p.channel_id))];
      const { data: channels } = await supabase
        .from('channels')
        .select('id, name')
        .in('id', channelIds);

      // Fetch author names
      const authorIds = [...new Set((data || []).filter(p => p.author_id).map(p => p.author_id!))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', authorIds);

      const postsWithDetails = (data || []).map(post => ({
        ...post,
        channel_name: channels?.find(c => c.id === post.channel_id)?.name || 'Desconhecido',
        author_name: profiles?.find(p => p.id === post.author_id)?.full_name || 'Anônimo'
      }));

      setPosts(postsWithDetails);
    } catch (error) {
      console.error('Error fetching reported posts:', error);
      toast.error('Erro ao carregar posts reportados');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (post: ReportedPost) => {
    try {
      const { error } = await supabase
        .from('channel_posts')
        .update({ is_reported: false })
        .eq('id', post.id);

      if (error) throw error;
      toast.success('Post aprovado');
      fetchReportedPosts();
    } catch (error) {
      console.error('Error approving post:', error);
      toast.error('Erro ao aprovar post');
    }
  };

  const handleRemove = async (post: ReportedPost) => {
    if (!confirm('Tem certeza que deseja remover este post?')) return;

    try {
      const { error } = await supabase
        .from('channel_posts')
        .update({ is_moderated: true })
        .eq('id', post.id);

      if (error) throw error;
      toast.success('Post removido');
      fetchReportedPosts();
    } catch (error) {
      console.error('Error removing post:', error);
      toast.error('Erro ao remover post');
    }
  };

  const handleDelete = async (post: ReportedPost) => {
    if (!confirm('Tem certeza que deseja excluir permanentemente este post?')) return;

    try {
      const { error } = await supabase
        .from('channel_posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;
      toast.success('Post excluído permanentemente');
      fetchReportedPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Erro ao excluir post');
    }
  };

  const filteredPosts = posts.filter(post =>
    post.content.toLowerCase().includes(search.toLowerCase()) ||
    post.author_name?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: 'author',
      header: 'Autor',
      render: (item: ReportedPost) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">
              {item.author_name}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.channel_name}
            </p>
          </div>
        </div>
      )
    },
    {
      key: 'content',
      header: 'Conteúdo',
      render: (item: ReportedPost) => (
        <p className="text-foreground line-clamp-2 max-w-md">
          {item.content}
        </p>
      )
    },
    {
      key: 'created_at',
      header: 'Data',
      render: (item: ReportedPost) => (
        <span className="text-muted-foreground text-sm">
          {new Date(item.created_at).toLocaleDateString('pt-BR')}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (item: ReportedPost) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
            onClick={() => handleApprove(item)}
            title="Aprovar"
          >
            <Check className="w-4 h-4" weight="bold" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
            onClick={() => handleRemove(item)}
            title="Ocultar"
          >
            <Warning className="w-4 h-4" weight="bold" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => handleDelete(item)}
            title="Excluir"
          >
            <Trash className="w-4 h-4" weight="bold" />
          </Button>
        </div>
      ),
      className: 'w-32'
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
          <h1 className="text-2xl font-bold text-foreground">Moderação</h1>
          <p className="text-muted-foreground">
            Revise e modere posts reportados pela comunidade
          </p>
        </div>

        {posts.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhum post pendente
            </h3>
            <p className="text-muted-foreground max-w-sm">
              Não há posts reportados aguardando moderação. A comunidade está em ordem!
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar posts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <DataTable
              columns={columns}
              data={filteredPosts}
              loading={loading}
              emptyMessage="Nenhum post reportado"
            />
          </>
        )}
      </motion.div>
    </AdminLayout>
  );
}
