import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingProblem } from "@/components/landing/LandingProblem";
import { LandingSpaces } from "@/components/landing/LandingSpaces";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingMethod } from "@/components/landing/LandingMethod";
import { LandingAuthor } from "@/components/landing/LandingAuthor";
import { LandingFAQ } from "@/components/landing/LandingFAQ";
import { LandingCTA } from "@/components/landing/LandingCTA";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { status, loading: subLoading } = useSubscription();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (authLoading || subLoading) return;
    if (hasRedirected.current) return;
    
    if (user) {
      hasRedirected.current = true;
      if (status === 'trial' || status === 'active') {
        navigate('/home', { replace: true });
      } else {
        navigate('/plans', { replace: true });
      }
    }
  }, [user, authLoading, status, subLoading, navigate]);

  if (authLoading || (user && subLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <LandingHero />
      <LandingProblem />
      <LandingSpaces />
      <LandingFeatures />
      <LandingMethod />
      <LandingAuthor />
      <LandingFAQ />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}
