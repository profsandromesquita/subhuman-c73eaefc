import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useAuth } from "@/hooks/useAuth";
import { useChannelAccess } from "@/hooks/useChannelAccess";
import { useChannel } from "@/hooks/useChannels";
import { useChannelPosts, useLikeChannelPost } from "@/hooks/usePosts";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useMemo } from "react";

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
  
  const { data: channel, isLoading: channelLoading } = useChannel(channelId);
  const { data: posts = [], isLoading: postsLoading } = useChannelPosts(channelId);
  const likeMutation = useLikeChannelPost();

  const loading = channelLoading || postsLoading;

  // Calculate members count from posts
  const membersCount = useMemo(() => {
    const uniqueAuthors = new Set(posts.map(p => p.author_id).filter(Boolean));
    return uniqueAuthors.size;
  }, [posts]);

  const handleNavigateToCreatePost = () => {
    navigate(`/channels/${channelId}/new-post`);
  };

  const handleLikePost = async (postId: string, isLiked: boolean) => {
    if (!user) {
      toast.error("Você precisa estar logado para curtir");
      return;
    }

    likeMutation.mutate({ postId, isLiked });
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
              <Button onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/plans', { replace: true });
              }}>
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
            <Button size="sm" className="gap-1.5" onClick={handleNavigateToCreatePost}>
              <Plus className="w-4 h-4" weight="bold" />
              Publicar
            </Button>
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
                        <div className="flex gap-4">
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {/* Title */}
                            <h3 className="font-semibold line-clamp-2 mb-2">
                              {post.title || "Sem título"}
                            </h3>
                            
                            {/* Author & Time */}
                            <div className="flex items-center gap-2 mb-3">
                              <Avatar className="w-5 h-5">
                                <AvatarImage src={post.author_avatar || undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {post.author_name?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">
                                {post.author_name}
                              </span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(post.created_at)}
                              </span>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-4 text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Heart className="w-4 h-4" weight={post.is_liked ? "fill" : "regular"} />
                                <span className="text-xs">{post.likes_count}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <ChatCircle className="w-4 h-4" />
                                <span className="text-xs">{post.comments_count}</span>
                              </div>
                            </div>
                          </div>

                          {/* Thumbnail */}
                          {post.thumbnail_url && (
                            <div className="flex-shrink-0">
                              <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary">
                                <img 
                                  src={post.thumbnail_url} 
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                          )}
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
