import { Home, Layers, MessageSquare, Bell, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { icon: Home, label: "Início", path: "/home" },
  { icon: Layers, label: "Espaços", path: "/spaces" },
  { icon: MessageSquare, label: "Canais", path: "/channels" },
  { icon: Bell, label: "Avisos", path: "/notifications" },
  { icon: User, label: "Perfil", path: "/profile" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/80 backdrop-blur-xl safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] transition-all duration-200",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-foreground"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
