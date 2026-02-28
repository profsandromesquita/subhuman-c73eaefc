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
import { LandingFooter } from "@/components/landing/LandingFooter";
import { GradientOrbs } from "@/components/landing/GradientOrbs";
import { StickyBottomCTA } from "@/components/landing/StickyBottomCTA";
import { ShaderBackground } from "@/components/landing/ShaderBackground";

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
      navigate('/home', { replace: true });
    }
  }, [user, authLoading, status, subLoading, navigate]);

  // Don't block rendering for auth - render landing immediately
  // Redirect will happen in background when auth resolves

  return (
    <div className="min-h-screen bg-background overflow-x-hidden relative">
      <ShaderBackground />
      <GradientOrbs />
      <LandingHero />
      <LandingSocialProof />
      <LandingProblem />
      <LandingSpaces />
      <LandingFeatures />
      <LandingEvents />
      <LandingMethod />
      <LandingAuthor />
      <LandingFAQ />
      <div id="landing-cta-final">
        <LandingCTA />
      </div>
      <LandingFooter />
      <StickyBottomCTA />
    </div>
  );
}
