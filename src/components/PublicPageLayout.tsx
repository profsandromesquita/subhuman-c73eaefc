import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { ReactNode } from "react";

interface PublicPageLayoutProps {
  children: ReactNode;
}

export function PublicPageLayout({ children }: PublicPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground pt-safe">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Logo size="sm" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 pb-20">
        {children}
      </main>

      <LandingFooter />
    </div>
  );
}
