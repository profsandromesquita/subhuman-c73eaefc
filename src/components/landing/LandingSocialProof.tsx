import { Users, LayoutGrid, RefreshCw } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
const stats = [{
  icon: Users,
  value: "+500",
  label: "profissionais"
}, {
  icon: LayoutGrid,
  value: "5",
  label: "Espaços temáticos"
}, {
  icon: RefreshCw,
  value: "Curadoria",
  label: "diária"
}];
export function LandingSocialProof() {
  return <ScrollReveal>
      <div className="py-10 px-6 border-y border-border/50">
        <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-8 sm:gap-12">
          {stats.map((s, i) => <div key={i} className="flex items-center gap-3">
              <s.icon className="w-5 h-5 text-muted-foreground" />
              <div className="flex items-baseline gap-1.5">
                
                <span className="text-sm text-muted-foreground">{s.label}</span>
              </div>
            </div>)}
        </div>
      </div>
    </ScrollReveal>;
}