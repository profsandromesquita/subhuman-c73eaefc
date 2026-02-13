import { Code2, Target, TrendingUp, Video, Heart, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "./ScrollReveal";

const spaces = [
  {
    icon: Code2,
    name: "Programação e Automação",
    description: "Saia das discussões superficiais sobre \"aprender Python\". Foque em como LLMs de última geração estão redefinindo a arquitetura de software e a segurança de código.",
  },
  {
    icon: Target,
    name: "Produtividade Pessoal e Profissional",
    description: "Não é sobre trabalhar mais; é sobre renderizar resultados. Validamos se ferramentas são ganhos reais de salário e tempo ou apenas mais um custo na sua fatura.",
  },
  {
    icon: TrendingUp,
    name: "Marketing e Vendas",
    description: "Transforme sua estratégia entendendo a ciência da conversão. Analisamos o impacto real de novos padrões de dados e sinais B2B que estão mudando o consumo online.",
  },
  {
    icon: Video,
    name: "AudioVisual",
    description: "Monitore a democratização da qualidade de cinema. Saiba como vozes sintéticas de nível humano impactam o custo, a escala e a produção.",
  },
  {
    icon: Heart,
    name: "Estilo de Vida",
    description: "IA aplicada à saúde e longevidade, sem misticismos. Tecnologias personalizadas que trazem dados reais para sua saúde.",
  },
  {
    icon: GraduationCap,
    name: "Aulas ao Vivo e Workshops",
    description: "Workshops práticos, palestras, lives, mentorias coletivas e cursos ministrados por especialistas. Aprenda fazendo com projetos reais e suporte ao vivo.",
  },
];

export function LandingSpaces() {
  return (
    <section className="py-20 sm:py-28 px-6">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-center mb-4">
            Nossos Espaços entregam o fato técnico{" "}
            <span className="text-muted-foreground">e a vanguarda útil</span>
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
          {spaces.map((space, i) => (
            <ScrollReveal key={space.name} delay={i * 0.08}>
              <div className="group p-5 rounded-xl bg-card border border-border hover:border-muted-foreground/30 hover:shadow-[0_0_20px_hsl(0_0%_100%_/_0.06)] transition-all duration-300 h-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-foreground/20 to-foreground/5 flex items-center justify-center mb-4">
                  <space.icon className="w-7 h-7 text-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{space.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {space.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* CTA after spaces */}
        <ScrollReveal delay={0.3}>
          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">Escolha seus Espaços e comece a filtrar o ruído</p>
            <Button asChild variant="glow" size="lg">
              <Link to="/register">Começar Agora — 7 Dias Grátis</Link>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
