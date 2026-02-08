import { Bell, AlertTriangle, Megaphone } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

export function LandingProblem() {
  return (
    <section className="py-20 sm:py-28 px-6">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-12 md:gap-16 items-center">
        {/* Text */}
        <div className="md:w-[60%]">
          <ScrollReveal>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-6">
              O FIM DA "SIRENE"{" "}
              <span className="text-muted-foreground">NO SEU FEED</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-4">
              Seu feed virou uma sirene constante. Toda hora um "curso definitivo", um hack milagroso ou uma trend vazia anunciando que a IA matou sua profissão. Para quem precisa liderar e entregar, o barulho é ensurdecedor e a referência do que é real sumiu.
            </p>
            <p className="text-foreground font-semibold text-base sm:text-lg mb-4">
              Chega. Sua carreira exige foco.
            </p>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              O Subhumano é sua dieta de informação validada por quem constrói IA na prática.
            </p>
          </ScrollReveal>
        </div>

        {/* Icons composition */}
        <ScrollReveal className="md:w-[40%] flex justify-center" delay={0.2}>
          <div className="relative w-48 h-48 sm:w-56 sm:h-56">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 p-4 rounded-2xl bg-card border border-border">
              <Bell className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="absolute bottom-4 left-0 p-4 rounded-2xl bg-card border border-border">
              <AlertTriangle className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="absolute bottom-4 right-0 p-4 rounded-2xl bg-card border border-border">
              <Megaphone className="w-10 h-10 text-muted-foreground" />
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
