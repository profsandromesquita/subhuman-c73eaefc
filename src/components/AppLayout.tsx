import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { DesktopSidebar } from "./DesktopSidebar";
import { TrialBanner } from "./TrialBanner";
import { useSubscription } from "@/hooks/useSubscription";

interface AppLayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export function AppLayout({ children, showNav = true }: AppLayoutProps) {
  const { status, daysRemaining } = useSubscription();
  
  return (
    <div className="min-h-screen bg-background pt-safe">
      {/* Desktop sidebar — hidden on mobile */}
      {showNav && (
        <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-56 lg:flex-col lg:border-r lg:border-border lg:bg-background lg:z-40">
          <DesktopSidebar />
        </aside>
      )}

      {/* Main content */}
      <main className={[
        showNav ? "pb-20 lg:pb-0" : "",
        showNav ? "lg:ml-56" : "",
      ].join(" ")}>
        {children}
      </main>

      {/* BottomNav — mobile only */}
      {showNav && (
        <div className="lg:hidden">
          <BottomNav />
        </div>
      )}

      {status === 'trial' && daysRemaining !== null && (
        <TrialBanner daysRemaining={daysRemaining} />
      )}
    </div>
  );
}
