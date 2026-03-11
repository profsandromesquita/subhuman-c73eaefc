import { useNavigate } from "react-router-dom";
import { Lock } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { LimitInfo } from "@/hooks/useAIAssistant";

interface AILimitMessageProps {
  limitInfo: LimitInfo;
}

function getLimitContent(info: LimitInfo) {
  const { tier, daily_limit } = info;

  if (tier === "monthly") {
    return {
      message: `Você atingiu o limite de ${daily_limit} consultas do plano Mensal.`,
      cta: "Faça upgrade para o plano Anual e ganhe 20 consultas/dia",
      showUpgrade: true,
    };
  }

  if (tier === "yearly") {
    return {
      message: `Você atingiu o limite de ${daily_limit} consultas do plano Anual.`,
      cta: "Faça upgrade para o plano Vitalício e ganhe 25 consultas/dia",
      showUpgrade: true,
    };
  }

  if (tier === "lifetime") {
    return {
      message: `Você atingiu o limite de ${daily_limit} consultas de hoje. Volte amanhã!`,
      cta: null,
      showUpgrade: false,
    };
  }

  // freemium, student, coupon, trial
  const plural = daily_limit === 1 ? "consulta" : "consultas";
  return {
    message: `Você usou suas ${daily_limit} ${plural} de hoje. Volte amanhã para continuar conversando!`,
    cta: "Quer liberar o chat agora? Assine o Subhumano",
    showUpgrade: true,
  };
}

export function AILimitMessage({ limitInfo }: AILimitMessageProps) {
  const navigate = useNavigate();
  const { message, cta, showUpgrade } = getLimitContent(limitInfo);

  return (
    <div className="flex flex-col items-center gap-3 py-4 px-4 text-center">
      <Lock className="w-6 h-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {showUpgrade && cta && (
        <Button
          size="sm"
          onClick={() => navigate("/plans")}
          className="mt-1"
        >
          {cta}
        </Button>
      )}
    </div>
  );
}
