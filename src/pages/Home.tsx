import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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

export default function Home() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [subscribedSpaces, setSubscribedSpaces] = useState<SubscribedSpace[]>([]);
  const [loadingHighlights, setLoadingHighlights] = useState(true);
  const [loadingSpaces, setLoadingSpaces] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [user, authLoading]);

  const fetchData = async () => {
    if (!user) {
      setHighlights([]);
      setSubscribedSpaces([]);
      setLoadingHighlights(false);
      setLoadingSpaces(false);
      return;
    }

    // Fetch in parallel
    await Promise.all([
      fetchHighlights(),
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
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Agora";
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    return `${Math.floor(diffInDays / 7)}sem`;
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
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1"
        >
          <h1 className="text-2xl font-bold">
            Olá{user ? ", bem-vindo!" : "!"}
          </h1>
          <p className="text-muted-foreground">
            {user 
              ? "Veja o que há de novo nos seus espaços"
              : "Faça login para personalizar sua experiência"
            }
          </p>
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

        {/* Subscribed Spaces */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Seus espaços</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary"
              asChild
            >
              <Link to="/spaces">
                Ver todos
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {!user ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground mb-3">
                Faça login para ver seus espaços inscritos
              </p>
              <Button size="sm" onClick={() => navigate("/login")}>
                Fazer login
              </Button>
            </Card>
          ) : loadingSpaces ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : subscribedSpaces.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground mb-3">
                Você ainda não está inscrito em nenhum espaço
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
            <div className="grid grid-cols-2 gap-3">
              {subscribedSpaces.slice(0, 4).map((space, index) => {
                const IconComponent = getIconComponent(space.icon);
                return (
                  <motion.div
                    key={space.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                  >
                    <Card
                      className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => navigate(`/spaces/${space.slug}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <IconComponent className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-sm truncate">{space.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {space.updates_count} {space.updates_count === 1 ? 'atualização' : 'atualizações'}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>
      </div>
    </AppLayout>
  );
}
