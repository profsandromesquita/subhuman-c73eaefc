import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export function StickyBottomCTA() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;

    const handleScroll = () => {
      const heroHeight = window.innerHeight;
      const ctaFinal = document.getElementById("landing-cta-final");
      const ctaTop = ctaFinal?.getBoundingClientRect().top ?? Infinity;

      const pastHero = window.scrollY > heroHeight;
      const beforeCta = ctaTop > window.innerHeight * 0.5;

      setVisible(pastHero && beforeCta);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [dismissed]);

  return (
    <AnimatePresence>
      {visible && !dismissed && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-t border-border"
        >
          <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Pronto para assumir o comando?
            </p>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button asChild variant="glow" size="default" className="flex-1 sm:flex-none">
                <Link to="/register">Começar Grátis</Link>
              </Button>
              <button
                onClick={() => setDismissed(true)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
