import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Logo } from "@/components/Logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { 
  User as UserIcon, 
  Gear, 
  CreditCard, 
  Bell, 
  ShieldCheck,
  CaretRight,
  SignOut,
  BookmarkSimple
} from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

const menuItems = [
  {
    icon: BookmarkSimple,
    label: "Conteúdos salvos",
    description: "Artigos e podcasts",
    path: "/profile/saved",
  },
  {
    icon: UserIcon,
    label: "Dados pessoais",
    description: "Nome, email e foto",
    path: "/profile/personal",
  },
  {
    icon: ShieldCheck,
    label: "Senha e segurança",
    description: "Alterar senha",
    path: "/profile/security",
  },
  {
    icon: Bell,
    label: "Preferências de notificação",
    description: "Gerenciar alertas",
    path: "/profile/notifications",
  },
  {
    icon: Gear,
    label: "Configurações",
    description: "App e preferências",
    path: "/profile/settings",
  },
];

export default function Profile() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user) {
      fetchProfile();
    }
  }, [user, authLoading]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Você saiu da sua conta");
    navigate("/");
  };

  const getInitials = (name: string | null) => {
    if (!name) return user?.email?.[0]?.toUpperCase() || "U";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 pt-8">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-8">
        <Logo size="sm" className="mb-4" />
        
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="text-xl bg-secondary">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold">{profile?.full_name || "Usuário"}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </motion.div>

        {/* Subscription Item (Opens Modal) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-2"
        >
          <button 
            onClick={() => setShowSubscriptionModal(true)} 
            className="w-full text-left"
          >
            <Card className="hover:border-muted-foreground/30 transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary">
                    <CreditCard className="w-5 h-5" weight="bold" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">Assinatura</h3>
                    <p className="text-xs text-muted-foreground">
                      Gerenciar plano
                    </p>
                  </div>
                  <CaretRight className="w-4 h-4 text-muted-foreground" weight="bold" />
                </div>
              </CardContent>
            </Card>
          </button>
        </motion.div>

        {/* Menu Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2 mb-8"
        >
          {menuItems.map((item, index) => (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + index * 0.05 }}
            >
              <Link to={item.path}>
                <Card className="hover:border-muted-foreground/30 transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-secondary">
                        <item.icon className="w-5 h-5" weight="bold" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{item.label}</h3>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <CaretRight className="w-4 h-4 text-muted-foreground" weight="bold" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            variant="outline"
            className="w-full"
            onClick={handleLogout}
          >
            <SignOut className="w-4 h-4" weight="bold" />
            Sair da conta
          </Button>
        </motion.div>

        {/* Subscription Modal */}
        <SubscriptionModal 
          isOpen={showSubscriptionModal} 
          onClose={() => setShowSubscriptionModal(false)} 
        />
      </div>
    </AppLayout>
  );
}
