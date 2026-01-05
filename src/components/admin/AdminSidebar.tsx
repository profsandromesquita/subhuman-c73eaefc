import {
  ChartLine,
  Users,
  CreditCard,
  Folders,
  Article,
  ChatCircle,
  Shield,
  Gear,
  UserCircleGear,
  Bell,
  Wallet,
  SignOut,
  House
} from '@phosphor-icons/react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const mainNavItems = [
  { title: 'Dashboard', url: '/admin', icon: ChartLine },
  { title: 'Usuários', url: '/admin/users', icon: Users },
  { title: 'Assinaturas', url: '/admin/subscriptions', icon: CreditCard },
];

const contentNavItems = [
  { title: 'Espaços', url: '/admin/spaces', icon: Folders },
  { title: 'Conteúdos', url: '/admin/content', icon: Article },
  { title: 'Canais', url: '/admin/channels', icon: ChatCircle },
  { title: 'Moderação', url: '/admin/moderation', icon: Shield },
];

const settingsNavItems = [
  { title: 'Gerais', url: '/admin/settings/general', icon: Gear },
  { title: 'Usuários do Sistema', url: '/admin/settings/users', icon: UserCircleGear },
  { title: 'Notificações', url: '/admin/settings/notifications', icon: Bell },
  { title: 'Pagamentos', url: '/admin/settings/payments', icon: Wallet },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const renderNavItem = (item: { title: string; url: string; icon: any }) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url}
          end={item.url === '/admin'}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              isActive
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
            )
          }
        >
          <item.icon className="w-5 h-5 flex-shrink-0" weight="regular" />
          {!collapsed && <span>{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar
      className={cn(
        'border-r border-border transition-all duration-300',
        collapsed ? 'w-14' : 'w-60'
      )}
      collapsible="icon"
    >
      <div className="h-14 flex items-center px-4 border-b border-border">
        {!collapsed && (
          <span className="font-semibold text-foreground">Subhumano</span>
        )}
      </div>

      <SidebarContent className="py-4">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Principal
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          {!collapsed && (
            <SidebarGroupLabel className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Conteúdo
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {contentNavItems.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          {!collapsed && (
            <SidebarGroupLabel className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Configurações
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/home"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
              >
                <House className="w-5 h-5 flex-shrink-0" weight="regular" />
                {!collapsed && <span>Voltar ao App</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full"
            >
              <SignOut className="w-5 h-5 flex-shrink-0" weight="regular" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
