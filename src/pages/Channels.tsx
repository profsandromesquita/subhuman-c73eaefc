import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Logo } from "@/components/Logo";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChatCircle, Users, ArrowRight, Lock, Crown, Question, Rocket, Wrench, Handshake } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { useChannels } from "@/hooks/useChannels";
import { formatTime } from "@/lib/formatTime";

const iconMap: Record<string, React.ComponentType<any>> = {
  ChatCircle, Question, Users, Rocket, Wrench, Handshake,
};

const MAX_STAGGER_ITEMS = 4;
const STAGGER_DELAY = 0.04;

export default function Channels() {
  const { data: channels = [], isLoading } = useChannels();

  return (
    <AppLayout>
      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="font-semibold">Canais</h1>
          <Logo size="sm" />
        </div>
      </div>

      <div className="px-4 pt-5 pb-28 lg:px-10 lg:pt-8 lg:pb-10">
        {/* Desktop title */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="hidden lg:block mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Canais</h1>
          <p className="text-muted-foreground mt-1">Participe das discussões da comunidade</p>
        </motion.div>

        {/* Mobile subtitle */}
        <p className="text-sm text-muted-foreground mb-5 lg:hidden">Participe das discussões da comunidade</p>

        {isLoading ? (
          <div className="space-y-3 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[110px] w-full rounded-2xl" />)}
          </div>
        ) : (
          <div className="space-y-3 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0">
            {channels.map((channel, index) => {
              const Icon = iconMap[channel.icon || "ChatCircle"] || ChatCircle;
              const isPremium = channel.access_type === "premium";
              const isSubscribers = channel.access_type === "subscribers";

              return (
                <motion.div
                  key={channel.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index, MAX_STAGGER_ITEMS) * STAGGER_DELAY }}
                >
                  <Link to={`/channels/${channel.id}`} className="block group">
                    <div className={`rounded-2xl border bg-card p-4 transition-all duration-200 hover:border-border lg:p-5 ${!channel.has_access ? "opacity-70" : "border-border/60 hover:bg-card/80"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-2">
                            <div className="p-2 rounded-xl bg-secondary shrink-0">
                              <Icon className="w-4 h-4" weight="bold" />
                            </div>
                            <h3 className="font-semibold truncate">{channel.name}</h3>
                            {isPremium && (
                              <Badge variant="secondary" className="gap-1 text-yellow-600 bg-yellow-500/10 shrink-0 text-[11px]">
                                <Crown className="w-3 h-3" weight="fill" />Premium
                              </Badge>
                            )}
                            {isSubscribers && !isPremium && (
                              <Badge variant="secondary" className="gap-1 shrink-0 text-[11px]">
                                <Lock className="w-3 h-3" />Assinantes
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2 leading-relaxed">{channel.description}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />{channel.members_count}
                            </span>
                            <span>{channel.posts_count} posts</span>
                            {channel.last_activity && <span>· {formatTime(channel.last_activity)}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 shrink-0">
                          {!channel.has_access && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                          <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                        </div>
                      </div>
                    </div>
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
