import { Newspaper, Headphones, Radio, Robot } from "@phosphor-icons/react";
import { SplineScene } from "@/components/ui/splite";
import { Spotlight } from "@/components/ui/spotlight";

const features = [
  { icon: Newspaper, title: "Artigos", description: "Análises profundas sobre IA escritas por quem constrói na prática" },
  { icon: Headphones, title: "Podcasts", description: "Conteúdo em áudio para consumir no seu ritmo, onde estiver" },
  { icon: Radio, title: "Canais", description: "Atualizações em tempo real dos temas que movem sua carreira" },
  { icon: Robot, title: "Assistente IA", description: "Tire dúvidas e explore temas com inteligência artificial integrada" },
];

export function LoginHero() {
  return (
    <div className="h-full w-full bg-black/[0.96] relative overflow-hidden">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

      {/* Spline robot — full background */}
      <SplineScene
        scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
        className="absolute inset-0 w-full h-full"
      />

      {/* Feature cards — bottom overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-8 pb-8">
        <div className="grid grid-cols-2 gap-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="bg-black/60 border border-white/10 rounded-xl p-4 backdrop-blur-sm hover:bg-black/70 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-5 h-5 text-white" weight="duotone" />
                <span className="text-white font-semibold text-sm">{title}</span>
              </div>
              <p className="text-white/60 text-xs leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
