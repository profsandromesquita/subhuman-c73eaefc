import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  ArrowLeft, 
  PaintBrush, 
  Globe, 
  Trash, 
  DownloadSimple,
  CaretRight,
  Warning,
  Info,
  Moon,
  Robot
} from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useQueryClient } from "@tanstack/react-query";

// Dados que serão exportados
const EXPORTED_DATA_INFO = [
  { field: "Email", description: "Seu email de login" },
  { field: "Perfil", description: "Nome, avatar, bio, localização, profissão" },
  { field: "Assinaturas", description: "Planos ativos (trial, mensal, anual)" },
  { field: "Espaços seguidos", description: "Lista dos espaços que você segue" },
];

export default function Settings() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [aiPersonalization, setAiPersonalization] = useState(true);
  const [savingAi, setSavingAi] = useState(false);

  useEffect(() => {
    if (profile) {
      setAiPersonalization(profile.allow_ai_personalization);
    }
  }, [profile]);

  const handleToggleAiPersonalization = async (checked: boolean) => {
    if (!user) return;
    setAiPersonalization(checked);
    setSavingAi(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ allow_ai_personalization: checked } as any)
        .eq("id", user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success(checked ? "Personalização por IA ativada" : "Personalização por IA desativada");
    } catch {
      setAiPersonalization(!checked);
      toast.error("Erro ao salvar preferência");
    } finally {
      setSavingAi(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const handleClearCache = () => {
    // Clear localStorage except auth data
    const authData = localStorage.getItem('sb-akkbfzfjappludgsrwsw-auth-token');
    localStorage.clear();
    if (authData) {
      localStorage.setItem('sb-akkbfzfjappludgsrwsw-auth-token', authData);
    }
    toast.success("Cache limpo com sucesso");
  };

  const handleDownloadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch user profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Fetch user subscriptions
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id);

      // Fetch user space subscriptions with space details
      const { data: spaceSubscriptions } = await supabase
        .from('user_space_subscriptions')
        .select(`
          id,
          subscribed_at,
          space_id,
          spaces (
            name,
            slug,
            description
          )
        `)
        .eq('user_id', user.id);

      const userData = {
        exportInfo: {
          description: "Dados pessoais exportados do Subhumano",
          exportedAt: new Date().toISOString(),
          version: "1.0.0",
        },
        account: {
          email: user.email,
          createdAt: user.created_at,
        },
        profile: profile ? {
          fullName: profile.full_name,
          bio: profile.bio,
          avatarUrl: profile.avatar_url,
          location: {
            city: profile.city,
            state: profile.state,
          },
          professional: {
            occupationType: profile.occupation_type,
            jobTitle: profile.job_title,
            companyName: profile.company_name,
            industry: profile.industry,
          },
          experience: {
            aiExperienceLevel: profile.ai_experience_level,
            goals: profile.goals,
            skills: profile.skills,
            education: profile.education,
          },
          preferences: {
            notifySpaceUpdates: profile.notify_space_updates,
            notifyComments: profile.notify_comments,
            notifyMentions: profile.notify_mentions,
            notifyAnnouncements: profile.notify_announcements,
            notifyDailyEmail: profile.notify_daily_email,
          },
        } : null,
        subscriptions: subscriptions?.map(sub => ({
          planType: sub.plan_type,
          status: sub.status,
          startsAt: sub.starts_at,
          expiresAt: sub.expires_at,
        })) || [],
        followedSpaces: spaceSubscriptions?.map(sub => ({
          spaceName: (sub.spaces as any)?.name,
          spaceSlug: (sub.spaces as any)?.slug,
          subscribedAt: sub.subscribed_at,
        })) || [],
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subhumano-dados-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Dados exportados com sucesso");
    } catch (error) {
      console.error("Error downloading data:", error);
      toast.error("Erro ao exportar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    // Note: Full account deletion requires admin/backend implementation
    // For now, we'll sign the user out and show a message
    toast.info("Para excluir sua conta, entre em contato com o suporte.");
    await signOut();
    navigate("/");
  };

  if (authLoading) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigate("/profile")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Configurações</h1>
        </motion.div>

        {/* Aparência */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-4">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-secondary">
                  <PaintBrush className="h-5 w-5" weight="bold" />
                </div>
                <h2 className="font-semibold">Aparência</h2>
              </div>

              <div className="space-y-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between py-2 cursor-default">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Tema</span>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Moon className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="secondary" className="text-xs">
                            Dark
                          </Badge>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[250px]">
                      <p className="text-xs">
                        O Subhumano é projetado exclusivamente para o modo escuro, 
                        proporcionando a melhor experiência visual e reduzindo o cansaço ocular.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between py-2 cursor-default">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Idioma</span>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="secondary" className="text-xs">
                            Português (BR)
                          </Badge>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[250px]">
                      <p className="text-xs">
                        Atualmente o Subhumano está disponível apenas em Português do Brasil. 
                        Novos idiomas podem ser adicionados no futuro.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Privacidade e IA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="mb-4">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-secondary">
                  <Robot className="h-5 w-5" weight="bold" />
                </div>
                <h2 className="font-semibold">Privacidade e IA</h2>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex-1 pr-4">
                  <span className="text-sm font-medium">Permitir personalização por IA</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Quando ativado, a IA usa seus dados de perfil e histórico de interação para entregar respostas e resultados personalizados.
                  </p>
                </div>
                <Switch
                  checked={aiPersonalization}
                  onCheckedChange={handleToggleAiPersonalization}
                  disabled={savingAi}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Armazenamento */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-4">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-secondary">
                  <Trash className="h-5 w-5" weight="bold" />
                </div>
                <h2 className="font-semibold">Armazenamento</h2>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleClearCache}
                  className="w-full flex items-center justify-between py-2 text-sm hover:bg-secondary/50 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <span>Limpar cache</span>
                  <CaretRight className="h-4 w-4 text-muted-foreground" />
                </button>
                <p className="text-xs text-muted-foreground px-2">
                  Remove dados temporários armazenados localmente. 
                  Sua sessão e preferências serão mantidas.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Conta */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="mb-6">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-secondary">
                  <DownloadSimple className="h-5 w-5" weight="bold" />
                </div>
                <h2 className="font-semibold">Conta</h2>
              </div>

              <div className="space-y-1">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      disabled={loading}
                      className="w-full flex items-center justify-between py-2 text-sm hover:bg-secondary/50 rounded-lg px-2 -mx-2 transition-colors disabled:opacity-50"
                    >
                      <span>{loading ? "Exportando..." : "Baixar meus dados"}</span>
                      <CaretRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Exportar seus dados</AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="space-y-3">
                          <p>Os seguintes dados serão exportados em formato JSON:</p>
                          <ul className="space-y-2">
                            {EXPORTED_DATA_INFO.map((item) => (
                              <li key={item.field} className="flex items-start gap-2 text-sm">
                                <span className="font-medium text-foreground">{item.field}:</span>
                                <span>{item.description}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDownloadData}>
                        Exportar dados
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="w-full flex items-center justify-between py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg px-2 -mx-2 transition-colors">
                      <span>Excluir conta</span>
                      <Warning className="h-4 w-4" weight="bold" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir conta</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Todos os seus dados serão permanentemente excluídos.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Excluir conta
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Version */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-muted-foreground"
        >
          <p>v1.0.0 • subhumano.ia</p>
        </motion.div>
      </div>
    </AppLayout>
  );
}
