import { useEffect, useRef, ForwardRefExoticComponent, RefAttributes } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ArrowRight, Lightning, ShieldCheck, Sparkle, IconProps } from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

type PhosphorIcon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

const features: { icon: PhosphorIcon; title: string; description: string }[] = [
  {
    icon: Lightning,
    title: "Atualizações em tempo real",
    description: "Receba as novidades de IA antes de todo mundo",
  },
  {
    icon: ShieldCheck,
    title: "Conteúdo exclusivo",
    description: "Análises profundas e tutoriais práticos",
  },
  {
    icon: Sparkle,
    title: "5 espaços temáticos",
    description: "Produtividade, Marketing, Dev, Audiovisual e mais",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { status, loading: subLoading } = useSubscription();
  const hasRedirected = useRef(false);

  // Redirect authenticated users to appropriate page
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

  // Show loading state while checking auth
  if (authLoading || (user && subLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Glow effect */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-foreground/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-lg mx-auto px-6 pt-16 pb-12">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <Logo size="xl" />
        </motion.div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="text-4xl sm:text-5xl font-bold leading-[1.1] tracking-tight mb-4">
            O futuro da IA,
            <br />
            <span className="text-muted-foreground">direto no seu bolso.</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Atualizações segmentadas sobre Inteligência Artificial para quem quer se manter à frente.
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-3 mb-16"
        >
          <Button asChild variant="glow" size="xl" className="flex-1">
            <Link to="/register">
              Começar agora
              <ArrowRight className="w-5 h-5" weight="bold" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="xl" className="flex-1">
            <Link to="/login">Já tenho conta</Link>
          </Button>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-4"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
              className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border hover:border-muted-foreground/30 transition-all duration-200"
            >
              <div className="p-2.5 rounded-lg bg-secondary">
                <feature.icon className="w-5 h-5 text-foreground" weight="bold" />
              </div>
              <div>
                <h3 className="font-semibold mb-0.5">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-16 pt-8 border-t border-border text-center"
        >
          <p className="text-xs text-muted-foreground">
            © 2025 Subhumano. Todos os direitos reservados.
          </p>
        </motion.footer>
      </div>
    </div>
  );
}
