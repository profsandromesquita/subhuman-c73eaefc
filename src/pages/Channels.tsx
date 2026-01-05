import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  ChatCircle, 
  Users, 
  ArrowRight, 
  Lock, 
  Crown,
  Question,
  Rocket,
  Wrench,
  Handshake
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  access_type: 'open' | 'subscribers' | 'premium';
  icon: string | null;
  members_count: number;
  posts_count: number;
  last_activity: string | null;
  has_access: boolean;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  ChatCircle: ChatCircle,
  Question: Question,
  Users: Users,
  Rocket: Rocket,
  Wrench: Wrench,
  Handshake: Handshake,
};

export default function Channels() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState<string | null>(null);

  useEffect(() => {
    fetchChannels();
    if (user) {
      fetchUserPlan();
    }
  }, [user]);

  const fetchUserPlan = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('subscriptions')
      .select('plan_type')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setUserPlan(data?.plan_type || null);
  };

  const fetchChannels = async () => {
    setLoading(true);

    const { data: channelsData, error } = await supabase
      .from('channels')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching channels:', error);
      setLoading(false);
      return;
    }

    // Enrich channels with stats
    const enrichedChannels = await Promise.all(
      (channelsData || []).map(async (channel) => {
        // Get posts count
        const { count: postsCount } = await supabase
          .from('channel_posts')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', channel.id)
          .eq('is_moderated', false);

        // Get unique authors (members)
        const { data: authors } = await supabase
          .from('channel_posts')
          .select('author_id')
          .eq('channel_id', channel.id);
        
        const uniqueMembers = new Set((authors || []).map(a => a.author_id).filter(Boolean));

        // Get last activity
        const { data: lastPost } = await supabase
          .from('channel_posts')
          .select('created_at')
          .eq('channel_id', channel.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const accessType = (channel as any).access_type || 'open';
        
        // Check access based on user plan
        let hasAccess = accessType === 'open';
        if (user && userPlan) {
          if (accessType === 'subscribers') {
            hasAccess = true;
          } else if (accessType === 'premium') {
            hasAccess = userPlan === 'yearly';
          }
        }

        return {
          id: channel.id,
          name: channel.name,
          description: channel.description,
          access_type: accessType,
          icon: (channel as any).icon || 'ChatCircle',
          members_count: uniqueMembers.size,
          posts_count: postsCount || 0,
          last_activity: lastPost?.created_at || null,
          has_access: hasAccess,
        };
      })
    );

    setChannels(enrichedChannels);
    setLoading(false);
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return null;
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

  const getAccessBadge = (channel: Channel) => {
    if (channel.access_type === 'premium') {
      return (
        <Badge variant="secondary" className="gap-1 text-yellow-600 bg-yellow-500/10">
          <Crown className="w-3 h-3" weight="fill" />
          Premium
        </Badge>
      );
    }
    if (channel.access_type === 'subscribers') {
      return (
        <Badge variant="secondary" className="gap-1">
          <Lock className="w-3 h-3" />
          Assinantes
        </Badge>
      );
    }
    return null;
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold mb-1">Canais</h1>
          <p className="text-muted-foreground text-sm">
            Participe das discussões da comunidade
          </p>
        </motion.div>

        {/* Channels List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {channels.map((channel, index) => {
              const IconComponent = iconMap[channel.icon || 'ChatCircle'] || ChatCircle;
              
              return (
                <motion.div
                  key={channel.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={`/channels/${channel.id}`}>
                    <Card className={`hover:border-muted-foreground/30 transition-all duration-200 ${!channel.has_access ? 'opacity-75' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-2 rounded-lg bg-secondary">
                                <IconComponent className="w-4 h-4" weight="bold" />
                              </div>
                              <h3 className="font-semibold">{channel.name}</h3>
                              {getAccessBadge(channel)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {channel.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {channel.members_count}
                              </span>
                              <span>{channel.posts_count} posts</span>
                              {channel.last_activity && (
                                <span>Ativo {formatTime(channel.last_activity)}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            {!channel.has_access && (
                              <Lock className="w-4 h-4 text-muted-foreground" />
                            )}
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
