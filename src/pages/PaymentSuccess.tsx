import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, SpinnerGap, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/SEO";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { status, loading: subLoading, refetch } = useSubscription();
  const [checkCount, setCheckCount] = useState(0);
  const maxChecks = 10;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Poll for subscription status
  useEffect(() => {
    if (authLoading || subLoading) return;

    // If subscription is active (paid subscription), redirect to home
    const isSubscriptionActive = status === "active" || status === "trial";
    
    if (isSubscriptionActive) {
      const timer = setTimeout(() => {
        navigate("/home", { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }

    // Keep polling if not active yet
    if (checkCount < maxChecks && !isSubscriptionActive) {
      const timer = setTimeout(() => {
        refetch();
        setCheckCount((prev) => prev + 1);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, authLoading, subLoading, checkCount, navigate, refetch]);

  const isActive = status === "active" || status === "trial";
  const isChecking = checkCount < maxChecks && !isActive;
  const hasFailed = checkCount >= maxChecks && !isActive;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        {/* Success State */}
        {isActive && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-500" weight="fill" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Pagamento confirmado!</h1>
            <p className="text-muted-foreground mb-6">
              Sua assinatura foi ativada. Redirecionando para a plataforma...
            </p>
            <SpinnerGap className="w-6 h-6 mx-auto text-muted-foreground animate-spin" />
          </>
        )}

        {/* Checking State */}
        {isChecking && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-500/20 flex items-center justify-center">
              <SpinnerGap className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Processando pagamento...</h1>
            <p className="text-muted-foreground mb-6">
              Aguarde enquanto confirmamos seu pagamento. Isso pode levar alguns segundos.
            </p>
            <div className="flex items-center justify-center gap-1">
              {Array.from({ length: maxChecks }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i <= checkCount ? "bg-blue-500" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Failed State */}
        {hasFailed && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Warning className="w-10 h-10 text-amber-500" weight="fill" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Aguardando confirmação</h1>
            <p className="text-muted-foreground mb-6">
              Ainda não recebemos a confirmação do seu pagamento. Se você já efetuou o pagamento,
              aguarde alguns minutos e tente novamente.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => {
                  setCheckCount(0);
                  refetch();
                }}
                className="w-full"
              >
                Verificar novamente
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/plans")}
                className="w-full"
              >
                Voltar aos planos
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
