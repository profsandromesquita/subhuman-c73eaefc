import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AppSettings {
  app_name: string;
  app_description: string;
  support_email: string;
  maintenance_mode: boolean;
}

export default function GeneralSettings() {
  const [settings, setSettings] = useState<AppSettings>({
    app_name: 'Subhumano',
    app_description: 'Comunidade de desenvolvimento pessoal',
    support_email: '',
    maintenance_mode: false
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
          maintenance_mode: settingsMap.maintenance_mode || false
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
        value
      }));

      for (const setting of settingsToSave) {
        await supabase
          .from('app_settings')
          .upsert(
            { key: setting.key, value: setting.value },
            { onConflict: 'key' }
          );
      }

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
      </motion.div>
    </AdminLayout>
  );
}
