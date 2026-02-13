import { CalendarDays, Monitor, Clock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollReveal } from "./ScrollReveal";

export function LandingEvents() {
  return (
    <section className="py-20 sm:py-28 px-6">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-amber-500/10 text-amber-400 border-amber-500/20">
              <Sparkles className="w-3 h-3 mr-1" />
              Próximo evento
            </Badge>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-3">
              Aprenda fazendo,{" "}
              <span className="text-muted-foreground">ao vivo</span>
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              Workshops práticos, palestras e mentorias com especialistas para você aplicar IA no seu dia a dia.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="relative rounded-xl border border-border bg-card p-6 sm:p-8 overflow-hidden">
            {/* Accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-400" />

            <div className="flex flex-col sm:flex-row gap-6">
              {/* Content */}
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-foreground/10 text-foreground border-0 text-xs">
                    Workshop
                  </Badge>
                  <Badge className="bg-blue-500/10 text-blue-400 border-0 text-xs">
                    <Monitor className="w-3 h-3 mr-1" />
                    Online
                  </Badge>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold leading-tight">
                  Crie seu software em 6h usando IA
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Mesmo sem saber programar. Em 2 aulas ao vivo de 3 horas, você vai sair com um projeto funcional e publicado.
                </p>

                {/* Dates */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    <span>7 de março de 2026</span>
                    <span className="text-muted-foreground">•</span>
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">14h às 17h</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    <span>14 de março de 2026</span>
                    <span className="text-muted-foreground">•</span>
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">14h às 17h</span>
                  </div>
                </div>
              </div>

              {/* Price + CTA */}
              <div className="flex flex-col items-center justify-center gap-3 sm:min-w-[180px]">
                <div className="text-center">
                  <p className="text-3xl font-extrabold">R$ 19,90</p>
                  <p className="text-xs text-muted-foreground">pagamento único</p>
                </div>
                <Button asChild variant="glow" size="lg" className="w-full">
                  <Link to="/plans">Garantir minha vaga</Link>
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Sala exclusiva online
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
