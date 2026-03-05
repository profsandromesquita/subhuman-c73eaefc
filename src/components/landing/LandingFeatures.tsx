import { Bot, Headphones, Users, Check, Sparkles, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "./ScrollReveal";

const features = [
  {
    icon: Bot,
    subtitle: "Subhumano IA — O Seu Consultor de Bolso 24/7",
    text: "Não perca tempo com pesquisas genéricas. Nosso assistente é treinado especificamente na base de conhecimento curada da plataforma.",
    bullets: [
      "Compara preços e recursos de modelos de IA",
      "Gera prompts otimizados",
      "Resume posts complexos em segundos",
      "Corta ferramentas e cursos que não passam no crivo prático",
    ],
    decoration: "ai",
  },
  {
    icon: Headphones,
    subtitle: "Podcast Subhumano — Inteligência que Acompanha seu Ritmo",
    text: "A falta de tempo não é mais desculpa para a obsolescência.",
    bullets: [
      "Debates de alto nível sobre IA",
      "Consuma enquanto dirige, treina ou se desloca",
      "Sem \"novidades\" superficiais — só estratégia",
    ],
    decoration: "podcast",
  },
  {
    icon: Users,
    subtitle: "Canais de Comunidade — Networking que se Transforma em Resultado",
    text: "Saia da solidão digital e conecte-se com quem está no mesmo nível de jogo.",
    bullets: [
      "Canais especializados por área",
      "Oportunidades reais de negócios e empregos em IA",
      "Discussões moderadas — sinal sempre vence o ruído",
    ],
    decoration: "community",
  },
];

function AIDecoration() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <Bot className="absolute top-4 right-4 w-16 h-16 text-foreground/[0.06] animate-float" />
      <Sparkles className="absolute bottom-8 right-12 w-12 h-12 text-foreground/[0.08] animate-float" style={{ animationDelay: "1s" }} />
      <MessageSquare className="absolute top-1/2 right-2 w-10 h-10 text-foreground/[0.05] animate-float" style={{ animationDelay: "2s" }} />
    </div>
  );
}

function PodcastDecoration() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-end pr-4">
      <div className="flex items-end gap-1.5 opacity-15">
        {[20, 32, 16, 28, 12].map((h, i) => (
          <div
            key={i}
            className="w-2 bg-foreground rounded-full animate-pulse"
            style={{ height: h, animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function CommunityDecoration() {
  const gradients = [
    "from-foreground/20 to-foreground/5",
    "from-foreground/15 to-foreground/5",
    "from-foreground/10 to-foreground/5",
  ];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-end pr-6">
      <div className="flex flex-wrap gap-2 max-w-[100px] opacity-30">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradients[i % 3]}`}
          />
        ))}
      </div>
    </div>
  );
}

const decorations: Record<string, React.FC> = {
  ai: AIDecoration,
  podcast: PodcastDecoration,
  community: CommunityDecoration,
};

export function LandingFeatures() {
  return (
    <section className="py-12 sm:py-28 px-5 sm:px-6 surface-elevated">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <h2 className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-center mb-10 sm:mb-16">
            Ferramentas de{" "}
            <span className="text-muted-foreground">Soberania Profissional</span>
          </h2>
        </ScrollReveal>

        <div className="space-y-10 sm:space-y-20">
          {features.map((feat, i) => {
            const Decoration = decorations[feat.decoration];
            return (
              <ScrollReveal key={feat.subtitle} delay={0.1}>
                <div
                  className={`relative flex flex-col ${
                    i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  } gap-8 md:gap-12 items-center`}
                >
                  {Decoration && <Decoration />}

                  {/* Icon */}
                  <div className="flex-shrink-0 p-4 sm:p-6 rounded-2xl bg-card border border-border">
                    <feat.icon className="w-9 h-9 sm:w-12 sm:h-12 text-foreground" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-bold mb-3">
                      {feat.subtitle}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      {feat.text}
                    </p>
                    <ul className="space-y-2">
                      {feat.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* CTA after features */}
        <ScrollReveal delay={0.2}>
          <div className="text-center mt-16">
            <p className="text-muted-foreground mb-4">Todas as ferramentas incluídas em um único ecossistema</p>
            <Button asChild variant="glow" size="lg">
              <Link to="/register">Acessar o Ecossistema Completo</Link>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
