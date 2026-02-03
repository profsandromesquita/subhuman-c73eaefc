import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Logo } from "@/components/Logo";
import { Card, CardContent } from "@/components/ui/card";
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
import { useChannels } from "@/hooks/useChannels";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const iconMap: Record<string, React.ComponentType<any>> = {
  ChatCircle: ChatCircle,
  Question: Question,
  Users: Users,
  Rocket: Rocket,
  Wrench: Wrench,
  Handshake: Handshake,
};

// Max animation delay (prevents long waits for lists)
const MAX_STAGGER_ITEMS = 4;
const STAGGER_DELAY = 0.03;

export default function Channels() {
  const { data: channels = [], isLoading: loading } = useChannels();

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

  const getAccessBadge = (channel: { access_type: string }) => {
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
        <Logo size="sm" className="mb-4" />
        
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
                  transition={{ delay: Math.min(index, MAX_STAGGER_ITEMS) * STAGGER_DELAY }}
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
