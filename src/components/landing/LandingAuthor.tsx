import { GraduationCap, Landmark, Cog } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

const pillars = [
  {
    icon: GraduationCap,
    title: "Rigor Acadêmico",
    desc: "Engenheiro de Software/Mecatrônica (IFCE), Mestre em Eng. de Software (CESAR School), Doutorando em Bioinformática (Fiocruz). Autor de 6 livros acadêmicos.",
  },
  {
    icon: Landmark,
    title: "Liderança de Setor",
    desc: "Presidente do ITIA — Instituto de Tecnologia e IA. Coordenador de Graduação e Pós-Graduação em IA.",
  },
  {
    icon: Cog,
    title: "Experiência Tecnológica",
    desc: "Robótica para transplantes capilares, monitoramento para Bombeiros, automação veicular, IA acadêmica. Indústrias Naval e Farmacêutica.",
  },
];

export function LandingAuthor() {
  return (
    <section className="py-20 sm:py-28 px-6 surface-elevated">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-center mb-3">
            O Arquiteto do Sistema
          </h2>
          <p className="text-muted-foreground text-center text-base sm:text-lg max-w-2xl mx-auto mb-6">
            Você não está seguindo um "guru". Você está acessando a curadoria de um especialista de fronteira.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <p className="text-muted-foreground text-center text-sm sm:text-base max-w-2xl mx-auto mb-12">
            A plataforma Subhumano é liderada pelo Prof. Sandro Mesquita, um profissional que não apenas consome IA, mas a projeta em cenários de missão crítica.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {pillars.map((p, i) => (
            <ScrollReveal key={p.title} delay={i * 0.1}>
              <div className="p-5 rounded-xl bg-card border border-border h-full">
                <div className="p-2.5 rounded-lg bg-secondary w-fit mb-4">
                  <p.icon className="w-5 h-5 text-foreground" />
                </div>
                <h3 className="font-semibold mb-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.2}>
          <blockquote className="border-l-2 border-foreground pl-6 py-2 max-w-2xl mx-auto">
            <p className="text-base sm:text-lg italic text-muted-foreground">
              "No Subhumano, você não recebe opiniões. Recebe o filtro de quem vive a IA onde o erro não é uma opção."
            </p>
          </blockquote>
        </ScrollReveal>
      </div>
    </section>
  );
}
