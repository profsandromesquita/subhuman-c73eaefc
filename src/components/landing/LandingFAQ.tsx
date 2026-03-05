import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollReveal } from "./ScrollReveal";

const faqs = [
  {
    q: "Isso é apenas mais um curso de IA com aulas que ficam obsoletas em um mês?",
    a: "Não. O Subhumano não é um curso estático; é um ecossistema de inteligência viva. Enquanto cursos focam em \"como usar a ferramenta X\" (que muda toda semana), nós focamos em curadoria e validação técnica. Aqui, você não estuda o passado da IA; você acessa o presente filtrado por quem constrói a tecnologia na indústria e na academia.",
  },
  {
    q: "Por que eu pagaria se encontro notícias de IA de graça no YouTube ou Instagram?",
    a: "Pelo mesmo motivo que você não aceita conselhos médicos de qualquer influenciador. O mercado de IA hoje é uma \"sirene\" de marketing e hype. No Subhumano, você paga pela imparcialidade e pelo tempo. Nós trituramos o ruído para que você não precise ler 1.000 artigos. Você recebe o fato técnico validado, sem o \"oba-oba\" de quem vive de cliques.",
  },
  {
    q: "Não sou da área técnica. Vou conseguir aproveitar o conteúdo?",
    a: "Com certeza. O propósito fundamental da plataforma é desmistificar a IA. Escrevemos para profissionais reais, gestores e empresários que precisam de clareza para decidir, não de jargões obscuros para se confundir. Se você sabe que a IA é importante, mas não tem tempo a perder, você é o nosso público.",
  },
  {
    q: "Quem garante que essa informação é confiável?",
    a: "A curadoria é liderada pelo Prof. Sandro Mesquita — Mestre em Eng. de Software e Doutorando na Fiocruz, que coordena pós-graduações e constrói robótica de missão crítica. Toda informação segue um Padrão de Conhecimento rigoroso, baseado em releases oficiais e evidências técnicas, não em suposições.",
  },
  {
    q: "Vou ter que gastar mais dinheiro com outras ferramentas?",
    a: "Nosso objetivo é justamente o oposto: fazer você economizar. Ajudamos você a identificar quais ferramentas são investimentos reais e quais são desperdício. Nosso foco é na Economia de Inferência: obter o máximo de resultado com o menor custo possível.",
  },
];

export function LandingFAQ() {
  return (
    <section className="py-12 sm:py-28 px-5 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <ScrollReveal>
          <h2 className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-center mb-8 sm:mb-12">
            Você pode estar pensando...
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border border-border rounded-xl px-5 bg-card"
              >
                <AccordionTrigger className="text-left text-sm sm:text-base font-medium py-4 hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollReveal>
      </div>
    </section>
  );
}
