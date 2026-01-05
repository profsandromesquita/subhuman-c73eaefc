import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  Heart, 
  ChatCircle, 
  Plus, 
  Users,
  Lock,
  Crown,
  ChatCircle as ChatIcon,
  Question,
  Rocket,
  Wrench,
  Handshake
} from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useChannelAccess } from "@/hooks/useChannelAccess";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  access_type: 'open' | 'subscribers' | 'premium';
  icon: string | null;
}

interface Post {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  author_id: string | null;
  author_name: string | null;
  author_avatar: string | null;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  ChatCircle: ChatIcon,
  Question: Question,
  Users: Users,
  Rocket: Rocket,
  Wrench: Wrench,
  Handshake: Handshake,
};

export default function ChannelDetail() {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAccess, loading: accessLoading, accessType } = useChannelAccess(channelId);
  
  const [channel, setChannel] = useState<Channel | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersCount, setMembersCount] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (channelId) {
      fetchChannel();
      fetchPosts();
      fetchMembersCount();
    }
  }, [channelId, user]);

  const fetchChannel = async () => {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .eq('id', channelId)
      .single();

    if (!error && data) {
      setChannel({
        id: data.id,
        name: data.name,
        description: data.description,
        access_type: (data as any).access_type || 'open',
        icon: (data as any).icon || 'ChatCircle',
      });
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    
    const { data: postsData, error } = await supabase
      .from('channel_posts')
      .select('*')
      .eq('channel_id', channelId)
      .eq('is_moderated', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
      setLoading(false);
      return;
    }

    // Fetch additional data for each post
    const enrichedPosts = await Promise.all(
      (postsData || []).map(async (post) => {
        // Get author profile
        let authorName = 'Usuário';
        let authorAvatar = null;
        if (post.author_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', post.author_id)
            .single();
          if (profile) {
            authorName = profile.full_name || 'Usuário';
            authorAvatar = profile.avatar_url;
          }
        }

        // Get likes count
        const { count: likesCount } = await supabase
          .from('channel_post_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        // Get comments count
        const { count: commentsCount } = await supabase
          .from('channel_post_comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        // Check if user liked
        let isLiked = false;
        if (user) {
          const { data: likeData } = await supabase
            .from('channel_post_likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .maybeSingle();
          isLiked = !!likeData;
        }

        return {
          id: post.id,
          title: (post as any).title || null,
          content: post.content,
          created_at: post.created_at,
          author_id: post.author_id,
          author_name: authorName,
          author_avatar: authorAvatar,
          likes_count: likesCount || 0,
          comments_count: commentsCount || 0,
          is_liked: isLiked,
        };
      })
    );

    setPosts(enrichedPosts);
    setLoading(false);
  };

  const fetchMembersCount = async () => {
    // Count unique authors in the channel
    const { data } = await supabase
      .from('channel_posts')
      .select('author_id')
      .eq('channel_id', channelId);
    
    if (data) {
      const uniqueAuthors = new Set(data.map(p => p.author_id).filter(Boolean));
      setMembersCount(uniqueAuthors.size);
    }
  };

  const handleCreatePost = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para publicar");
      return;
    }

    if (!newPostContent.trim()) {
      toast.error("Escreva algo para publicar");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from('channel_posts')
      .insert({
        channel_id: channelId,
        author_id: user.id,
        title: newPostTitle.trim() || null,
        content: newPostContent.trim(),
      } as any);

    if (error) {
      console.error('Error creating post:', error);
      toast.error("Erro ao criar publicação");
    } else {
      toast.success("Publicação criada!");
      setNewPostTitle("");
      setNewPostContent("");
      setIsDialogOpen(false);
      fetchPosts();
    }

    setSubmitting(false);
  };

  const handleLikePost = async (postId: string, isLiked: boolean) => {
    if (!user) {
      toast.error("Você precisa estar logado para curtir");
      return;
    }

    if (isLiked) {
      await supabase
        .from('channel_post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('channel_post_likes')
        .insert({ post_id: postId, user_id: user.id });
    }

    // Update local state
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          is_liked: !isLiked,
          likes_count: isLiked ? post.likes_count - 1 : post.likes_count + 1,
        };
      }
      return post;
    }));
  };

  const formatTime = (dateString: string) => {
    const distance = formatDistanceToNow(new Date(dateString), { locale: ptBR });
    return distance
      .replace("cerca de ", "")
      .replace(" horas", "h")
      .replace(" hora", "h")
      .replace(" minutos", "min")
      .replace(" minuto", "min")
      .replace(" dias", "d")
      .replace(" dia", "d")
      .replace(" semanas", "sem")
      .replace(" semana", "sem")
      .replace(" meses", "m")
      .replace(" mês", "m");
  };

  const getAccessIcon = () => {
    switch (accessType) {
      case 'subscribers':
        return <Lock className="w-3 h-3" />;
      case 'premium':
        return <Crown className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const IconComponent = channel?.icon ? iconMap[channel.icon] || ChatIcon : ChatIcon;

  if (loading && !channel) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 pt-4">
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-24 w-full mb-4" />
          <Skeleton className="h-32 w-full mb-3" />
          <Skeleton className="h-32 w-full mb-3" />
        </div>
      </AppLayout>
    );
  }

  if (!hasAccess && !accessLoading) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 pt-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/channels')}
            className="mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                {accessType === 'premium' ? (
                  <Crown className="w-8 h-8 text-yellow-500" />
                ) : (
                  <Lock className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <h2 className="text-xl font-bold">Canal Exclusivo</h2>
              <p className="text-muted-foreground">
                {accessType === 'premium' 
                  ? "Este canal é exclusivo para assinantes do plano anual."
                  : "Este canal é exclusivo para assinantes."}
              </p>
              <Button onClick={() => navigate('/plans')}>
                Ver Planos
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/channels')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-secondary">
                <IconComponent className="w-5 h-5" weight="bold" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{channel?.name}</h1>
                  {getAccessIcon()}
                </div>
                <p className="text-sm text-muted-foreground">
                  {channel?.description}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats & New Post */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{membersCount} participantes</span>
            <span>·</span>
            <span>{posts.length} posts</span>
          </div>
          
          {user && hasAccess && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="w-4 h-4" weight="bold" />
                  Publicar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Publicação</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    placeholder="Título (opcional)"
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                  />
                  <Textarea
                    placeholder="Escreva sua publicação..."
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    rows={5}
                  />
                  <Button 
                    className="w-full" 
                    onClick={handleCreatePost}
                    disabled={submitting || !newPostContent.trim()}
                  >
                    {submitting ? "Publicando..." : "Publicar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Posts List */}
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground">
                  Nenhuma publicação ainda. Seja o primeiro a publicar!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={`/channels/${channelId}/post/${post.id}`}>
                    <Card className="hover:border-muted-foreground/30 transition-all duration-200">
                      <CardContent className="p-4">
                        {/* Author */}
                        <div className="flex items-center gap-2 mb-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={post.author_avatar || undefined} />
                            <AvatarFallback>
                              {post.author_name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{post.author_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatTime(post.created_at)}
                            </p>
                          </div>
                        </div>

                        {/* Content */}
                        {post.title && (
                          <h3 className="font-semibold mb-1 line-clamp-2">{post.title}</h3>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                          {post.content}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`gap-1 h-7 px-2 ${post.is_liked ? 'text-red-500' : 'text-muted-foreground'}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleLikePost(post.id, post.is_liked);
                            }}
                          >
                            <Heart 
                              className="w-4 h-4" 
                              weight={post.is_liked ? "fill" : "regular"} 
                            />
                            <span className="text-xs">{post.likes_count}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 h-7 px-2 text-muted-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ChatCircle className="w-4 h-4" />
                            <span className="text-xs">{post.comments_count}</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
