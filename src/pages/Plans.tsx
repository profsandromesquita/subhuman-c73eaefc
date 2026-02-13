import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ArrowLeft, Gift, Ticket, GraduationCap, CalendarDots, Monitor, MapPin } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { TrialOfferModal } from "@/components/TrialOfferModal";
import { useRedeemCoupon } from "@/hooks/useCoupons";
import { useEvents } from "@/hooks/useEvents";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const subscriptionPlans = [
  {
    id: "monthly",
    name: "Mensal",
    price: "R$ 29,90",
    period: "/mês",
    description: "Ideal para experimentar",
    checkoutUrl: "https://checkout.ticto.app/O1F2F1BB4",
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
    price: "R$ 299,90",
    period: "/ano",
    description: "Economize 17%",
    badge: "Mais popular",
    checkoutUrl: "https://payment.ticto.app/O40A9D8E6",
    features: [
      "Tudo do plano mensal",
      "2 meses grátis",
      "Acesso antecipado a novidades",
      "Badge exclusivo no perfil",
    ],
  },
  {
    id: "lifetime",
    name: "Vitalício",
    price: "R$ 1.000",
    period: "",
    description: "Pague uma vez, acesse para sempre",
    badge: "Melhor custo-benefício",
    checkoutUrl: "https://checkout.ticto.app/LIFETIME_PLACEHOLDER",
    features: [
      "Tudo do plano anual",
      "Acesso vitalício garantido",
      "Todas as futuras atualizações",
      "Suporte prioritário",
    ],
  },
];

