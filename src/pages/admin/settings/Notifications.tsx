import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DataTable } from '@/components/admin/DataTable';
import { Bell, PaperPlaneTilt, DeviceMobile, Check } from '@phosphor-icons/react';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  space_id: string | null;
  created_at: string;
  space_name?: string;
}

interface Space {
  id: string;
  name: string;
}

export default function NotificationSettings() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pushStats, setPushStats] = useState({ total: 0, unique: 0 });
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    space_id: 'all',
    type: 'info',
    sendPush: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch spaces
      const { data: spacesData } = await supabase
        .from('spaces')
        .select('id, name')
        .eq('is_active', true);
      setSpaces(spacesData || []);

      // Fetch push subscription stats
      const { count: totalSubs } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true });

      const { data: uniqueUsers } = await supabase
        .from('push_subscriptions')
        .select('user_id');
      
      const uniqueUserIds = new Set(uniqueUsers?.map(u => u.user_id) || []);
      setPushStats({ total: totalSubs || 0, unique: uniqueUserIds.size });

      // Fetch recent notifications (broadcast ones - no user_id)
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .is('user_id', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const notificationsWithSpaces = (data || []).map(n => ({
        ...n,
        space_name: n.space_id
          ? spacesData?.find(s => s.id === n.space_id)?.name || 'Desconhecido'
          : 'Todos'
      }));

      setNotifications(notificationsWithSpaces);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!formData.title.trim()) {
      toast.error('Informe o título da notificação');
      return;
    }

    setSending(true);
    try {
      // Inserir notificação no banco
      const { error } = await supabase.from('notifications').insert({
        title: formData.title,
        message: formData.message || null,
        type: formData.type,
        space_id: formData.space_id === 'all' ? null : formData.space_id,
        user_id: null // Broadcast notification
      });

      if (error) throw error;

      // Enviar push notification se habilitado
      if (formData.sendPush) {
        try {
          const pushPayload: Record<string, unknown> = {
            title: formData.title,
            body: formData.message || undefined,
            url: '/'
          };

          if (formData.space_id !== 'all') {
            pushPayload.spaceId = formData.space_id;
          } else {
            pushPayload.broadcast = true;
          }

          const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
            body: pushPayload
          });

          if (pushError) {
            console.error('Push notification error:', pushError);
            toast.warning('Notificação salva, mas push falhou');
          } else {
            toast.success('Notificação enviada com push!');
          }
        } catch (pushErr) {
          console.error('Push error:', pushErr);
          toast.warning('Notificação salva, mas push falhou');
        }
      } else {
        toast.success('Notificação enviada!');
      }

      setFormData({ title: '', message: '', space_id: 'all', type: 'info', sendPush: true });
      fetchData();
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Erro ao enviar notificação');
    } finally {
      setSending(false);
    }
  };

  const columns = [
    {
      key: 'title',
      header: 'Título',
      render: (item: Notification) => (
        <div>
          <p className="font-medium text-foreground">{item.title}</p>
          {item.message && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {item.message}
            </p>
          )}
        </div>
      )
    },
    {
      key: 'space',
      header: 'Espaço',
      render: (item: Notification) => (
        <span className="text-muted-foreground">{item.space_name}</span>
      )
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (item: Notification) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            item.type === 'info'
              ? 'bg-blue-500/20 text-blue-500'
              : item.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-500'
              : item.type === 'warning'
              ? 'bg-amber-500/20 text-amber-500'
              : 'bg-red-500/20 text-red-500'
          }`}
        >
          {item.type}
        </span>
      )
    },
    {
      key: 'created_at',
      header: 'Enviado em',
      render: (item: Notification) => (
        <span className="text-muted-foreground">
          {new Date(item.created_at).toLocaleString('pt-BR')}
        </span>
      )
    }
  ];

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
          <p className="text-muted-foreground">
            Envie notificações push para os usuários
          </p>
        </div>

        {/* Push Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DeviceMobile className="w-5 h-5 text-primary" weight="fill" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pushStats.total}</p>
                <p className="text-xs text-muted-foreground">Dispositivos com push</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Check className="w-5 h-5 text-green-500" weight="bold" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pushStats.unique}</p>
                <p className="text-xs text-muted-foreground">Usuários ativos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Send Notification Form */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-foreground" />
            <h2 className="text-lg font-semibold text-foreground">
              Nova Notificação
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Título *
              </label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Novo conteúdo disponível!"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Espaço
              </label>
              <Select
                value={formData.space_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, space_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os espaços</SelectItem>
                  {spaces.map((space) => (
                    <SelectItem key={space.id} value={space.id}>
                      {space.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Mensagem (opcional)
            </label>
            <Textarea
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              placeholder="Confira o novo conteúdo exclusivo..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Tipo
            </label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="warning">Aviso</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Push notification toggle */}
          <div className="flex items-center gap-3 pt-2">
            <Switch
              id="sendPush"
              checked={formData.sendPush}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, sendPush: checked })
              }
            />
            <Label htmlFor="sendPush" className="text-sm cursor-pointer">
              Enviar também como push notification
              <span className="text-xs text-muted-foreground ml-2">
                ({pushStats.total} dispositivos)
              </span>
            </Label>
          </div>

          <Button onClick={handleSend} disabled={sending} variant="glow">
            <PaperPlaneTilt className="w-4 h-4 mr-2" />
            {sending ? 'Enviando...' : 'Enviar Notificação'}
          </Button>
        </div>

        {/* History */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Histórico de Envios
          </h2>
          <DataTable
            columns={columns}
            data={notifications}
            loading={loading}
            emptyMessage="Nenhuma notificação enviada"
          />
        </div>
      </motion.div>
    </AdminLayout>
  );
}
