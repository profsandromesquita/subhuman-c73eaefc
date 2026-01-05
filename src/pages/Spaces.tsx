import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Brain, 
  Megaphone, 
  Code2, 
  Film, 
  Heart,
  ArrowRight,
  Check
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const spaces = [
  { 
    id: "produtividade", 
    name: "Produtividade Pessoal", 
    icon: Brain, 
    updates: 12,
    description: "Ferramentas de IA para organização, foco e eficiência pessoal",
    subscribed: true,
  },
  { 
    id: "marketing", 
    name: "Marketing e Vendas", 
    icon: Megaphone, 
    updates: 8,
    description: "IA aplicada a estratégias de marketing digital e vendas",
    subscribed: true,
  },
  { 
    id: "programacao", 
    name: "Programação e Automação", 
    icon: Code2, 
    updates: 15,
    description: "Desenvolvimento assistido por IA, copilots e automações",
    subscribed: true,
  },
  { 
    id: "audiovisual", 
    name: "Audiovisual", 
    icon: Film, 
    updates: 6,
    description: "Geração de imagens, vídeos e áudio com inteligência artificial",
    subscribed: false,
  },
  { 
    id: "estilo-vida", 
    name: "Estilo de Vida", 
    icon: Heart, 
    updates: 4,
    description: "IA no cotidiano: saúde, finanças, relacionamentos",
    subscribed: false,
  },
];

export default function Spaces() {
  const [subscriptions, setSubscriptions] = useState(
    spaces.reduce((acc, space) => ({ ...acc, [space.id]: space.subscribed }), {} as Record<string, boolean>)
  );

  const toggleSubscription = (id: string) => {
    setSubscriptions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold mb-1">Espaços</h1>
          <p className="text-muted-foreground text-sm">
            Escolha os temas que você quer acompanhar
          </p>
        </motion.div>

        {/* Spaces List */}
        <div className="space-y-3">
          {spaces.map((space, index) => {
            const isSubscribed = subscriptions[space.id];
            
            return (
              <motion.div
                key={space.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`transition-all duration-200 ${isSubscribed ? 'border-muted-foreground/30' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl transition-colors ${isSubscribed ? 'bg-foreground' : 'bg-secondary'}`}>
                        <space.icon className={`w-6 h-6 ${isSubscribed ? 'text-background' : 'text-foreground'}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-semibold">{space.name}</h3>
                          <button
                            onClick={() => toggleSubscription(space.id)}
                            className={`p-1.5 rounded-lg transition-all duration-200 ${
                              isSubscribed 
                                ? 'bg-foreground text-background' 
                                : 'bg-secondary hover:bg-surface-hover'
                            }`}
                          >
                            {isSubscribed ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <ArrowRight className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {space.description}
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {space.updates} atualizações esta semana
                          </span>
                          {isSubscribed && (
                            <span className="text-xs text-foreground bg-secondary px-2 py-0.5 rounded">
                              Inscrito
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* View Space Link */}
                    <Link
                      to={`/spaces/${space.id}`}
                      className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span>Ver atualizações</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
