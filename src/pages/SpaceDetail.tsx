import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Clock, 
  BookmarkSimple,
  ShareNetwork,
  Brain,
  Megaphone,
  Code,
  FilmStrip,
  Heart,
  IconProps
} from "@phosphor-icons/react";
import { Link, useParams } from "react-router-dom";
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
    excerpt: "A Anthropic lançou uma atualização impressionante do Claude que está superando GPT-4 em várias métricas de benchmark...",
    time: "2 horas atrás",
    readTime: "3 min",
    saved: false,
  },
  {
    id: 2,
    title: "Como usar o Cursor AI para dobrar sua produtividade",
    excerpt: "O Cursor se tornou uma das ferramentas mais populares entre desenvolvedores. Veja como tirar o máximo proveito...",
    time: "5 horas atrás",
    readTime: "5 min",
    saved: true,
  },
  {
    id: 3,
    title: "Gemini 2.0: O que muda com a nova versão do Google",
    excerpt: "O Google atualizou seu modelo de IA com capacidades multimodais avançadas. Confira as principais novidades...",
    time: "8 horas atrás",
    readTime: "4 min",
    saved: false,
  },
  {
    id: 4,
    title: "OpenAI lança GPT-4o: Mais rápido e mais barato",
    excerpt: "A nova versão do modelo da OpenAI promete ser 2x mais rápida e 50% mais barata que o GPT-4 Turbo...",
    time: "1 dia atrás",
    readTime: "3 min",
    saved: false,
  },
];

export default function SpaceDetail() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const SpaceIcon = spaceIcons[spaceId || ""] || Brain;
  const spaceName = spaceNames[spaceId || ""] || "Espaço";

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
              <Card className="hover:border-muted-foreground/30 transition-all duration-200 cursor-pointer">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 leading-snug">
                    {update.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {update.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {update.time}
                      </span>
                      <span>{update.readTime} de leitura</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className={update.saved ? "text-foreground" : "text-muted-foreground"}
                      >
                        <BookmarkSimple className={`w-4 h-4 ${update.saved ? "fill-current" : ""}`} weight={update.saved ? "fill" : "regular"} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
                        <ShareNetwork className="w-4 h-4" />
                      </Button>
                    </div>
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
