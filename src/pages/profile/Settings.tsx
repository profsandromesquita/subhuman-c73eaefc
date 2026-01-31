import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  ArrowLeft, 
  PaintBrush, 
  Globe, 
  Trash, 
  DownloadSimple,
  CaretRight,
  Warning
} from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function Settings() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

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

      // Fetch user space subscriptions
      const { data: spaceSubscriptions } = await supabase
        .from('user_space_subscriptions')
        .select('*')
        .eq('user_id', user.id);

      const userData = {
        email: user.email,
        profile,
        subscriptions,
        spaceSubscriptions,
        exportedAt: new Date().toISOString(),
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
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Tema</span>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Dark</span>
                    <CaretRight className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Idioma</span>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    <span>Português (BR)</span>
                    <CaretRight className="h-4 w-4" />
                  </div>
                </div>
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

              <button
                onClick={handleClearCache}
                className="w-full flex items-center justify-between py-2 text-sm hover:bg-secondary/50 rounded-lg px-2 -mx-2 transition-colors"
              >
                <span>Limpar cache</span>
                <CaretRight className="h-4 w-4 text-muted-foreground" />
              </button>
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
                <button
                  onClick={handleDownloadData}
                  disabled={loading}
                  className="w-full flex items-center justify-between py-2 text-sm hover:bg-secondary/50 rounded-lg px-2 -mx-2 transition-colors disabled:opacity-50"
                >
                  <span>{loading ? "Exportando..." : "Baixar meus dados"}</span>
                  <CaretRight className="h-4 w-4 text-muted-foreground" />
                </button>

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
