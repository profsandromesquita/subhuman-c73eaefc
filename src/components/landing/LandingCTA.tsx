import { Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "./ScrollReveal";

export function LandingCTA() {
  return (
    <section className="py-20 sm:py-28 px-6 relative overflow-hidden">
      {/* Subtle gradient */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,hsl(0_0%_12%_/_0.5)_0%,transparent_70%)]" />

      <div className="relative max-w-3xl mx-auto text-center z-10">
        <ScrollReveal>
          <blockquote className="text-base sm:text-lg lg:text-xl italic text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto">
            "Se você ainda tem dúvida, não use seu cartão. Entre, use a plataforma por 7 dias, ouça os podcasts, consulte o nosso Oráculo de IA e leia a curadoria dos Espaços. Se em uma semana você não sentir que recuperou o comando da tecnologia, basta sair. Sem letras miúdas. O risco de provar nossa autoridade é todo nosso."
          </blockquote>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-6">
            <Shield className="w-4 h-4 text-foreground" />
            <span className="text-sm font-medium">7 dias grátis — Sem compromisso</span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <p className="text-sm text-muted-foreground mb-8 max-w-xl mx-auto">
            Mantemos a curadoria enxuta para preservar qualidade. Se as inscrições estiverem abertas, entre agora e já receba a próxima edição — comece a cortar o ruído esta semana.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <Button asChild variant="glow" size="xl">
            <Link to="/register">Entrar no Subhumano — 7 Dias Grátis</Link>
          </Button>
        </ScrollReveal>
      </div>
    </section>
  );
}
