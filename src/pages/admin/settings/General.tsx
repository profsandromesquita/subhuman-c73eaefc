import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { THEME_OPTIONS, type ThemeSlug } from '@/hooks/useTheme';

interface AppSettings {
  app_name: string;
  app_description: string;
  support_email: string;
  maintenance_mode: boolean;
  active_theme: ThemeSlug;
}

export default function GeneralSettings() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<AppSettings>({
    app_name: 'Subhumano',
    app_description: 'Comunidade de desenvolvimento pessoal',
    support_email: '',
    maintenance_mode: false,
    active_theme: 'default',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value');

      if (data) {
        const settingsMap = data.reduce((acc, item) => {
          acc[item.key] = item.value;
          return acc;
        }, {} as Record<string, any>);

        setSettings({
          app_name: settingsMap.app_name || 'Subhumano',
          app_description: settingsMap.app_description || 'Comunidade de desenvolvimento pessoal',
          support_email: settingsMap.support_email || '',
          maintenance_mode: settingsMap.maintenance_mode || false,
          active_theme: settingsMap.active_theme || 'default',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsToSave = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
      }));

      for (const setting of settingsToSave) {
        await supabase
          .from('app_settings')
          .upsert(
            { key: setting.key, value: setting.value },
            { onConflict: 'key' }
          );
      }

      // Invalidate theme cache so it applies immediately
      await queryClient.invalidateQueries({ queryKey: ['app-theme'] });

      toast.success('Configurações salvas!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Configurações Gerais
          </h1>
          <p className="text-muted-foreground">
            Configure as informações básicas do aplicativo
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Nome do Aplicativo
            </label>
            <Input
              value={settings.app_name}
              onChange={(e) =>
                setSettings({ ...settings, app_name: e.target.value })
              }
              placeholder="Subhumano"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Descrição
            </label>
            <Textarea
              value={settings.app_description}
              onChange={(e) =>
                setSettings({ ...settings, app_description: e.target.value })
              }
              placeholder="Descrição do aplicativo"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Email de Suporte
            </label>
            <Input
              type="email"
              value={settings.support_email}
              onChange={(e) =>
                setSettings({ ...settings, support_email: e.target.value })
              }
              placeholder="suporte@exemplo.com"
            />
          </div>

          <div className="pt-4 border-t border-border">
            <Button
              onClick={handleSave}
              disabled={saving || loading}
              variant="glow"
            >
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </div>

        {/* Theme Selector */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Tema Sazonal
            </h2>
            <p className="text-sm text-muted-foreground">
              Altere a identidade visual da plataforma para campanhas sazonais
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Tema Ativo
            </label>
            <Select
              value={settings.active_theme}
              onValueChange={(value: ThemeSlug) =>
                setSettings({ ...settings, active_theme: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um tema" />
              </SelectTrigger>
              <SelectContent>
                {THEME_OPTIONS.map((theme) => (
                  <SelectItem key={theme.value} value={theme.value}>
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-block w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: theme.accent }}
                      />
                      <span>{theme.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Preview */}
            {settings.active_theme !== 'default' && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <span
                  className="w-8 h-8 rounded-lg"
                  style={{
                    backgroundColor: THEME_OPTIONS.find(
                      (t) => t.value === settings.active_theme
                    )?.accent,
                  }}
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {THEME_OPTIONS.find((t) => t.value === settings.active_theme)?.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Salve para aplicar em toda a plataforma
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AdminLayout>
  );
}
