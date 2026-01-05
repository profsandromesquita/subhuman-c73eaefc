import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Bell, 
  TrendUp, 
  ChatCircle, 
  Megaphone,
  Check,
  IconProps
} from "@phosphor-icons/react";
import { ForwardRefExoticComponent, RefAttributes } from "react";

type PhosphorIcon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

const notifications = [
  {
    id: 1,
    type: "update",
    title: "Nova atualização em Programação",
    message: "GPT-5 pode ser lançado em breve",
    time: "2 horas atrás",
    read: false,
  },
  {
    id: 2,
    type: "channel",
    title: "Novo comentário no canal Geral",
    message: "João respondeu sua publicação",
    time: "4 horas atrás",
    read: false,
  },
  {
    id: 3,
    type: "announcement",
    title: "Novidade no Subhumano",
    message: "Novo espaço: Finanças com IA está chegando!",
    time: "1 dia atrás",
    read: true,
  },
  {
    id: 4,
    type: "trending",
    title: "Trending em Audiovisual",
    message: "Sora da OpenAI está gerando discussões",
    time: "2 dias atrás",
    read: true,
  },
];

const iconMap: Record<string, PhosphorIcon> = {
  update: Bell,
  channel: ChatCircle,
  announcement: Megaphone,
  trending: TrendUp,
};

export default function Notifications() {
  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-2xl font-bold mb-1">Notificações</h1>
            <p className="text-muted-foreground text-sm">
              Fique por dentro de tudo
            </p>
          </div>
          <button className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <Check className="w-4 h-4" weight="bold" />
            Marcar todas
          </button>
        </motion.div>

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.map((notification, index) => {
            const Icon = iconMap[notification.type];
            
            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className={`transition-all duration-200 cursor-pointer hover:border-muted-foreground/30 ${
                    !notification.read ? 'border-l-2 border-l-foreground' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${!notification.read ? 'bg-foreground' : 'bg-secondary'}`}>
                        <Icon className={`w-4 h-4 ${!notification.read ? 'text-background' : 'text-foreground'}`} weight="bold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm font-medium mb-0.5 ${notification.read ? 'text-muted-foreground' : ''}`}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {notification.message}
                        </p>
                        <span className="text-xs text-muted-foreground mt-1 block">
                          {notification.time}
                        </span>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-foreground" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
