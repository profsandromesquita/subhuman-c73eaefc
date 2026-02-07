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
  const { data: spaces = [], isLoading: loadingSpaces } = useSpaces();
  const { data: subscriptions = {} } = useUserSpaceSubscriptions();
  const toggleMutation = useToggleSpaceSubscription();

  const handleToggleSubscription = (spaceId: string) => {
    if (!user) {
      toast.error("Faça login para se inscrever nos espaços");
      return;
    }

    const isSubscribed = subscriptions[spaceId] || false;
    toggleMutation.mutate({ spaceId, isSubscribed });
  };

  if (loadingSpaces) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 pt-8">
          <div className="mb-6">
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Espaços</h1>
            <Logo size="sm" />
          </div>
          <p className="text-muted-foreground text-sm">
            Escolha os temas que você quer acompanhar
          </p>
        </motion.div>

        {/* Spaces List */}
        <div className="space-y-3">
          {spaces.map((space, index) => {
            const isSubscribed = subscriptions[space.id] || false;
            const isProcessing = toggleMutation.isPending && toggleMutation.variables?.spaceId === space.id;
            const IconComponent = getIconComponent(space.icon);
            
            return (
              <motion.div
                key={space.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index, 4) * 0.03 }}
              >
                <Card className={`transition-all duration-200 ${isSubscribed ? 'border-muted-foreground/30' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl transition-colors ${isSubscribed ? 'bg-foreground' : 'bg-secondary'}`}>
                        <IconComponent className={`w-6 h-6 ${isSubscribed ? 'text-background' : 'text-foreground'}`} weight="bold" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-semibold">{space.name}</h3>
                          {isSubscribed ? (
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleToggleSubscription(space.id)}
                              disabled={isProcessing}
                              className="h-8 w-8 bg-green-500/10 border-green-500/30 text-green-600 hover:bg-green-500/20 hover:text-green-700"
                            >
                              <Check className="w-4 h-4" weight="bold" />
                            </Button>
                          ) : (
                            <Button
                              size="icon"
                              onClick={() => handleToggleSubscription(space.id)}
                              disabled={isProcessing}
                              className="h-8 w-8"
                            >
                              <Plus className="w-4 h-4" weight="bold" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {space.description || 'Sem descrição'}
                        </p>
                      </div>
                    </div>
                    
                    {/* View Space Link */}
                    <Link
                      to={`/spaces/${space.slug}`}
                      className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span>Ver atualizações</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {spaces.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum espaço disponível no momento
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
