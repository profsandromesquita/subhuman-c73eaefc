import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { SquaresFour, ArrowDown, Sparkle } from "@phosphor-icons/react";

interface OnboardingModalProps {
  isOpen: boolean;
  onNavigateToSpaces: () => void;
  onDismiss: () => void;
}

export function OnboardingModal({ 
  isOpen, 
  onNavigateToSpaces,
  onDismiss 
}: OnboardingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="max-w-sm mx-auto bg-card border-border p-6">
        {/* Logo animada */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", delay: 0.1, stiffness: 200, damping: 15 }}
          className="mx-auto flex items-center justify-center"
        >
          <Logo size="lg" />
        </motion.div>

        {/* Título e descrição */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center space-y-3 mt-4"
        >
          <h2 className="text-xl font-bold">
            Bem-vindo!
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Para começar, escolha os <strong className="text-foreground">Espaços</strong> que 
            mais combinam com você. A plataforma vai filtrar 
            as melhores atualizações de IA para você.
          </p>
        </motion.div>

        {/* Indicador visual do menu */}
        <motion.div 
          className="mt-6 p-4 rounded-xl bg-secondary/50 border border-border"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-center gap-2 text-sm flex-wrap">
            <span className="text-muted-foreground">Clique em</span>
            <motion.div 
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-medium"
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.8, 1, 0.8] 
              }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <SquaresFour className="w-4 h-4" weight="fill" />
              Espaços
            </motion.div>
            <span className="text-muted-foreground">no menu abaixo</span>
          </div>
          
          {/* Seta animada apontando para baixo */}
          <motion.div
            className="flex justify-center mt-4"
            animate={{ y: [0, 8, 0] }}
            transition={{ 
              repeat: Infinity, 
              duration: 1.5, 
              ease: "easeInOut" 
            }}
          >
            <ArrowDown className="w-6 h-6 text-primary" weight="bold" />
          </motion.div>
        </motion.div>

        {/* Botões de ação */}
        <motion.div 
          className="mt-6 space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={onNavigateToSpaces}
            className="w-full bg-white text-black font-semibold py-3 hover:bg-gray-100"
          >
            <Sparkle className="w-4 h-4 mr-2" weight="fill" />
            Escolher meus espaços
          </Button>

          <button
            onClick={onDismiss}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Ver a home primeiro
          </button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
