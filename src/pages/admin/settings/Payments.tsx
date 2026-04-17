import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  CreditCard,
  Check,
  Warning,
  Copy,
  Eye,
  EyeSlash
} from '@phosphor-icons/react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentIntegration {
  id: string;
  provider: string;
  is_active: boolean;
  config: Record<string, any> | null;
  webhook_secret: string | null;
}

export default function PaymentSettings() {
  const [integrations, setIntegrations] = useState<PaymentIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_integrations')
        .select('*');

      if (error) throw error;

      // If no integrations exist, create defaults
      if (!data || data.length === 0) {
        await supabase.from('payment_integrations').insert([
          { provider: 'stripe', is_active: false, config: {} },
          { provider: 'ticto', is_active: false, config: {} }
        ]);
        fetchIntegrations();
        return;
      }

      const mappedData: PaymentIntegration[] = data.map(item => ({
        id: item.id,
        provider: item.provider,
        is_active: item.is_active,
        config: typeof item.config === 'object' && item.config !== null ? item.config as Record<string, any> : {},
        webhook_secret: item.webhook_secret
      }));

      setIntegrations(mappedData);

      // Initialize form data
      const initialFormData: Record<string, any> = {};
      mappedData.forEach(integration => {
        initialFormData[integration.provider] = {
          ...(integration.config || {}),
          is_active: integration.is_active
        };
      });
      setFormData(initialFormData);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (provider: string) => {
    try {
      const integration = integrations.find(i => i.provider === provider);
      if (!integration) return;

      const { is_active, ...config } = formData[provider] || {};

      const { error } = await supabase
        .from('payment_integrations')
        .update({
          is_active: is_active || false,
          config
        })
        .eq('id', integration.id);

      if (error) throw error;
      toast.success(`Configurações do ${provider} salvas!`);
      fetchIntegrations();
    } catch (error) {
      console.error('Error saving integration:', error);
      toast.error('Erro ao salvar configurações');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const webhookUrl = `${SITE_URL}/api/webhooks`;

  const renderIntegrationCard = (
    provider: 'stripe' | 'ticto',
    title: string,
    description: string
  ) => {
    const integration = integrations.find(i => i.provider === provider);
    const isActive = formData[provider]?.is_active || false;
    const showSecret = showSecrets[provider] || false;

    return (
      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">
              <CreditCard className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isActive ? (
              <span className="flex items-center gap-1 text-sm text-emerald-500">
                <Check className="w-4 h-4" />
                Ativo
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Warning className="w-4 h-4" />
                Inativo
              </span>
            )}
            <Switch
              checked={isActive}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  [provider]: { ...formData[provider], is_active: checked }
                })
              }
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              {provider === 'stripe' ? 'Secret Key' : 'API Key'}
            </label>
            <div className="relative">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={formData[provider]?.api_key || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    [provider]: { ...formData[provider], api_key: e.target.value }
                  })
                }
                placeholder={
                  provider === 'stripe' ? 'sk_live_...' : 'Sua API Key'
                }
              />
              <button
                type="button"
                onClick={() =>
                  setShowSecrets({ ...showSecrets, [provider]: !showSecret })
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? (
                  <EyeSlash className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {provider === 'stripe' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Publishable Key
              </label>
              <Input
                value={formData[provider]?.publishable_key || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    [provider]: {
                      ...formData[provider],
                      publishable_key: e.target.value
                    }
                  })
                }
                placeholder="pk_live_..."
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Webhook URL
            </label>
            <div className="flex gap-2">
              <Input
                value={`${webhookUrl}/${provider}`}
                readOnly
                className="bg-secondary"
              />
              <Button
                variant="secondary"
                size="icon"
                onClick={() => copyToClipboard(`${webhookUrl}/${provider}`)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure esta URL no painel do {title}
            </p>
          </div>

          <Button onClick={() => handleSave(provider)} variant="secondary">
            Salvar Configurações
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pagamentos</h1>
          <p className="text-muted-foreground">
            Configure integrações de pagamento
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {renderIntegrationCard(
            'stripe',
            'Stripe',
            'Processar pagamentos com cartão de crédito'
          )}
          {renderIntegrationCard(
            'ticto',
            'Ticto',
            'Processar pagamentos via Pix e boleto'
          )}
        </div>

        <div className="bg-secondary/50 border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Nota:</strong> As chaves de API são armazenadas de forma
            segura. Para configurações avançadas como webhooks e testes, acesse
            diretamente o painel de cada provedor.
          </p>
        </div>
      </motion.div>
    </AdminLayout>
  );
}
