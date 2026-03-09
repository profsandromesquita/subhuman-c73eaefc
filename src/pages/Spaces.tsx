import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Logo } from "@/components/Logo";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Check, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { getIconComponent } from "@/components/admin/IconPicker";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useSpaces, useUserSpaceSubscriptions, useToggleSpaceSubscription } from "@/hooks/useSpaces";
import { toast } from "sonner";

export default function Spaces() {
  const { user } = useAuth();
  const { data: spaces = [], isLoading } = useSpaces();
  const { data: subscriptions = {} } = useUserSpaceSubscriptions();
  const toggleMutation = useToggleSpaceSubscription();

  const handleToggle = (spaceId: string) => {
    if (!user) { toast.error("Faça login para se inscrever nos espaços"); return; }
    toggleMutation.mutate({ spaceId, isSubscribed: subscriptions[spaceId] || false });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="px-4 pt-5 pb-28 lg:px-10 lg:pt-8">
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-56 mb-8" />
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-[100px] w-full rounded-2xl" />)}</div>
        </div>
      </AppLayout>
    );
  }

  const subscribedSpaces = spaces.filter(s => subscriptions[s.id]);
  const availableSpaces = spaces.filter(s => !subscriptions[s.id]);

  const renderCard = (space: typeof spaces[0], index: number) => {
    const isSubscribed = subscriptions[space.id] || false;
    const isProcessing = toggleMutation.isPending && toggleMutation.variables?.spaceId === space.id;
    const Icon = getIconComponent(space.icon);

    return (
      <motion.div key={space.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 4) * 0.04 }} className="lg:h-full">
        <div className={`rounded-2xl border bg-card transition-all duration-200 lg:h-full lg:flex lg:flex-col ${isSubscribed ? "border-border" : "border-border/60"}`}>
          <div className="p-4 lg:p-5 lg:flex-1 lg:flex lg:flex-col">
            <div className="flex items-start gap-4 lg:flex-1">
              <div className={`p-3 rounded-xl shrink-0 transition-colors ${isSubscribed ? "bg-foreground" : "bg-secondary"}`}>
                <Icon className={`w-5 h-5 ${isSubscribed ? "text-background" : "text-foreground"}`} weight="bold" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-semibold truncate">{space.name}</h3>
                  <Button
                    size="icon"
                    variant={isSubscribed ? "outline" : "default"}
                    onClick={() => handleToggle(space.id)}
                    disabled={isProcessing}
                    className={`h-8 w-8 shrink-0 rounded-xl ${isSubscribed ? "bg-green-500/10 border-green-500/30 text-green-600 hover:bg-green-500/20" : ""}`}
                  >
                    {isSubscribed ? <Check className="w-4 h-4" weight="bold" /> : <Plus className="w-4 h-4" weight="bold" />}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{space.description || "Sem descrição"}</p>
              </div>
            </div>
            <Link
              to={`/spaces/${space.slug}`}
              className="mt-4 pt-3.5 border-t border-border/50 flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors lg:mt-auto"
            >
              <span>Ver publicações</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <AppLayout>
      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="font-semibold">Espaços</h1>
          <Logo size="sm" />
        </div>
      </div>

      <div className="px-4 pt-5 pb-28 lg:px-10 lg:pt-8 lg:pb-10">
        {/* Desktop title */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="hidden lg:block mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Espaços</h1>
          <p className="text-muted-foreground mt-1">Escolha os temas que você quer acompanhar</p>
        </motion.div>

        {/* Mobile subtitle */}
        <p className="text-sm text-muted-foreground mb-5 lg:hidden">Escolha os temas que você quer acompanhar</p>

        {spaces.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">Nenhum espaço disponível no momento</div>
        ) : (
          <div className="space-y-8">
            {subscribedSpaces.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Seus espaços</h2>
                <div className="lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 space-y-3 lg:space-y-0">
                  {subscribedSpaces.map((s, i) => renderCard(s, i))}
                </div>
              </section>
            )}
            {availableSpaces.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Explorar</h2>
                <div className="lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 space-y-3 lg:space-y-0">
                  {availableSpaces.map((s, i) => renderCard(s, i))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
