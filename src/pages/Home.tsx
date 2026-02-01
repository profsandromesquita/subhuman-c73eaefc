import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { PushPermissionBanner } from "@/components/PushPermissionBanner";
import { OnboardingModal } from "@/components/OnboardingModal";
import { useAuth } from "@/hooks/useAuth";
import { useSubscribedSpaces } from "@/hooks/useSpaces";
import { useHighlights, useRecentDiscussions } from "@/hooks/usePosts";
import { getIconComponent } from "@/components/admin/IconPicker";

export default function Home() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const { data: highlights = [], isLoading: loadingHighlights } = useHighlights();
  const { data: discussions = [], isLoading: loadingDiscussions } = useRecentDiscussions();
  const { data: subscribedSpaces = [], isLoading: loadingSpaces } = useSubscribedSpaces();
  
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Verifica se deve mostrar o modal de onboarding
  useEffect(() => {
    const hasSeenOnboarding = sessionStorage.getItem('onboarding-dismissed');
    
    if (
      user && 
      !authLoading &&
      !loadingSpaces && 
      subscribedSpaces.length === 0 && 
      !hasSeenOnboarding
    ) {
      // Pequeno delay para não sobrepor outros elementos
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, loadingSpaces, subscribedSpaces]);

  const handleNavigateToSpaces = () => {
    setShowOnboarding(false);
    navigate('/spaces');
  };

  const handleDismissOnboarding = () => {
    setShowOnboarding(false);
    sessionStorage.setItem('onboarding-dismissed', 'true');
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

  const handleHighlightClick = (highlight: { space_slug?: string; id: string }) => {
    navigate(`/spaces/${highlight.space_slug}/post/${highlight.id}`);
  };

  return (
    <AppLayout>
      {/* Onboarding Modal para novos usuários */}
      <OnboardingModal 
        isOpen={showOnboarding}
        onNavigateToSpaces={handleNavigateToSpaces}
        onDismiss={handleDismissOnboarding}
      />
      
      {/* Push banner só aparece se não estiver em onboarding */}
      {!showOnboarding && <PushPermissionBanner />}
      
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

        {/* Hot Discussions */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
                  transition={{ delay: 0.2 + index * 0.05 }}
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
                      {discussion.thumbnail_url && (
                        <div className="shrink-0">
                          <img
                            src={discussion.thumbnail_url}
                            alt=""
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
          transition={{ delay: 0.3 }}
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
                    transition={{ delay: 0.3 + index * 0.05 }}
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
