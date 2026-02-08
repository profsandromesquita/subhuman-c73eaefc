import { Bot, Headphones, Users, Check } from "lucide-react";
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
  },
];

export function LandingFeatures() {
  return (
    <section className="py-20 sm:py-28 px-6 surface-elevated">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-center mb-16">
            Ferramentas de{" "}
            <span className="text-muted-foreground">Soberania Profissional</span>
          </h2>
        </ScrollReveal>

        <div className="space-y-16 sm:space-y-20">
          {features.map((feat, i) => (
            <ScrollReveal key={feat.subtitle} delay={0.1}>
              <div
                className={`flex flex-col ${
                  i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                } gap-8 md:gap-12 items-center`}
              >
                {/* Icon */}
                <div className="flex-shrink-0 p-6 rounded-2xl bg-card border border-border">
                  <feat.icon className="w-12 h-12 text-foreground" />
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
          ))}
        </div>
      </div>
    </section>
  );
}
