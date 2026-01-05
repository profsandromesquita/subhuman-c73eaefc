import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Clock, 
  Brain,
  Megaphone,
  Code,
  FilmStrip,
  Heart,
  ChatCircle,
  PlayCircle,
  IconProps
} from "@phosphor-icons/react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ForwardRefExoticComponent, RefAttributes } from "react";

type PhosphorIcon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

const spaceIcons: Record<string, PhosphorIcon> = {
  produtividade: Brain,
  marketing: Megaphone,
  programacao: Code,
  audiovisual: FilmStrip,
  "estilo-vida": Heart,
};

const spaceNames: Record<string, string> = {
  produtividade: "Produtividade Pessoal",
  marketing: "Marketing e Vendas",
  programacao: "Programação e Automação",
  audiovisual: "Audiovisual",
  "estilo-vida": "Estilo de Vida",
};

const mockUpdates = [
  {
    id: 1,
    title: "Claude 3.5 Sonnet: O novo benchmark de performance",
    time: "2 horas atrás",
    readTime: "3 min",
    thumbnail_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=200&h=200&fit=crop",
    media_type: "image",
    likes_count: 42,
    comments_count: 8,
    liked: false,
  },
  {
    id: 2,
    title: "Como usar o Cursor AI para dobrar sua produtividade",
    time: "5 horas atrás",
    readTime: "5 min",
    thumbnail_url: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=200&h=200&fit=crop",
    media_type: "video",
    likes_count: 128,
    comments_count: 24,
    liked: true,
  },
  {
    id: 3,
    title: "Gemini 2.0: O que muda com a nova versão do Google",
    time: "8 horas atrás",
    readTime: "4 min",
    thumbnail_url: null,
    media_type: null,
    likes_count: 67,
    comments_count: 12,
    liked: false,
  },
  {
    id: 4,
    title: "OpenAI lança GPT-4o: Mais rápido e mais barato",
    time: "1 dia atrás",
    readTime: "3 min",
    thumbnail_url: "https://images.unsplash.com/photo-1679083216051-aa510a1a2c0e?w=200&h=200&fit=crop",
    media_type: "image",
    likes_count: 256,
    comments_count: 45,
    liked: false,
  },
];

export default function SpaceDetail() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const SpaceIcon = spaceIcons[spaceId || ""] || Brain;
  const spaceName = spaceNames[spaceId || ""] || "Espaço";

  const handleCardClick = (updateId: number) => {
    navigate(`/spaces/${spaceId}/post/${updateId}`);
  };

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
            <h1 className="text-lg font-bold">{spaceName}</h1>
            <p className="text-xs text-muted-foreground">{mockUpdates.length} atualizações</p>
          </div>
        </motion.div>

        {/* Updates Feed */}
        <div className="space-y-4">
          {mockUpdates.map((update, index) => (
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
                      <h3 className="font-semibold leading-snug line-clamp-2">
                        {update.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {update.time}
                        </span>
                        <span>{update.readTime} de leitura</span>
                      </div>
                      {/* Botões de interação */}
                      <div className="flex items-center gap-4 mt-3">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={`gap-1.5 h-8 px-2 ${update.liked ? "text-red-500" : "text-muted-foreground"}`}
                        >
                          <Heart className="w-4 h-4" weight={update.liked ? "fill" : "regular"} />
                          <span className="text-xs">{update.likes_count}</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-2 text-muted-foreground">
                          <ChatCircle className="w-4 h-4" />
                          <span className="text-xs">{update.comments_count}</span>
                        </Button>
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
      </div>
    </AppLayout>
  );
}
