import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DataTable } from '@/components/admin/DataTable';
import { Bell, PaperPlaneTilt, DeviceMobile, Check, Users, EnvelopeSimple } from '@phosphor-icons/react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  space_id: string | null;
  created_at: string;
  space_name?: string;
  user_id?: string | null;
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
  const [adminId, setAdminId] = useState<string | null>(null);
  const [recipientCount, setRecipientCount] = useState({ users: 0, devices: 0 });
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    space_id: 'all',
    type: 'info',
    sendPush: true,
    sendEmail: false,
  });

  useEffect(() => {
    const getAdmin = async () => {
      const { data } = await supabase.auth.getUser();
      setAdminId(data.user?.id || null);
    };
    getAdmin();
  }, []);

  useEffect(() => {
    if (adminId) fetchData();
  }, [adminId]);

  // Recipient count effect
  useEffect(() => {
    const fetchRecipientCount = async () => {
      try {
        if (formData.space_id === 'all') {
          const { count: userCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

          const { count: deviceCount } = await supabase
            .from('push_subscriptions')
            .select('*', { count: 'exact', head: true });

          setRecipientCount({ users: userCount || 0, devices: deviceCount || 0 });
        } else {
          const { data: spaceUsers, count: userCount } = await supabase
            .from('user_space_subscriptions')
            .select('user_id', { count: 'exact' })
            .eq('space_id', formData.space_id);

          const userIds = spaceUsers?.map(u => u.user_id) || [];

          let deviceCount = 0;
          if (userIds.length > 0) {
            const { count } = await supabase
              .from('push_subscriptions')
              .select('*', { count: 'exact', head: true })
              .in('user_id', userIds);
            deviceCount = count || 0;
          }

          setRecipientCount({ users: userCount || 0, devices: deviceCount });
        }
      } catch (error) {
        console.error('Error fetching recipient count:', error);
      }
    };

    fetchRecipientCount();
  }, [formData.space_id]);

  const selectedSpaceName = useMemo(() => {
    if (formData.space_id === 'all') return null;
    return spaces.find(s => s.id === formData.space_id)?.name || null;
  }, [formData.space_id, spaces]);

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

      // Fetch recent notifications (broadcast OR sent by this admin)
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (adminId) {
        query = query.or(`user_id.is.null,sender_id.eq.${adminId}`);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Deduplicate by grouping space-targeted notifications
      const seen = new Map<string, Notification>();
      for (const n of data || []) {
        if (n.user_id && n.space_id && n.sender_id) {
          const timeKey = new Date(n.created_at).toISOString().slice(0, 16);
          const groupKey = `${n.title}|${n.space_id}|${timeKey}`;
          if (!seen.has(groupKey)) {
            seen.set(groupKey, {
              ...n,
              space_name: n.space_id
                ? spacesData?.find(s => s.id === n.space_id)?.name || 'Desconhecido'
                : 'Todos'
            });
          }
        } else {
          seen.set(n.id, {
            ...n,
            space_name: n.space_id
              ? spacesData?.find(s => s.id === n.space_id)?.name || 'Desconhecido'
              : 'Todos'
          });
        }
      }

      setNotifications(Array.from(seen.values()));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendClick = () => {
    if (!formData.title.trim()) {
      toast.error('Informe o título da notificação');
      return;
    }
    if (formData.sendEmail && recipientCount.users > 10) {
      setShowEmailConfirm(true);
    } else {
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!formData.title.trim()) {
      toast.error('Informe o título da notificação');
      return;
    }

    setSending(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData.user?.id;

      // Collect subscribers for space-specific targeting (shared between in-app and email)
      let subscribers: { user_id: string }[] | null = null;

      if (formData.space_id === 'all') {
        // Broadcast: INSERT with user_id = null
        const { error } = await supabase.from('notifications').insert({
          title: formData.title,
          message: formData.message || null,
          type: formData.type,
          space_id: null,
          user_id: null,
          sender_id: currentUserId || null
        });
        if (error) throw error;
      } else {
        // Space-specific: fetch subscribers and insert individual notifications
        const { data: subs, error: subError } = await supabase
          .from('user_space_subscriptions')
          .select('user_id')
          .eq('space_id', formData.space_id);

        if (subError) throw subError;

        if (!subs || subs.length === 0) {
          toast.warning('Nenhum usuário inscrito neste espaço');
          setSending(false);
          return;
        }

        subscribers = subs;

        const notificationRecords = subs.map(sub => ({
          title: formData.title,
          message: formData.message || null,
          type: formData.type,
          space_id: formData.space_id,
          user_id: sub.user_id,
          sender_id: currentUserId || null
        }));

        const { error } = await supabase.from('notifications').insert(notificationRecords);
        if (error) throw error;
      }

      // Track channel results
      let pushOk = false;
      let emailOk = false;

      // Send push notification if enabled
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
          } else {
            pushOk = true;
          }
        } catch (pushErr) {
          console.error('Push error:', pushErr);
        }
      }

      // Send email if enabled
      if (formData.sendEmail) {
        try {
          let emailUserIds: string[];

          if (formData.space_id === 'all') {
            const { data: allUsers } = await supabase.from('profiles').select('id');
            emailUserIds = allUsers?.map(u => u.id) || [];
          } else {
            emailUserIds = subscribers?.map(s => s.user_id) || [];
          }

          if (emailUserIds.length > 0) {
            const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-bulk-email', {
              body: {
                user_ids: emailUserIds,
                title: formData.title,
                message: formData.message || null,
              },
            });

            if (emailError) {
              console.error('Bulk email error:', emailError);
            } else {
              const result = emailResult as { sent?: number; failed?: number; errors?: string[] };
              console.log('Bulk email result:', result);
              if (result?.failed && result.failed > 0) {
                toast.warning(`Email: ${result.sent} enviados, ${result.failed} falharam`);
              } else {
                emailOk = true;
              }
            }
          }
        } catch (emailErr) {
          console.error('Email send error:', emailErr);
        }
      }

      // Dynamic toast based on channels used
      const channels: string[] = [];
      if (formData.sendPush && pushOk) channels.push('push');
      if (formData.sendEmail && emailOk) channels.push('email');

      if (formData.sendPush && !pushOk) {
        toast.warning('Notificação salva, mas push falhou');
      } else if (formData.sendEmail && !emailOk && formData.sendEmail) {
        toast.warning('Notificação salva, mas email falhou');
      } else if (channels.length === 2) {
        toast.success('Notificação enviada com push e email!');
      } else if (channels.includes('push')) {
        toast.success('Notificação enviada com push!');
      } else if (channels.includes('email')) {
        toast.success('Notificação enviada com email!');
      } else {
        toast.success('Notificação enviada!');
      }

      setFormData({ title: '', message: '', space_id: 'all', type: 'info', sendPush: true, sendEmail: false });
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
                <p className="text-xs text-muted-foreground">Usuários com push</p>
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

          {/* Email notification toggle */}
          <div className="flex items-center gap-3">
            <Switch
              id="sendEmail"
              checked={formData.sendEmail}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, sendEmail: checked })
              }
            />
            <Label htmlFor="sendEmail" className="text-sm cursor-pointer flex items-center gap-1">
              <EnvelopeSimple className="w-4 h-4" />
              Enviar também por email
              <span className="text-xs text-muted-foreground ml-1">
                ({recipientCount.users} destinatários)
              </span>
            </Label>
          </div>

          {/* Recipient count */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
            <Users className="w-4 h-4" />
            <span>
              Esta notificação será enviada para {recipientCount.users} usuários
              {selectedSpaceName && ` inscritos em ${selectedSpaceName}`}
              {formData.sendPush && ` + push para ${recipientCount.devices} dispositivos`}
              {formData.sendEmail && ` + email para ${recipientCount.users} destinatários`}
            </span>
          </div>

          <Button onClick={handleSendClick} disabled={sending} variant="glow">
            <PaperPlaneTilt className="w-4 h-4 mr-2" />
            {sending ? 'Enviando...' : 'Enviar Notificação'}
          </Button>
        </div>

        {/* Email confirmation dialog */}
        <AlertDialog open={showEmailConfirm} onOpenChange={setShowEmailConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar envio de email em massa</AlertDialogTitle>
              <AlertDialogDescription>
                Você está prestes a enviar email para {recipientCount.users} usuários
                {selectedSpaceName ? ` inscritos em ${selectedSpaceName}` : ''}.
                Deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setShowEmailConfirm(false); handleSend(); }}>
                Confirmar envio
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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