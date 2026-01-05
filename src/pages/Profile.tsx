import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  User as UserIcon, 
  Settings, 
  CreditCard, 
  Bell, 
  Shield,
  ChevronRight,
  LogOut,
  Crown
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const menuItems = [
  {
    icon: UserIcon,
    label: "Dados pessoais",
    description: "Nome, email e foto",
    path: "/profile/personal",
  },
  {
    icon: Shield,
    label: "Senha e segurança",
    description: "Alterar senha",
    path: "/profile/security",
  },
  {
    icon: CreditCard,
    label: "Assinatura",
    description: "Plano Anual ativo",
    path: "/profile/subscription",
  },
  {
    icon: Bell,
    label: "Preferências de notificação",
    description: "Gerenciar alertas",
    path: "/profile/notifications",
  },
  {
    icon: Settings,
    label: "Configurações",
    description: "App e preferências",
    path: "/profile/settings",
  },
];

export default function Profile() {
  const navigate = useNavigate();

  const handleLogout = () => {
    toast.success("Você saiu da sua conta");
    navigate("/");
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-2xl font-bold">U</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">Usuário</h1>
            <p className="text-sm text-muted-foreground">usuario@email.com</p>
            <div className="flex items-center gap-1 mt-1">
              <Crown className="w-3 h-3 text-foreground" />
              <span className="text-xs font-medium">Plano Anual</span>
            </div>
          </div>
        </motion.div>

        {/* Menu Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2 mb-8"
        >
          {menuItems.map((item, index) => (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + index * 0.05 }}
            >
              <Link to={item.path}>
                <Card className="hover:border-muted-foreground/30 transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-secondary">
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{item.label}</h3>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            variant="outline"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Sair da conta
          </Button>
        </motion.div>
      </div>
    </AppLayout>
  );
}
