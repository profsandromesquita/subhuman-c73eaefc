import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Clock, 
  ArrowRight,
  Sparkles,
  Brain,
  Megaphone,
  Code2,
  Film,
  Heart
} from "lucide-react";
import { Link } from "react-router-dom";

const highlights = [
  {
    id: 1,
    title: "GPT-5 pode ser lançado em breve",
    space: "Programação",
    time: "2h atrás",
    trending: true,
  },
  {
    id: 2,
    title: "Claude 3.5 supera GPT-4 em benchmarks",
    space: "Produtividade",
    time: "4h atrás",
    trending: true,
  },
  {
    id: 3,
    title: "Sora da OpenAI: o futuro do vídeo",
    space: "Audiovisual",
    time: "6h atrás",
    trending: false,
  },
];

const spaces = [
  { id: "produtividade", name: "Produtividade Pessoal", icon: Brain, updates: 12 },
  { id: "marketing", name: "Marketing e Vendas", icon: Megaphone, updates: 8 },
  { id: "programacao", name: "Programação", icon: Code2, updates: 15 },
  { id: "audiovisual", name: "Audiovisual", icon: Film, updates: 6 },
  { id: "estilo-vida", name: "Estilo de Vida", icon: Heart, updates: 4 },
];

export default function Home() {
  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Olá, usuário</span>
          </div>
          <h1 className="text-2xl font-bold">Bom dia!</h1>
        </motion.div>

        {/* Highlights Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Destaques do dia
            </h2>
            <Link
              to="/spaces"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver tudo
            </Link>
          </div>

          <div className="space-y-3">
            {highlights.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <Card className="hover:border-muted-foreground/30 transition-all duration-200 cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                            {item.space}
                          </span>
                          {item.trending && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              Em alta
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium leading-snug">{item.title}</h3>
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {item.time}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground mt-1" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Spaces Quick Access */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Seus espaços</h2>
            <Link
              to="/spaces"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Gerenciar
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {spaces.slice(0, 4).map((space, index) => (
              <motion.div
                key={space.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.05 }}
              >
                <Link to={`/spaces/${space.id}`}>
                  <Card className="hover:border-muted-foreground/30 transition-all duration-200 group">
                    <CardContent className="p-4">
                      <div className="p-2 rounded-lg bg-secondary w-fit mb-3 group-hover:bg-surface-hover transition-colors">
                        <space.icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-medium text-sm mb-1 leading-tight">
                        {space.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {space.updates} atualizações
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>

          <Button asChild variant="secondary" className="w-full mt-4">
            <Link to="/spaces">
              Ver todos os espaços
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </motion.section>
      </div>
    </AppLayout>
  );
}
