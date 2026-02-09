import { GraduationCap, Landmark, Cog, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "./ScrollReveal";
import profSandro from "@/assets/landing/prof-sandro.png";
import logoFiocruz from "@/assets/landing/logo-fiocruz.png";
import logoCesar from "@/assets/landing/logo-cesar.png";
import logoIfce from "@/assets/landing/logo-ifce.png";

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

const badges = [
  { logo: logoFiocruz, label: "Fiocruz" },
  { logo: logoCesar, label: "CESAR School" },
  { logo: logoIfce, label: "IFCE" },
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

        {/* Photo + badges */}
        <ScrollReveal delay={0.05}>
          <div className="flex flex-col items-center mb-10">
            <div className="w-40 h-40 rounded-full overflow-hidden ring-2 ring-foreground/20 mb-4">
              <img
                src={profSandro}
                alt="Prof. Sandro Mesquita"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {badges.map((b) => (
                <div
                  key={b.label}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-xs text-muted-foreground"
                >
                  <img src={b.logo} alt={b.label} className="w-5 h-5 object-contain" />
                  <span>{b.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-xs text-muted-foreground">
                <BookOpen className="w-4 h-4" />
                <span>6 Livros Publicados</span>
              </div>
            </div>
          </div>
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

        {/* CTA after author */}
        <ScrollReveal delay={0.25}>
          <div className="text-center mt-8">
            <Button asChild variant="glow" size="lg">
              <Link to="/register">Entrar com Acesso Guiado por Especialista</Link>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
