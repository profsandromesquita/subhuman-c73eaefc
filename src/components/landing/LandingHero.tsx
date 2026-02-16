import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { PhoneMockupCarousel } from "./PhoneMockupCarousel";

export function LandingHero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-16 overflow-hidden">
      {/* Radial gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(ellipse_at_center,hsl(0_0%_15%_/_0.4)_0%,transparent_70%)]" />
      </div>

      <div className="relative max-w-3xl mx-auto text-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 flex justify-center">

          <Logo size="xl" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.1] tracking-tight mb-6">

          RECEBA EM PRIMEIRA MÃO AS PRINCIPAIS ATUALIZAÇÕES{" "}
          <span className="text-secondary-foreground">RELEVANTES PARA VOCÊ DO MUNDO DA INTELIGÊNCIA ARTIFICIAL

          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-10">

          Enquanto o mercado te bombardeia com novidades inúteis e cursos superficiais, sua carreira exige foco estratégico. Pare de se sentir atrasado. Tenha acesso à informação validada por quem constrói a IA na prática e receba apenas o que move o seu lucro e sua produtividade. O Subhumano tritura o ruído para você governar a tecnologia.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="flex flex-col sm:flex-row gap-3 justify-center">

          <Button asChild variant="glow" size="xl">
            <Link to="/register">Começar Agora — 7 Dias Grátis</Link>
          </Button>
          <Button asChild variant="outline" size="xl">
            <Link to="/login">Já tenho conta</Link>
          </Button>
        </motion.div>

        {/* Phone Mockup Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mt-16">

          <PhoneMockupCarousel />
        </motion.div>
      </div>

      {/* Scroll down arrow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2">

        <ChevronDown className="w-6 h-6 text-muted-foreground animate-bounce" />
      </motion.div>
    </section>);

}