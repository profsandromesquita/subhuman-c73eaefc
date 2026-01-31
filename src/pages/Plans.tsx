import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft } from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

const plans = [
  {
    id: "monthly",
    name: "Mensal",
    price: "R$ 29,90",
    period: "/mês",
    description: "Ideal para experimentar",
    features: [
      "Acesso a todos os 5 espaços",
      "Atualizações diárias",
      "Acesso aos canais da comunidade",
      "Notificações personalizadas",
    ],
  },
  {
    id: "yearly",
    name: "Anual",
    price: "R$ 239,90",
    period: "/ano",
    description: "Economize 33%",
    badge: "Mais popular",
    features: [
      "Tudo do plano mensal",
      "2 meses grátis",
      "Acesso antecipado a novidades",
      "Badge exclusivo no perfil",
    ],
  },
];

export default function Plans() {
  const [selectedPlan, setSelectedPlan] = useState("yearly");
  const [isLoading, setIsLoading] = useState(false);
  const [isTrialLoading, setIsTrialLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { status, loading: subLoading, refetch } = useSubscription();

  // Determine if showing expired trial message
  const showExpiredMessage = status === 'expired';

  // Redirect if user already has active subscription or trial
  useEffect(() => {
    if (!subLoading && (status === 'active' || status === 'trial')) {
      navigate('/home', { replace: true });
    }
  }, [status, subLoading, navigate]);

  const handleSubscribe = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success("Assinatura realizada com sucesso!");
    navigate("/home", { replace: true });
    setIsLoading(false);
  };

  const handleStartTrial = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para iniciar o período de teste.");
      navigate("/login");
      return;
    }

    setIsTrialLoading(true);

    try {
      // Check if user already had a trial
      const { data: existingTrial, error: checkError } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('plan_type', 'trial')
        .limit(1)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingTrial) {
        toast.error("Você já utilizou seu período de teste gratuito.");
        setIsTrialLoading(false);
        return;
      }

      // Calculate expiration date (7 days from now)
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Create trial subscription
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_type: 'trial',
          status: 'active',
          starts_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        throw insertError;
      }

      // Refetch subscription status before navigating
      await refetch();

      toast.success("Período de teste iniciado! Você tem 7 dias de acesso gratuito.");
      navigate("/home", { replace: true });
    } catch (error) {
      console.error('Error starting trial:', error);
      toast.error("Erro ao iniciar período de teste. Tente novamente.");
    } finally {
      setIsTrialLoading(false);
    }
  };

  // Show loading state while checking subscription
  if (subLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Glow effect */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-foreground/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-lg mx-auto px-6 pt-8 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center mb-12"
        >
          <Link
            to="/register"
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" weight="bold" />
          </Link>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {showExpiredMessage ? "Seu período de teste expirou" : "Escolha seu plano"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {showExpiredMessage 
              ? "Assine agora para continuar acessando a plataforma"
              : "Cancele quando quiser, sem compromisso"
            }
          </p>

          {/* Plans */}
          <div className="space-y-4 mb-8">
            {plans.map((plan, index) => (
              <motion.button
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                onClick={() => setSelectedPlan(plan.id)}
                className={`w-full p-5 rounded-xl border text-left transition-all duration-200 ${
                  selectedPlan === plan.id
                    ? "border-foreground bg-card shadow-glow-sm"
                    : "border-border bg-card/50 hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{plan.name}</h3>
                      {plan.badge && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-foreground text-background rounded">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selectedPlan === plan.id
                        ? "border-foreground bg-foreground"
                        : "border-muted-foreground"
                    }`}
                  >
                    {selectedPlan === plan.id && (
                      <Check className="w-3 h-3 text-background" weight="bold" />
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>

                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="w-4 h-4 text-foreground" weight="bold" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.button>
            ))}
          </div>

          <Button
            variant="glow"
            size="xl"
            className="w-full"
            onClick={handleSubscribe}
            disabled={isLoading}
          >
            {isLoading ? "Processando..." : "Assinar agora"}
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Pagamento seguro via cartão de crédito ou PIX
          </p>

          {/* Trial option - only show if not expired and user hasn't had trial */}
          {!showExpiredMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 pt-6 border-t border-border"
            >
              <button
                onClick={handleStartTrial}
                disabled={isTrialLoading}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {isTrialLoading 
                  ? "Iniciando..." 
                  : "Prefiro testar grátis por 7 dias →"
                }
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