export default function Plans() {
  const [selectedPlan, setSelectedPlan] = useState("yearly");
  const [isLoading, setIsLoading] = useState(false);
  const [isTrialLoading, setIsTrialLoading] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { status, loading: subLoading, refetch } = useSubscription();
  const redeemCoupon = useRedeemCoupon();
  const { data: allEvents } = useEvents({ period: "future" });

  // Filter paid future events
  const paidEvents = (allEvents || []).filter((e) => !e.is_free && e.checkout_url);

  const showExpiredMessage = status === 'expired';
  const canStartTrial = status === 'none';
  const backDestination = user ? '/' : '/register';

  const handleBackClick = () => {
    if (canStartTrial) {
      setShowTrialModal(true);
    } else {
      navigate(backDestination);
    }
  };

  const handleSubscribe = () => {
    const plan = subscriptionPlans.find(p => p.id === selectedPlan);
    if (!plan) return;

    const checkoutUrl = new URL(plan.checkoutUrl);
    if (user?.email) checkoutUrl.searchParams.set('email', user.email);
    if (user?.id) checkoutUrl.searchParams.set('src', user.id);
    checkoutUrl.searchParams.set('redirect_url', `${window.location.origin}/payment-success`);
    window.location.href = checkoutUrl.toString();
  };

  const handleEventPurchase = (eventCheckoutUrl: string) => {
    const checkoutUrl = new URL(eventCheckoutUrl);
    if (user?.email) checkoutUrl.searchParams.set('email', user.email);
    if (user?.id) checkoutUrl.searchParams.set('src', user.id);
    checkoutUrl.searchParams.set('redirect_url', `${window.location.origin}/payment-success`);
    window.location.href = checkoutUrl.toString();
  };

  const handleRedeemCoupon = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para resgatar um cupom.");
      navigate("/login");
      return;
    }

    if (!couponCode.trim()) {
      toast.error("Digite o código do cupom");
      return;
    }

    try {
      await redeemCoupon.mutateAsync(couponCode.trim());
      await refetch();
      navigate("/home", { replace: true });
    } catch (error) {
      // Error is already handled by the mutation
    }
  };

  const handleStartTrial = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para iniciar o período de teste.");
      navigate("/login");
      return;
    }

    setIsTrialLoading(true);

    try {
      const { data: existingTrial, error: checkError } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('plan_type', 'trial')
        .limit(1)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingTrial) {
        toast.error("Você já utilizou seu período de teste gratuito.");
        setIsTrialLoading(false);
        return;
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_type: 'trial',
          status: 'active',
          starts_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) throw insertError;

      await refetch();
      toast.success("Período de teste iniciado! Você tem 7 dias de acesso gratuito.");
      setShowTrialModal(false);
      navigate("/home", { replace: true });
    } catch (error) {
      console.error('Error starting trial:', error);
      toast.error("Erro ao iniciar período de teste. Tente novamente.");
    } finally {
      setIsTrialLoading(false);
    }
  };

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

      <div className="relative max-w-lg mx-auto px-6 pt-safe pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center mb-12 mt-6"
        >
          <button
            onClick={handleBackClick}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" weight="bold" />
          </button>
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

          {/* Trial Card */}
          {canStartTrial && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-6"
            >
              <div className="relative p-5 rounded-xl border-2 border-green-500/50 bg-gradient-to-br from-green-500/10 to-green-500/5">
                <div className="absolute -top-3 left-4">
                  <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide bg-green-500 text-white rounded-full">
                    Grátis
                  </span>
                </div>

                <div className="flex items-start gap-4 mt-2">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Gift className="w-6 h-6 text-green-500" weight="fill" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">Teste por 7 dias</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Acesso completo sem cartão de crédito
                    </p>
                    <Button
                      onClick={handleStartTrial}
                      disabled={isTrialLoading}
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold"
                    >
                      {isTrialLoading ? "Iniciando..." : "Começar período gratuito"}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Paid Events Section */}
          {paidEvents.length > 0 && (
            <>
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-sm text-muted-foreground">ou adquira um produto</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {paidEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  className="mb-4"
                >
                  <div className="relative rounded-xl border border-amber-500/30 bg-card overflow-hidden">
                    {/* Cover image */}
                    {event.cover_url && (
                      <img
                        src={event.cover_url}
                        alt={event.title}
                        className="w-full h-40 object-cover"
                      />
                    )}
                    <div className="p-5">
                      <div className="absolute top-3 left-4">
                        <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide bg-amber-500 text-black rounded-full">
                          {event.event_type === "workshop" ? "Workshop" : event.event_type}
                        </span>
                      </div>

                      <div className="flex items-start gap-4 mt-1">
                        {!event.cover_url && (
                          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                            <GraduationCap className="w-6 h-6 text-amber-500" weight="fill" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{event.title}</h3>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {event.description}
                            </p>
                          )}

                          {/* Session dates */}
                          {event.sessions.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {event.sessions.slice(0, 3).map((s) => (
                                <span key={s.id} className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <CalendarDots className="w-3 h-3" />
                                  {format(new Date(s.starts_at), "dd/MM 'às' HH'h'", { locale: ptBR })}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                            {event.modality === "online" ? (
                              <><Monitor className="w-3.5 h-3.5" /> Online</>
                            ) : (
                              <><MapPin className="w-3.5 h-3.5" /> {event.location || event.modality}</>
                            )}
                          </div>

                          <div className="mb-4">
                            <span className="text-2xl font-bold">
                              R$ {Number(event.price).toFixed(2).replace(".", ",")}
                            </span>
                            <span className="text-sm text-muted-foreground ml-1">pagamento único</span>
                          </div>

                          <Button
                            onClick={() => handleEventPurchase(event.checkout_url!)}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                          >
                            Garantir minha vaga
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </>
          )}

          {/* Divider - Subscriptions */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground">ou escolha um plano de assinatura</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Subscription Plans */}
          <div className="space-y-4 mb-8">
            {subscriptionPlans.map((plan, index) => (
              <motion.button
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
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
                        <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded ${
                          plan.id === "lifetime"
                            ? "bg-amber-500 text-black"
                            : "bg-foreground text-background"
                        }`}>
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
                  {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
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

          {/* Coupon Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 p-4 rounded-xl border border-border bg-card/50"
          >
            <div className="flex items-center gap-2 mb-3">
              <Ticket className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Possui um cupom promocional?
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Digite seu cupom"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1"
                maxLength={30}
              />
              <Button
                variant="outline"
                onClick={handleRedeemCoupon}
                disabled={redeemCoupon.isPending || !couponCode.trim()}
              >
                {redeemCoupon.isPending ? "..." : "Resgatar"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Trial Offer Modal */}
      <TrialOfferModal
        isOpen={showTrialModal}
        onClose={() => {
          setShowTrialModal(false);
          navigate(backDestination);
        }}
        onConfirmTrial={handleStartTrial}
        isLoading={isTrialLoading}
      />
    </div>
  );
}
