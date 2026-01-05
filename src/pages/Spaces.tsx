import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Check } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getIconComponent } from "@/components/admin/IconPicker";
import { Skeleton } from "@/components/ui/skeleton";

interface Space {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
}

export default function Spaces() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setSpaces(data || []);
    } catch (error) {
      console.error('Error fetching spaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSubscription = (id: string) => {
    setSubscriptions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
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
          <h1 className="text-2xl font-bold mb-1">Espaços</h1>
          <p className="text-muted-foreground text-sm">
            Escolha os temas que você quer acompanhar
          </p>
        </motion.div>

        {/* Spaces List */}
        <div className="space-y-3">
          {spaces.map((space, index) => {
            const isSubscribed = subscriptions[space.id] || false;
            const IconComponent = getIconComponent(space.icon);
            
            return (
              <motion.div
                key={space.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
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
                          <button
                            onClick={() => toggleSubscription(space.id)}
                            className={`p-1.5 rounded-lg transition-all duration-200 ${
                              isSubscribed 
                                ? 'bg-foreground text-background' 
                                : 'bg-secondary hover:bg-surface-hover'
                            }`}
                          >
                            {isSubscribed ? (
                              <Check className="w-4 h-4" weight="bold" />
                            ) : (
                              <ArrowRight className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {space.description || 'Sem descrição'}
                        </p>
                        <div className="flex items-center gap-3">
                          {isSubscribed && (
                            <span className="text-xs text-foreground bg-secondary px-2 py-0.5 rounded">
                              Inscrito
                            </span>
                          )}
                        </div>
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
