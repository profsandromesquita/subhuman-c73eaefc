import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
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
      <main className={showNav ? "pb-20" : ""}>
        {children}
      </main>
      {showNav && <BottomNav />}
      {status === 'trial' && daysRemaining !== null && (
        <TrialBanner daysRemaining={daysRemaining} />
      )}
    </div>
  );
}
