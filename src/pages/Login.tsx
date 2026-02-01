import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Eye, EyeSlash } from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { GoogleButton } from "@/components/GoogleButton";
import { AuthDivider } from "@/components/AuthDivider";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, resendConfirmationEmail } = useAuth();
  const { refetch } = useSubscription();

  const handleResendConfirmation = async () => {
    if (!email) {
      toast.error("Digite seu email para reenviar a confirmação");
      return;
    }
    
    const { error } = await resendConfirmationEmail(email);
    if (error) {
      toast.error(error.message || "Erro ao reenviar email");
    } else {
      sessionStorage.setItem("pending_verification_email", email);
      navigate("/verify-email");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        // Handle email not confirmed error
        if (error.message.includes("Email not confirmed") || error.message.includes("email_not_confirmed")) {
          toast.error(
            <div className="space-y-2">
              <p>Por favor, confirme seu email antes de fazer login.</p>
              <button
                onClick={handleResendConfirmation}
                className="text-sm underline hover:no-underline"
              >
                Reenviar email de confirmação
              </button>
            </div>,
            { duration: 10000 }
          );
          setIsLoading(false);
          return;
        }
        
        toast.error(error.message || "Erro ao fazer login");
        setIsLoading(false);
        return;
      }

      toast.success("Login realizado com sucesso!");
      
      // Clear trial banner flag so it shows again on new login
      sessionStorage.removeItem('trial_banner_shown');
      
      // Wait a moment for auth state to propagate, then check subscription
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get fresh subscription status after refetch
      const result = await refetch();
      
      // Redirect based on subscription status
      if (result.status === 'trial' || result.status === 'active') {
        navigate("/home", { replace: true });
      } else {
        navigate("/plans", { replace: true });
      }
    } catch (err) {
      toast.error("Erro inesperado ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error(error.message || "Erro ao fazer login com Google");
        setIsGoogleLoading(false);
      }
      // If no error, the page will redirect to Google OAuth
    } catch (err) {
      toast.error("Erro inesperado ao fazer login com Google");
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Glow effect */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-foreground/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-lg mx-auto px-6 pt-8 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center mb-12"
        >
          <Link
            to="/"
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" weight="bold" />
          </Link>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Bem-vindo de volta
          </h1>
          <p className="text-muted-foreground mb-8">
            Entre na sua conta para continuar
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Email
              </label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground">
                  Senha
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeSlash className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="glow"
              size="xl"
              className="w-full mt-6"
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <AuthDivider />

          <GoogleButton
            onClick={handleGoogleSignIn}
            isLoading={isGoogleLoading}
            label="Continuar com Google"
          />

          <p className="text-center text-muted-foreground mt-8">
            Não tem uma conta?{" "}
            <Link
              to="/register"
              className="text-foreground font-medium hover:underline"
            >
              Criar conta
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
