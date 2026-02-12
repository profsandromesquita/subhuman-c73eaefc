import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { ArrowLeft, Eye, EyeSlash, LockSimple } from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { GoogleButton } from "@/components/GoogleButton";
import { AuthDivider } from "@/components/AuthDivider";

// --- Rate limiting helpers ---
const STORAGE_KEYS = {
  attempts: "login_failed_attempts",
  lockoutUntil: "login_lockout_until",
};

function getLockoutDuration(attempts: number): number {
  if (attempts >= 8) return 10 * 60 * 1000; // 10 min
  if (attempts >= 5) return 2 * 60 * 1000;   // 2 min
  if (attempts >= 3) return 30 * 1000;        // 30s
  return 0;
}

function getFailedAttempts(): number {
  return parseInt(localStorage.getItem(STORAGE_KEYS.attempts) || "0", 10);
}

function getLockoutUntil(): number {
  return parseInt(localStorage.getItem(STORAGE_KEYS.lockoutUntil) || "0", 10);
}

function recordFailedAttempt() {
  const attempts = getFailedAttempts() + 1;
  localStorage.setItem(STORAGE_KEYS.attempts, String(attempts));
  const duration = getLockoutDuration(attempts);
  if (duration > 0) {
    localStorage.setItem(STORAGE_KEYS.lockoutUntil, String(Date.now() + duration));
  }
}

function clearFailedAttempts() {
  localStorage.removeItem(STORAGE_KEYS.attempts);
  localStorage.removeItem(STORAGE_KEYS.lockoutUntil);
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, resendConfirmationEmail } = useAuth();
  const { refetch } = useSubscription();

  const isLockedOut = lockoutRemaining > 0;

  // Check and update lockout timer
  const checkLockout = useCallback(() => {
    const until = getLockoutUntil();
    if (until > Date.now()) {
      setLockoutRemaining(Math.ceil((until - Date.now()) / 1000));
    } else {
      setLockoutRemaining(0);
    }
  }, []);

  useEffect(() => {
    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, [checkLockout]);

  const formatCountdown = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}min ${s.toString().padStart(2, "0")}s`;
    return `${s}s`;
  };

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

    if (isLockedOut) {
      toast.error(`Aguarde ${formatCountdown(lockoutRemaining)} antes de tentar novamente.`);
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        // Record failed attempt for rate limiting
        recordFailedAttempt();
        checkLockout();

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

        const attempts = getFailedAttempts();
        if (attempts >= 3) {
          const duration = getLockoutDuration(attempts);
          const secs = Math.ceil(duration / 1000);
          toast.error(`Credenciais incorretas. Conta bloqueada por ${formatCountdown(secs)}.`);
        } else {
          const remaining = 3 - attempts;
          toast.error(`Email ou senha incorretos. ${remaining === 1 ? "Mais 1 tentativa antes do bloqueio." : `Mais ${remaining} tentativas antes do bloqueio.`}`);
        }

        setIsLoading(false);
        return;
      }

      // Success — clear rate limiting
      clearFailedAttempts();

      toast.success("Login realizado com sucesso!");
      sessionStorage.removeItem('trial_banner_shown');

      await new Promise(resolve => setTimeout(resolve, 500));
      const result = await refetch();

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
    } catch (err) {
      toast.error("Erro inesperado ao fazer login com Google");
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-safe">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-foreground/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-lg mx-auto px-6 pt-8 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center mb-8"
        >
          <Link
            to="/"
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" weight="bold" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className="flex justify-center mb-8"
        >
          <Logo size="md" />
        </motion.div>

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

          {isLockedOut && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 mb-6"
            >
              <LockSimple className="w-5 h-5 text-destructive flex-shrink-0" weight="bold" />
              <div>
                <p className="text-sm text-destructive font-medium">
                  Acesso temporariamente bloqueado
                </p>
                <p className="text-xs text-destructive/70 mt-0.5">
                  Tente novamente em {formatCountdown(lockoutRemaining)}
                </p>
              </div>
            </motion.div>
          )}

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
                disabled={isLockedOut}
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
                  disabled={isLockedOut}
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
              disabled={isLoading || isLockedOut}
            >
              {isLockedOut
                ? `Bloqueado (${formatCountdown(lockoutRemaining)})`
                : isLoading
                  ? "Entrando..."
                  : "Entrar"}
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
