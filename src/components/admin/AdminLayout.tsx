import { ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border flex items-center px-4 gap-4">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Painel Administrativo
            </span>
          </header>
          <div className="flex-1 p-6 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
