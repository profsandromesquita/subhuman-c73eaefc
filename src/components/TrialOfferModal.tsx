import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift, Check } from "@phosphor-icons/react";

interface TrialOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmTrial: () => void;
  isLoading: boolean;
}

const benefits = [
  "Acesso a todos os 5 espaços",
  "Atualizações diárias",
  "Acesso aos canais da comunidade",
];

export function TrialOfferModal({
  isOpen,
  onClose,
  onConfirmTrial,
  isLoading,
}: TrialOfferModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm mx-auto bg-card border-border">
        <DialogHeader className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
            className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center"
          >
            <Gift className="w-8 h-8 text-green-500" weight="fill" />
          </motion.div>

          <DialogTitle className="text-xl font-bold">
            Espera! Que tal testar grátis?
          </DialogTitle>

          <DialogDescription className="text-muted-foreground">
            Você pode experimentar o Subhumano por{" "}
            <span className="text-foreground font-semibold">7 dias</span>{" "}
            completamente grátis.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 p-4 rounded-xl bg-green-500/5 border border-green-500/20">
          <p className="text-sm font-medium text-green-500 text-center mb-3">
            ✨ Sem cartão de crédito
          </p>
          <ul className="space-y-2">
            {benefits.map((benefit) => (
              <li
                key={benefit}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Check className="w-4 h-4 text-green-500" weight="bold" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 space-y-3">
          <Button
            onClick={onConfirmTrial}
            disabled={isLoading}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3"
          >
            {isLoading ? "Iniciando..." : "Quero meus 7 dias grátis"}
          </Button>

          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Não, voltar para a home
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
