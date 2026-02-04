import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Logo } from "@/components/Logo";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Bell, 
  TrendUp, 
  ChatCircle, 
  Megaphone,
  Check,
  IconProps
} from "@phosphor-icons/react";
import { ForwardRefExoticComponent, RefAttributes } from "react";
import { useNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type PhosphorIcon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

const iconMap: Record<string, PhosphorIcon> = {
  update: Bell,
  channel: ChatCircle,
  announcement: Megaphone,
  trending: TrendUp,
  info: Bell,
};

export default function Notifications() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const markRead = useMarkNotificationRead();

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: false, locale: ptBR });
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead.mutateAsync();
      toast.success("Todas as notificações foram marcadas como lidas");
    } catch {
      toast.error("Erro ao marcar notificações");
    }
  };

  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    // Mark as read if not already
    if (!notification.is_read) {
      try {
        await markRead.mutateAsync(notification.id);
      } catch {
        // Ignore errors
      }
    }

    // Navigate based on type
    if (notification.type === "update" && notification.space_slug) {
      navigate(`/spaces/${notification.space_slug}`);
    } else if (notification.type === "update" && notification.space_id) {
      navigate(`/spaces`);
    } else if (notification.type === "channel") {
      navigate(`/canais`);
    }
  };

  if (authLoading || isLoading) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 pt-8">
          <div className="mb-6">
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 pt-8 text-center">
          <p className="text-muted-foreground mb-4">
            Faça login para ver suas notificações
          </p>
        </div>
      </AppLayout>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-8">
        <Logo size="sm" className="mb-4" />
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-2xl font-bold mb-1">Notificações</h1>
            <p className="text-muted-foreground text-sm">
              {unreadCount > 0 
                ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}`
                : 'Fique por dentro de tudo'
              }
            </p>
          </div>
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Check className="w-4 h-4" weight="bold" />
              Marcar todas
            </button>
          )}
        </motion.div>

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Nenhuma notificação ainda
              </p>
            </motion.div>
          ) : (
            notifications.map((notification, index) => {
              const Icon = iconMap[notification.type] || Bell;
              
              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    onClick={() => handleNotificationClick(notification)}
                    className={`transition-all duration-200 cursor-pointer hover:border-muted-foreground/30 ${
                      !notification.is_read ? 'border-l-2 border-l-foreground' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${!notification.is_read ? 'bg-foreground' : 'bg-secondary'}`}>
                          <Icon className={`w-4 h-4 ${!notification.is_read ? 'text-background' : 'text-foreground'}`} weight="bold" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-sm font-medium mb-0.5 ${notification.is_read ? 'text-muted-foreground' : ''}`}>
                            {notification.title}
                          </h3>
                          {notification.message && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {notification.message}
                            </p>
                          )}
                          <span className="text-xs text-muted-foreground mt-1 block">
                            {formatTime(notification.created_at)}
                          </span>
                        </div>
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-foreground" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
