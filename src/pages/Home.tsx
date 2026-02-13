import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { formatTime } from "@/lib/formatTime";
import { 
  ArrowRight, 
  Heart, 
  ChatCircle,
  Bell,
  BookmarkSimple
} from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/AppLayout";
import { PushPermissionBanner } from "@/components/PushPermissionBanner";
import { OnboardingModal } from "@/components/OnboardingModal";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useSubscribedSpaces } from "@/hooks/useSpaces";
import { useHighlights, useRecentDiscussions } from "@/hooks/usePosts";
import { getIconComponent } from "@/components/admin/IconPicker";
import { useUnreadNotificationsCount } from "@/hooks/useNotifications";

// Max animation delay (prevents long waits for lists)
const MAX_STAGGER_ITEMS = 4;
const STAGGER_DELAY = 0.03;

export default function Home() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const { data: highlights = [], isLoading: loadingHighlights } = useHighlights();
  const { data: discussions = [], isLoading: loadingDiscussions } = useRecentDiscussions();
  const { data: subscribedSpaces = [], isLoading: loadingSpaces } = useSubscribedSpaces();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  
  // Popup só aparece quando dados carregaram E o usuário não tem nenhum espaço selecionado
  const showOnboarding = !!(user && !authLoading && !loadingSpaces && subscribedSpaces.length === 0);

  const handleNavigateToSpaces = () => {
    navigate('/spaces');
  };

  const handleDismissOnboarding = () => {
    // No-op: popup desaparece automaticamente quando o usuário selecionar espaços
  };


  const handleHighlightClick = (highlight: { space_slug?: string; slug?: string; id: string }) => {
    navigate(`/spaces/${highlight.space_slug}/post/${highlight.slug || highlight.id}`);
  };

  return (
    <AppLayout>
      <OnboardingModal 
        isOpen={showOnboarding}
        onNavigateToSpaces={handleNavigateToSpaces}
        onDismiss={handleDismissOnboarding}
      />
      
      {!showOnboarding && <PushPermissionBanner />}
      
      <div className="max-w-lg mx-auto px-4 pt-8 pb-24 space-y-6">
        {/* Header with Logo */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-1">
            <button 
              onClick={() => navigate("/profile/saved")}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="Conteúdos salvos"
            >
              <BookmarkSimple className="w-5 h-5" />
            </button>
            <button 
              onClick={() => navigate("/notifications")}
              className="relative p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="Notificações"
            >
              <Bell className="w-5 h-5" weight={unreadCount > 0 ? "fill" : "regular"} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-foreground text-background rounded-full px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </div>
          <Logo size="sm" />
        </motion.div>

        {/* Daily Highlights */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
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
          ) : loadingHighlights || authLoading ? (
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
                  transition={{ delay: Math.min(index, MAX_STAGGER_ITEMS) * STAGGER_DELAY }}
                >
                  <Card
                    className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleHighlightClick(highlight)}
                  >
                    <div className="flex gap-3">
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <Badge variant="secondary" className="mb-2 text-xs">
                            {highlight.space_name}
                          </Badge>
                          <h3 className="font-medium text-sm leading-snug line-clamp-3">
                            {highlight.title}
                          </h3>
                        </div>
                        
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Heart className={`h-3.5 w-3.5 ${highlight.is_liked ? 'text-red-500' : ''}`} weight={highlight.is_liked ? "fill" : "regular"} />
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

                      {highlight.thumbnail_url && (
                        <div className="shrink-0">
                          <img
                            src={highlight.thumbnail_url}
                            alt=""
                            loading="lazy"
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

        {/* Hot Discussions */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Em alta nos canais</h2>
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
                Faça login para ver as discussões
              </p>
              <Button size="sm" onClick={() => navigate("/login")}>
                Fazer login
              </Button>
            </Card>
          ) : loadingDiscussions || authLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : discussions.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">
                Nenhuma discussão em alta no momento
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {discussions.map((discussion, index) => (
                <motion.div
                  key={discussion.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index, MAX_STAGGER_ITEMS) * STAGGER_DELAY }}
                >
                  <Card
                    className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => navigate(`/channels/${discussion.channel_id}/post/${discussion.id}`)}
                  >
                    <div className="flex gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {discussion.channel_name}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            por {discussion.author_name}
                          </span>
                        </div>
                        <h3 className="font-medium text-sm leading-snug line-clamp-2">
                          {discussion.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Heart className={`h-3.5 w-3.5 ${discussion.is_liked ? 'text-red-500' : ''}`} weight={discussion.is_liked ? "fill" : "regular"} />
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
                      {discussion.thumbnail_url && (
                        <div className="shrink-0">
                          <img
                            src={discussion.thumbnail_url}
                            alt=""
                            loading="lazy"
                            className="w-16 h-16 object-cover rounded-lg bg-muted"
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
          transition={{ delay: 0.15 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Seus espaços</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary"
              onClick={() => navigate("/spaces")}
            >
              Ver todos
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          {!user ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground mb-3">
                Faça login para gerenciar seus espaços
              </p>
              <Button size="sm" onClick={() => navigate("/login")}>
                Fazer login
              </Button>
            </Card>
          ) : loadingSpaces || authLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : subscribedSpaces.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground mb-3">
                Você ainda não segue nenhum espaço
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
              {subscribedSpaces.map((space, index) => {
                const SpaceIcon = getIconComponent(space.icon);
                return (
                  <motion.div
                    key={space.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(index, MAX_STAGGER_ITEMS) * STAGGER_DELAY }}
                  >
                    <Card 
                      className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => navigate(`/spaces/${space.slug}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-secondary">
                          <SpaceIcon className="w-5 h-5" weight="bold" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">
                            {space.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {space.updates_count} atualizações
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
