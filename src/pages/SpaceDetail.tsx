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
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getIconComponent } from "@/components/admin/IconPicker";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Space {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
}

interface SpaceUpdate {
  id: string;
  title: string;
  content: string | null;
  thumbnail_url: string | null;
  media_type: string | null;
  published_at: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

export default function SpaceDetail() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const [space, setSpace] = useState<Space | null>(null);
  const [updates, setUpdates] = useState<SpaceUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpaceAndUpdates();
  }, [spaceId]);

  const fetchSpaceAndUpdates = async () => {
    if (!spaceId) return;
    
    setLoading(true);
    
    // Fetch space by slug
    const { data: spaceData, error: spaceError } = await supabase
      .from("spaces")
      .select("*")
      .eq("slug", spaceId)
      .eq("is_active", true)
      .maybeSingle();

    if (spaceError || !spaceData) {
      setLoading(false);
      return;
    }

    setSpace(spaceData);

    // Fetch published updates for this space
    const { data: updatesData, error: updatesError } = await supabase
      .from("space_updates")
      .select("id, title, content, thumbnail_url, media_type, published_at, created_at")
      .eq("space_id", spaceData.id)
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (!updatesError && updatesData) {
      // Fetch likes and comments count for each update
      const updatesWithCounts = await Promise.all(
        updatesData.map(async (update) => {
          const [likesResult, commentsResult] = await Promise.all([
            supabase.from("update_likes").select("id", { count: "exact", head: true }).eq("update_id", update.id),
            supabase.from("update_comments").select("id", { count: "exact", head: true }).eq("update_id", update.id),
          ]);
          
          return {
            ...update,
            likes_count: likesResult.count || 0,
            comments_count: commentsResult.count || 0,
          };
        })
      );
      
      setUpdates(updatesWithCounts);
    }

    setLoading(false);
  };

  const handleCardClick = (updateId: string) => {
    navigate(`/spaces/${spaceId}/post/${updateId}`);
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "";
    const distance = formatDistanceToNow(new Date(dateString), { locale: ptBR });
    // Shorten common phrases
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

  const estimateReadTime = (content: string | null): string => {
    if (!content) return "1min";
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes}min`;
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
          <div className="p-2.5 rounded-xl bg-foreground">
            <SpaceIcon className="w-5 h-5 text-background" weight="bold" />
          </div>
          <div>
            <h1 className="text-lg font-bold">{space.name}</h1>
            <p className="text-xs text-muted-foreground">{updates.length} atualizações</p>
          </div>
        </motion.div>

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
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="hover:border-muted-foreground/30 transition-all duration-200 cursor-pointer active:scale-[0.98]"
                  onClick={() => handleCardClick(update.id)}
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
                            <span>{estimateReadTime(update.content)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Miniatura à direita */}
                      {update.thumbnail_url && (
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                          <img 
                            src={update.thumbnail_url} 
                            alt="" 
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
