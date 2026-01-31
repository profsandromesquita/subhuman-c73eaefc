import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Bell, Envelope } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface NotificationSettings {
  notify_space_updates: boolean;
  notify_comments: boolean;
  notify_mentions: boolean;
  notify_announcements: boolean;
  notify_weekly_email: boolean;
}

export default function NotificationPreferences() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState<NotificationSettings>({
    notify_space_updates: true,
    notify_comments: true,
    notify_mentions: true,
    notify_announcements: true,
    notify_weekly_email: false,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user) {
      fetchSettings();
    }
  }, [user, authLoading, navigate]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('notify_space_updates, notify_comments, notify_mentions, notify_announcements, notify_weekly_email')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          notify_space_updates: data.notify_space_updates ?? true,
          notify_comments: data.notify_comments ?? true,
          notify_mentions: data.notify_mentions ?? true,
          notify_announcements: data.notify_announcements ?? true,
          notify_weekly_email: data.notify_weekly_email ?? false,
        });
      }
    } catch (error) {
      console.error("Error fetching notification settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof NotificationSettings) => {
    if (!user) return;

    const newValue = !settings[key];
    const previousSettings = { ...settings };
    
    // Optimistic update
    setSettings(prev => ({ ...prev, [key]: newValue }));
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [key]: newValue })
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success("Preferência atualizada");
    } catch (error) {
      console.error("Error updating notification setting:", error);
      toast.error("Erro ao atualizar preferência");
      // Rollback on error
      setSettings(previousSettings);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  const pushNotifications = [
    {
      key: "notify_space_updates" as const,
      label: "Atualizações de Espaços",
      description: "Novos posts nos espaços que você segue",
    },
    {
      key: "notify_comments" as const,
      label: "Comentários",
      description: "Quando alguém responde seus posts",
    },
    {
      key: "notify_mentions" as const,
      label: "Menções",
      description: "Quando você é mencionado",
    },
    {
      key: "notify_announcements" as const,
      label: "Novidades do Subhumano",
      description: "Anúncios e novos recursos",
    },
  ];

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
          <h1 className="text-xl font-bold">Notificações</h1>
        </motion.div>

        {/* Push Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-4">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-secondary">
                  <Bell className="h-5 w-5" weight="bold" />
                </div>
                <h2 className="font-semibold">Push notifications</h2>
              </div>

              <div className="space-y-4">
                {pushNotifications.map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch
                      checked={settings[item.key]}
                      onCheckedChange={() => handleToggle(item.key)}
                      disabled={saving}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Email */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-secondary">
                  <Envelope className="h-5 w-5" weight="bold" />
                </div>
                <h2 className="font-semibold">Email</h2>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Resumo semanal</p>
                  <p className="text-xs text-muted-foreground">Resumo das principais atualizações da semana</p>
                </div>
                <Switch
                  checked={settings.notify_weekly_email}
                  onCheckedChange={() => handleToggle("notify_weekly_email")}
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
