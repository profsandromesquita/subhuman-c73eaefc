import { House, SquaresFour, Microphone, Robot, ChatCircle, CalendarBlank, User, Bell, Envelope, BookmarkSimple, TrendUp } from "@phosphor-icons/react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useUnreadNotificationsCount } from "@/hooks/useNotifications";
import { useUnreadMessagesCount } from "@/hooks/useMessages";
import { useSubscription } from "@/hooks/useSubscription";

const navItems = [
  { icon: House, label: "Início", path: "/home" },
  { icon: TrendUp, label: "Destaques", path: "/highlights" },
  { icon: SquaresFour, label: "Espaços", path: "/spaces" },
  { icon: Microphone, label: "Podcast", path: "/podcasts" },
  { icon: Robot, label: "IA", path: "/ai-assistant" },
  { icon: ChatCircle, label: "Canais", path: "/channels" },
  { icon: CalendarBlank, label: "Eventos", path: "/events" },
];

export function DesktopSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const { data: unreadMessages = 0 } = useUnreadMessagesCount();
  const { status, daysRemaining } = useSubscription();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border/40">
        <Link to="/home" className="block">
          <Logo size="sm" />
        </Link>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                active
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground hover:bg-white/6 hover:text-foreground"
              )}
            >
              <item.icon
                className={cn("w-[18px] h-[18px] shrink-0 transition-transform duration-150", !active && "group-hover:scale-110")}
                weight={active ? "fill" : "regular"}
              />
              <span className="flex-1">{item.label}</span>
              {active && <div className="w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />}
            </Link>
          );
        })}

        <div className="pt-3 mt-3 border-t border-white/8 space-y-0.5">
          {[
            {
              path: "/notifications",
              icon: Bell,
              label: "Notificações",
              badge: unreadCount,
              badgeColor: "bg-foreground text-background",
            },
            {
              path: "/messages",
              icon: Envelope,
              label: "Mensagens",
              badge: unreadMessages,
              badgeColor: "bg-blue-500 text-white",
            },
            {
              path: "/profile/saved",
              icon: BookmarkSimple,
              label: "Salvos",
              badge: 0,
              badgeColor: "",
            },
          ].map(({ path, icon: Icon, label, badge, badgeColor }) => {
            const active = isActive(path);
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:bg-white/6 hover:text-foreground"
                )}
              >
                <Icon
                  className={cn("w-[18px] h-[18px] shrink-0 transition-transform duration-150", !active && "group-hover:scale-110")}
                  weight={active ? "fill" : "regular"}
                />
                <span className="flex-1">{label}</span>
                {badge > 0 && (
                  <span className={cn("text-[11px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none", badgeColor)}>
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Trial */}
      {status === "trial" && daysRemaining !== null && (
        <div className="px-3 pb-3">
          <Link
            to="/plans"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 hover:bg-amber-500/15 transition-colors"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="flex-1"><span className="font-bold">{daysRemaining}d</span> restantes no trial</span>
          </Link>
        </div>
      )}

      {/* Profile footer */}
      <div className="px-3 pb-4 border-t border-border/40 pt-3">
        <Link
          to="/profile"
          className={cn(
            "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
            isActive("/profile") && !isActive("/profile/saved")
              ? "bg-white/10 text-foreground"
              : "text-muted-foreground hover:bg-white/6 hover:text-foreground"
          )}
        >
          <Avatar className="w-7 h-7 shrink-0 ring-1 ring-border/50 group-hover:ring-border transition-all">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="text-[10px] bg-secondary">
              <User className="w-3.5 h-3.5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium leading-none">{profile?.full_name || "Perfil"}</p>
            {user?.email && <p className="truncate text-[11px] text-muted-foreground/60 mt-0.5">{user.email}</p>}
          </div>
        </Link>
      </div>
    </div>
  );
}
