import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Logo } from "@/components/Logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import {
  User as UserIcon,
  Gear,
  CreditCard,
  Bell,
  ShieldCheck,
  CaretRight,
  SignOut,
  BookmarkSimple,
  Buildings,
  MagnifyingGlass,
  EnvelopeSimple
} from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import { useState, useEffect, useRef } from "react";
import { useUnreadMessagesCount } from "@/hooks/useMessages";

export default function Profile() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const isLoggingOut = useRef(false);
  const { data: unreadCount } = useUnreadMessagesCount();

  const isCompanyAccount = profile?.account_type === "company";

  useEffect(() => {
    if (isLoggingOut.current) return;
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading]);

  const handleLogout = async () => {
    isLoggingOut.current = true;
    await signOut();
    queryClient.clear();
    toast.success("Você saiu da sua conta");
    navigate("/login");
  };

  const getInitials = (name: string | null) => {
    if (!name) return user?.email?.[0]?.toUpperCase() || "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const menuItems = [
    {
      icon: EnvelopeSimple,
      label: "Mensagens",
      description: "Conversas diretas",
      path: "/messages",
      badge: unreadCount || 0,
    },
    {
      icon: BookmarkSimple,
      label: "Conteúdos salvos",
      description: "Artigos e podcasts",
      path: "/profile/saved",
    },
    {
      icon: isCompanyAccount ? Buildings : UserIcon,
      label: isCompanyAccount ? "Dados da empresa" : "Dados pessoais",
      description: isCompanyAccount ? "CNPJ, site e informações" : "Nome, email e foto",
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

  if (authLoading || profileLoading) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 pt-8 lg:max-w-none lg:px-10">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 lg:max-w-3xl">
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
      <div className="max-w-lg mx-auto px-4 pt-8 pb-28 lg:max-w-none lg:px-10 lg:pt-10 lg:pb-10">
        {/* Desktop title */}
        <div className="hidden lg:block mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Perfil</h1>
          <p className="text-muted-foreground mt-1">Gerencie sua conta e preferências</p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div />
          <Logo size="sm" className="lg:hidden" />
        </div>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8 lg:max-w-3xl"
        >
          <Avatar className="h-16 w-16 lg:h-20 lg:w-20">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="text-xl bg-secondary">
              {getInitials(profile?.full_name ?? null)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold lg:text-2xl">{profile?.full_name || "Usuário"}</h1>
              <Badge variant={isCompanyAccount ? "default" : "secondary"} className="text-[10px] h-5">
                {isCompanyAccount ? "Empresa" : "Pessoal"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </motion.div>

        {/* Subscription Item */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-2 lg:max-w-3xl"
        >
          <button onClick={() => setShowSubscriptionModal(true)} className="w-full text-left">
            <Card className="hover:border-muted-foreground/30 transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary">
                    <CreditCard className="w-5 h-5" weight="bold" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">Assinatura</h3>
                    <p className="text-xs text-muted-foreground">Gerenciar plano</p>
                  </div>
                  <CaretRight className="w-4 h-4 text-muted-foreground" weight="bold" />
                </div>
              </CardContent>
            </Card>
          </button>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.12 }}
          className="mb-2 lg:max-w-3xl"
        >
          <Link to="/search">
            <Card className="hover:border-muted-foreground/30 transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary">
                    <MagnifyingGlass className="w-5 h-5" weight="bold" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">Buscar</h3>
                    <p className="text-xs text-muted-foreground">Pessoas e empresas</p>
                  </div>
                  <CaretRight className="w-4 h-4 text-muted-foreground" weight="bold" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        {/* Menu Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="space-y-2 mb-8 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 lg:max-w-3xl"
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
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-sm">{item.label}</h3>
                          {"badge" in item && (item as any).badge > 0 && (
                            <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                              {(item as any).badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
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
          className="lg:max-w-3xl"
        >
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <SignOut className="w-4 h-4" weight="bold" />
            Sair da conta
          </Button>
        </motion.div>

        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
        />
      </div>
    </AppLayout>
  );
}
