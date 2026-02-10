import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Clock, 
  Heart,
  ChatCircle,
  PlayCircle
} from "@phosphor-icons/react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getIconComponent } from "@/components/admin/IconPicker";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTime } from "@/lib/formatTime";
import { useSpace } from "@/hooks/useSpaces";
import { useSpaceUpdates } from "@/hooks/usePosts";

// Max animation delay (prevents long waits for lists)
const MAX_STAGGER_ITEMS = 4;
const STAGGER_DELAY = 0.03;

const SPACE_TAGLINES: Record<string, string> = {
  'produtividade': 'Produtividade não é trabalhar mais, é renderizar o resultado mais rápido.',
  'marketing': 'Marketing sem dados é arte; com IA, é ciência de conversão.',
  'programacao': 'Você não precisa ser sênior em Python, precisa ser sênior em resolver problemas.',
  'audiovisual': 'A qualidade de cinema agora cabe no orçamento de freelancer.',
  'estilo-vida': 'A tecnologia deve servir ao humano, não o contrário.',
};

export default function SpaceDetail() {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const navigate = useNavigate();
  
  const { data: space, isLoading: loadingSpace } = useSpace(spaceSlug);
  const { data: updates = [], isLoading: loadingUpdates } = useSpaceUpdates(space?.id);

  const loading = loadingSpace || loadingUpdates;

  const handleCardClick = (updateSlug: string) => {
    navigate(`/spaces/${spaceSlug}/post/${updateSlug}`);
  };


  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 pt-4">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div>
              <Skeleton className="h-5 w-40 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="w-20 h-20 rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!space) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 pt-4 text-center">
          <p className="text-muted-foreground">Espaço não encontrado</p>
          <Link to="/spaces" className="text-primary mt-2 inline-block">
            Voltar para espaços
          </Link>
        </div>
      </AppLayout>
    );
  }

  const SpaceIcon = getIconComponent(space.icon);

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <Link
            to="/spaces"
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" weight="bold" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">{space.name}</h1>
            <p className="text-xs text-muted-foreground">{updates.length} atualizações</p>
          </div>
        </motion.div>

        {/* Frase de impacto */}
        {spaceSlug && SPACE_TAGLINES[spaceSlug] && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="text-sm text-muted-foreground italic mb-6 leading-relaxed"
          >
            "{SPACE_TAGLINES[spaceSlug]}"
          </motion.p>
        )}

        {/* Updates Feed */}
        {updates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhuma publicação ainda</p>
          </div>
        ) : (
          <div className="space-y-4">
            {updates.map((update, index) => (
              <motion.div
                key={update.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index, MAX_STAGGER_ITEMS) * STAGGER_DELAY }}
              >
                <Card 
                  className="hover:border-muted-foreground/30 transition-all duration-200 cursor-pointer active:scale-[0.98]"
                  onClick={() => handleCardClick((update as any).slug || update.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      {/* Conteúdo à esquerda */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold leading-snug line-clamp-3">
                          {update.title}
                        </h3>
                        {/* Interações e tempo na mesma linha */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-3">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="gap-1 h-7 px-1.5 text-muted-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Heart className="w-4 h-4" weight="regular" />
                              <span className="text-xs">{update.likes_count}</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="gap-1 h-7 px-1.5 text-muted-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ChatCircle className="w-4 h-4" />
                              <span className="text-xs">{update.comments_count}</span>
                            </Button>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {formatTime(update.published_at || update.created_at)}
                            </span>
                            <span>·</span>
                            <span>{(update as any).read_time_minutes ? `${(update as any).read_time_minutes}min` : '1min'}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Miniatura à direita */}
                      {update.thumbnail_url && (
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                          <img 
                            src={update.thumbnail_url} 
                            alt="" 
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                          {update.media_type === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <PlayCircle className="w-8 h-8 text-white" weight="fill" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
