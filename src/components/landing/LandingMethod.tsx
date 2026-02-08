import { ShieldOff, Map, BookOpen, Users, Bot, Headphones } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

const steps = [
  { num: 1, icon: ShieldOff, title: "Filtro — Detox de Ruído", desc: "Nossa plataforma identifica e descarta o lixo tecnológico para você." },
  { num: 2, icon: Map, title: "Mapeamento — Espaços Temáticos", desc: "Especialistas alinham a IA às necessidades reais do mercado." },
  { num: 3, icon: BookOpen, title: "Absorção Estratégica", desc: "Você consome apenas conteúdos curados e validados tecnicamente." },
  { num: 4, icon: Users, title: "Conexão — Inteligência Coletiva", desc: "Interação em fóruns para discutir temas reais e networking de elite." },
  { num: 5, icon: Bot, title: "Acoplamento — Subhumano IA", desc: "Assistente especializado para prompts e decisões técnicas instantâneas." },
  { num: 6, icon: Headphones, title: "Sincronização Passiva", desc: "Atualização sem esforço via Podcasts — no trânsito ou na academia." },
];

export function LandingMethod() {
  return (
    <section className="py-20 sm:py-28 px-6">
      <div className="max-w-3xl mx-auto">
        <ScrollReveal>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-center mb-3">
            O Método Piloto Subhumano{" "}
            <span className="text-muted-foreground">(MPS)</span>
          </h2>
          <p className="text-muted-foreground text-center text-base sm:text-lg mb-14">
            Para tirar você do caos da infoxicação, não basta boa vontade; é preciso método.
          </p>
        </ScrollReveal>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-10">
            {steps.map((step, i) => (
              <ScrollReveal key={step.num} delay={i * 0.08}>
                <div className="flex gap-6 relative">
                  {/* Number circle */}
                  <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center">
                    <span className="text-sm font-bold">{step.num}</span>
                  </div>

                  <div className="pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <step.icon className="w-4 h-4 text-muted-foreground" />
                      <h3 className="font-semibold">{step.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
