import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ArrowRight, 
  Heart, 
  ChatCircle
} from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getIconComponent } from "@/components/admin/IconPicker";

interface Highlight {
  id: string;
  title: string;
  content: string | null;
  thumbnail_url: string | null;
  media_type: string | null;
  published_at: string | null;
  space_id: string;
  space_name: string;
  space_slug: string;
  likes_count: number;
  comments_count: number;
}

interface SubscribedSpace {
  id: string;
  name: string;
  slug: string;
  icon: string;
  updates_count: number;
}

interface ChannelDiscussion {
  id: string;
  title: string;
  content: string;
  created_at: string;
  channel_id: string;
  channel_name: string;
  channel_slug: string;
  author_name: string;
  likes_count: number;
  comments_count: number;
  thumbnail_url: string | null;
}

export default function Home() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [discussions, setDiscussions] = useState<ChannelDiscussion[]>([]);
  const [subscribedSpaces, setSubscribedSpaces] = useState<SubscribedSpace[]>([]);
  const [loadingHighlights, setLoadingHighlights] = useState(true);
  const [loadingDiscussions, setLoadingDiscussions] = useState(true);
  const [loadingSpaces, setLoadingSpaces] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [user, authLoading]);

  const fetchData = async () => {
    if (!user) {
      setHighlights([]);
      setDiscussions([]);
      setSubscribedSpaces([]);
      setLoadingHighlights(false);
      setLoadingDiscussions(false);
      setLoadingSpaces(false);
      return;
    }

    // Fetch in parallel
    await Promise.all([
      fetchHighlights(),
      fetchDiscussions(),
      fetchSubscribedSpaces()
    ]);
  };

  const fetchHighlights = async () => {
    if (!user) return;

    setLoadingHighlights(true);
    try {
      // Fetch user's subscribed spaces
      const { data: subscriptions, error: subError } = await supabase
        .from('user_space_subscriptions')
        .select('space_id')
        .eq('user_id', user.id);

      if (subError) throw subError;

      if (!subscriptions || subscriptions.length === 0) {
        setHighlights([]);
        setLoadingHighlights(false);
        return;
      }

      const spaceIds = subscriptions.map(s => s.space_id);

      // Fetch recent updates from subscribed spaces (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: updates, error: updatesError } = await supabase
        .from('space_updates')
        .select(`
          id, title, content, thumbnail_url, media_type, 
          published_at, space_id,
          spaces!inner(name, slug)
        `)
        .in('space_id', spaceIds)
        .eq('is_published', true)
        .gte('published_at', thirtyDaysAgo.toISOString())
        .order('published_at', { ascending: false })
        .limit(50);

      if (updatesError) throw updatesError;

      if (!updates || updates.length === 0) {
        setHighlights([]);
        setLoadingHighlights(false);
        return;
      }

      // Fetch likes and comments counts
      const updateIds = updates.map(u => u.id);
      
      const [likesResult, commentsResult] = await Promise.all([
        supabase
          .from('update_likes')
          .select('update_id')
          .in('update_id', updateIds),
        supabase
          .from('update_comments')
          .select('update_id')
          .in('update_id', updateIds)
      ]);

      const likesMap: Record<string, number> = {};
      const commentsMap: Record<string, number> = {};

      likesResult.data?.forEach(like => {
        likesMap[like.update_id] = (likesMap[like.update_id] || 0) + 1;
      });

      commentsResult.data?.forEach(comment => {
        commentsMap[comment.update_id] = (commentsMap[comment.update_id] || 0) + 1;
      });

      const highlightsData: Highlight[] = updates.map(update => ({
        id: update.id,
        title: update.title,
        content: update.content,
        thumbnail_url: update.thumbnail_url,
        media_type: update.media_type,
        published_at: update.published_at,
        space_id: update.space_id,
        space_name: (update.spaces as any)?.name || '',
        space_slug: (update.spaces as any)?.slug || '',
        likes_count: likesMap[update.id] || 0,
        comments_count: commentsMap[update.id] || 0,
      }));

      // Sort by engagement (likes + comments) and take top 5
      const sortedHighlights = highlightsData
        .sort((a, b) => {
          const engagementA = a.likes_count + a.comments_count;
          const engagementB = b.likes_count + b.comments_count;
          // If same engagement, prefer more recent
          if (engagementB === engagementA) {
            return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime();
          }
          return engagementB - engagementA;
        })
        .slice(0, 5);

      setHighlights(sortedHighlights);
    } catch (error) {
      console.error('Error fetching highlights:', error);
    } finally {
      setLoadingHighlights(false);
    }
  };

  const fetchDiscussions = async () => {
    if (!user) return;

    setLoadingDiscussions(true);
    try {
      // Get posts from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Fetch channel posts
      const { data: posts, error: postsError } = await supabase
        .from('channel_posts')
        .select(`
          id, title, content, created_at, channel_id, author_id,
          channels!inner(name, slug),
          profiles:author_id(full_name)
        `)
        .eq('is_moderated', false)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (postsError) throw postsError;

      if (!posts || posts.length === 0) {
        setDiscussions([]);
        setLoadingDiscussions(false);
        return;
      }

      // Fetch likes, comments counts, and media for each post
      const postIds = posts.map(p => p.id);
      
      const [likesResult, commentsResult, mediaResult] = await Promise.all([
        supabase
          .from('channel_post_likes')
          .select('post_id')
          .in('post_id', postIds),
        supabase
          .from('channel_post_comments')
          .select('post_id')
          .in('post_id', postIds),
        supabase
          .from('channel_post_media')
          .select('post_id, file_url, file_type')
          .in('post_id', postIds)
          .in('file_type', ['image', 'video'])
          .order('sort_order', { ascending: true })
      ]);

      const likesMap: Record<string, number> = {};
      const commentsMap: Record<string, number> = {};
      const mediaMap: Record<string, string> = {};

      likesResult.data?.forEach(like => {
        likesMap[like.post_id] = (likesMap[like.post_id] || 0) + 1;
      });

      commentsResult.data?.forEach(comment => {
        commentsMap[comment.post_id] = (commentsMap[comment.post_id] || 0) + 1;
      });

      // Get first media for each post
      mediaResult.data?.forEach(media => {
        if (!mediaMap[media.post_id]) {
          mediaMap[media.post_id] = media.file_url;
        }
      });

      const discussionsData: ChannelDiscussion[] = posts.map(post => ({
        id: post.id,
        title: post.title || post.content.substring(0, 100),
        content: post.content,
        created_at: post.created_at,
        channel_id: post.channel_id,
        channel_name: (post.channels as any)?.name || '',
        channel_slug: (post.channels as any)?.slug || '',
        author_name: (post.profiles as any)?.full_name || 'Usuário',
        likes_count: likesMap[post.id] || 0,
        comments_count: commentsMap[post.id] || 0,
        thumbnail_url: mediaMap[post.id] || null,
      }));

      // Sort by engagement and take top 5
      const sortedDiscussions = discussionsData
        .sort((a, b) => {
          const engagementA = a.likes_count + a.comments_count;
          const engagementB = b.likes_count + b.comments_count;
          if (engagementB === engagementA) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return engagementB - engagementA;
        })
        .slice(0, 5);

      setDiscussions(sortedDiscussions);
    } catch (error) {
      console.error('Error fetching discussions:', error);
    } finally {
      setLoadingDiscussions(false);
    }
  };

  const fetchSubscribedSpaces = async () => {
    if (!user) return;

    setLoadingSpaces(true);
    try {
      // Fetch user's subscribed spaces with space details
      const { data: subscriptions, error: subError } = await supabase
        .from('user_space_subscriptions')
        .select(`
          space_id,
          spaces!inner(id, name, slug, icon)
        `)
        .eq('user_id', user.id);

      if (subError) throw subError;

      if (!subscriptions || subscriptions.length === 0) {
        setSubscribedSpaces([]);
        setLoadingSpaces(false);
        return;
      }

      // For each space, get the count of updates
      const spacesWithCounts = await Promise.all(
        subscriptions.map(async (sub) => {
          const space = sub.spaces as any;
          
          const { count } = await supabase
            .from('space_updates')
            .select('id', { count: 'exact', head: true })
            .eq('space_id', space.id)
            .eq('is_published', true);

          return {
            id: space.id,
            name: space.name,
            slug: space.slug,
            icon: space.icon || 'Folder',
            updates_count: count || 0,
          };
        })
      );

      setSubscribedSpaces(spacesWithCounts);
    } catch (error) {
      console.error('Error fetching subscribed spaces:', error);
    } finally {
      setLoadingSpaces(false);
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "";
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

  const estimateReadTime = (content: string | null) => {
    if (!content) return "1min";
    const words = content.split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return `${minutes}min`;
  };

  const handleHighlightClick = (highlight: Highlight) => {
    navigate(`/spaces/${highlight.space_slug}/post/${highlight.id}`);
  };

  return (
    <AppLayout>
      <div className="p-4 space-y-6 pb-24">
        {/* Header with Logo */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center"
        >
          <h1 className="text-lg font-bold tracking-tight">
            sub<span className="text-muted-foreground">humano</span>
          </h1>
        </motion.div>

        {/* Daily Highlights */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Destaques da semana</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary"
              onClick={() => navigate("/highlights")}
            >
              Ver tudo
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          {!user ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground mb-3">
                Faça login para ver os destaques dos seus espaços
              </p>
              <Button size="sm" onClick={() => navigate("/login")}>
                Fazer login
              </Button>
            </Card>
          ) : loadingHighlights ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : highlights.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground mb-3">
                {subscribedSpaces.length === 0 
                  ? "Inscreva-se em espaços para ver os destaques"
                  : "Nenhum destaque para hoje nos seus espaços"
                }
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => navigate("/spaces")}
              >
                Explorar espaços
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {highlights.map((highlight, index) => (
                <motion.div
                  key={highlight.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <Card
                    className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleHighlightClick(highlight)}
                  >
                    <div className="flex gap-3">
                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <Badge variant="secondary" className="mb-2 text-xs">
                            {highlight.space_name}
                          </Badge>
                          <h3 className="font-medium text-sm leading-snug line-clamp-3">
                            {highlight.title}
                          </h3>
                        </div>
                        
                        {/* Meta info */}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Heart className="h-3.5 w-3.5" />
                            <span>{highlight.likes_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ChatCircle className="h-3.5 w-3.5" />
                            <span>{highlight.comments_count}</span>
                          </div>
                          <span>·</span>
                          <span>{formatTime(highlight.published_at)}</span>
                        </div>
                      </div>

                      {/* Thumbnail */}
                      {highlight.thumbnail_url && (
                        <div className="shrink-0">
                          <img
                            src={highlight.thumbnail_url}
                            alt=""
                            className="w-20 h-20 object-cover rounded-lg bg-muted"
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        {/* Weekly Discussions */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Discussões da semana</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary"
              onClick={() => navigate("/channels")}
            >
              Ver tudo
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          {!user ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground mb-3">
                Faça login para ver as discussões dos canais
              </p>
              <Button size="sm" onClick={() => navigate("/login")}>
                Fazer login
              </Button>
            </Card>
          ) : loadingDiscussions ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : discussions.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground mb-3">
                Nenhuma discussão encontrada esta semana
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => navigate("/channels")}
              >
                Explorar canais
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {discussions.map((discussion, index) => (
                <motion.div
                  key={discussion.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.05 }}
                >
                  <Card
                    className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => navigate(`/channels/${discussion.channel_slug}/post/${discussion.id}`)}
                  >
                    <div className="flex gap-3">
                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <Badge variant="secondary" className="mb-2 text-xs">
                            {discussion.channel_name}
                          </Badge>
                          <h3 className="font-medium text-sm leading-snug line-clamp-3">
                            {discussion.title}
                          </h3>
                        </div>
                        
                        {/* Meta info */}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="truncate max-w-[100px]">{discussion.author_name}</span>
                          <div className="flex items-center gap-1">
                            <Heart className="h-3.5 w-3.5" />
                            <span>{discussion.likes_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ChatCircle className="h-3.5 w-3.5" />
                            <span>{discussion.comments_count}</span>
                          </div>
                          <span>·</span>
                          <span>{formatTime(discussion.created_at)}</span>
                        </div>
                      </div>

                      {/* Thumbnail */}
                      {discussion.thumbnail_url && (
                        <div className="shrink-0">
                          <img
                            src={discussion.thumbnail_url}
                            alt=""
                            className="w-20 h-20 object-cover rounded-lg bg-muted"
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>
      </div>
    </AppLayout>
  );
}
