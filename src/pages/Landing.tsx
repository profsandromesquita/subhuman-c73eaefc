import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingSocialProof } from "@/components/landing/LandingSocialProof";
import { LandingProblem } from "@/components/landing/LandingProblem";
import { LandingSpaces } from "@/components/landing/LandingSpaces";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingEvents } from "@/components/landing/LandingEvents";
import { LandingMethod } from "@/components/landing/LandingMethod";
import { LandingAuthor } from "@/components/landing/LandingAuthor";
import { LandingFAQ } from "@/components/landing/LandingFAQ";
import { LandingCTA } from "@/components/landing/LandingCTA";
import { LiveStatsSection } from "@/components/landing/LiveStatsSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { GradientOrbs } from "@/components/landing/GradientOrbs";
import { StickyBottomCTA } from "@/components/landing/StickyBottomCTA";
import { ShaderBackground } from "@/components/landing/ShaderBackground";
import { DottedSurface } from "@/components/ui/dotted-surface";
import { SEO } from "@/components/SEO";

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
      const returnTo = sessionStorage.getItem('returnTo');
      if (returnTo) {
        sessionStorage.removeItem('returnTo');
        navigate(returnTo, { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    }
  }, [user, authLoading, status, subLoading, navigate]);

  // Don't block rendering for auth - render landing immediately
  // Redirect will happen in background when auth resolves

  return (
    <div className="min-h-screen bg-background overflow-x-hidden relative">
      <SEO
        title="Subhumano — Assuma o Comando da IA Sem Perder Seu Tempo"
        description="Curadoria de inteligência artificial validada por especialistas. Notícias, ferramentas, comunidade e podcast para profissionais que precisam de foco, não de ruído."
        path="/"
      />
      <ShaderBackground />
      <DottedSurface
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          maskImage: 'linear-gradient(to top, black 0%, transparent 65%)',
          WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 65%)',
        }}
      />
      <GradientOrbs />
      <div className="relative z-[2]">
        <LandingHero />
        <LandingSocialProof />
        <LandingProblem />
        <LandingSpaces />
        <LandingFeatures />
        <LandingEvents />
        <LandingMethod />
        <LandingAuthor />
        <LiveStatsSection />
        <LandingFAQ />
        <div id="landing-cta-final">
          <LandingCTA />
        </div>
        <LandingFooter />
      </div>
      <StickyBottomCTA />
    </div>
  );
}
