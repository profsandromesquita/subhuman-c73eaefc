import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { ArrowLeft, Eye, EyeSlash, Check, WarningCircle } from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { GoogleButton } from "@/components/GoogleButton";
import { AuthDivider } from "@/components/AuthDivider";
import { SEO } from "@/components/SEO";

const BLOCKED_DOMAINS = [
  "mailinator.com", "tempmail.com", "guerrillamail.com", "yopmail.com",
  "throwaway.email", "10minutemail.com", "trashmail.com", "fakeinbox.com",
  "sharklasers.com", "guerrillamailblock.com", "grr.la", "dispostable.com",
  "maildrop.cc", "temp-mail.org", "emailondeck.com", "getairmail.com",
  "mohmal.com", "tempail.com", "burnermail.io", "guerrillamail.info",
  "guerrillamail.net", "guerrillamail.org", "guerrillamail.de",
  "mailnesia.com", "mailcatch.com", "trashmail.me", "trashmail.net",
  "tempr.email", "discard.email", "discardmail.com", "mailnull.com",
  "spamgourmet.com", "mytemp.email", "tempinbox.com", "harakirimail.com",
  "mailsac.com", "inboxbear.com", "crazymailing.com",
];

function validateEmail(email: string): { valid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Formato de email inválido" };
  }
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain || domain.split(".").length < 2) {
    return { valid: false, error: "Domínio de email inválido" };
  }
  if (BLOCKED_DOMAINS.includes(domain)) {
    return { valid: false, error: "Use um email real, não temporário" };
  }
  return { valid: true };
}

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { signUp, signInWithGoogle } = useAuth();

  const passwordRequirements = [
    { label: "Mínimo 8 caracteres", met: password.length >= 8 },
    { label: "Uma letra maiúscula", met: /[A-Z]/.test(password) },
    { label: "Um número", met: /[0-9]/.test(password) },
  ];

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value.length > 0 && value.includes("@")) {
      const result = validateEmail(value);
      setEmailError(result.valid ? null : result.error || null);
    } else {
      setEmailError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setEmailError(emailValidation.error || "Email inválido");
      toast.error(emailValidation.error || "Email inválido");
      return;
    }

    if (passwordRequirements.some((req) => !req.met)) {
      toast.error("Sua senha não atende aos requisitos");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não conferem");
      return;
    }

    setIsLoading(true);

    try {
      const { error, isExistingUser } = await signUp(email, password, name);

      if (error) {
        if (error.message.includes("rate limit") || (error as any).status === 429) {
          toast.error("O sistema está com volume alto de cadastros no momento. Por favor, tente novamente em 5 a 10 minutos.", { duration: 8000 });
        } else if (error.message.includes("already registered")) {
          toast.error("Este email já está cadastrado");
        } else {
          toast.error(error.message || "Erro ao criar conta");
        }
        setIsLoading(false);
        return;
      }

      if (isExistingUser) {
        toast.info("Este email já está cadastrado. Faça login ou recupere sua senha.", {
          duration: 5000,
        });
        navigate("/login");
        setIsLoading(false);
        return;
      }

      sessionStorage.setItem("pending_verification_email", email);
      toast.success("Enviamos um link de confirmação para seu email!");
      navigate("/verify-email");
    } catch (err) {
      toast.error("Erro inesperado ao criar conta");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error(error.message || "Erro ao cadastrar com Google");
        setIsGoogleLoading(false);
      }
    } catch (err) {
      toast.error("Erro inesperado ao cadastrar com Google");
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-safe">
      <SEO
        title="Criar Conta — Subhumano"
        description="Crie sua conta no Subhumano e comece a explorar a plataforma."
        path="/register"
        noindex
      />
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
            Criar conta
          </h1>
          <p className="text-muted-foreground mb-8">
            Comece sua jornada no futuro da IA
          </p>

          <GoogleButton
            onClick={handleGoogleSignIn}
            isLoading={isGoogleLoading}
            label="Cadastrar com Google"
          />

          <AuthDivider />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Nome completo
              </label>
              <Input
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Email
              </label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                required
                className={emailError ? "border-red-500 focus-visible:ring-red-500/50" : ""}
              />
              {emailError && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                  <WarningCircle className="w-3.5 h-3.5" weight="bold" />
                  {emailError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Senha
              </label>
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

              {password.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-1 pt-2"
                >
                  {passwordRequirements.map((req) => (
                    <div
                      key={req.label}
                      className={`flex items-center gap-2 text-xs ${
                        req.met ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          req.met ? "bg-foreground" : "bg-muted"
                        }`}
                      >
                        {req.met && <Check className="w-2.5 h-2.5 text-background" weight="bold" />}
                      </div>
                      {req.label}
                    </div>
                  ))}
                </motion.div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Confirmar senha
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeSlash className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {confirmPassword.length > 0 && (
                <p className={`text-xs mt-1 ${
                  password === confirmPassword ? "text-green-500" : "text-red-500"
                }`}>
                  {password === confirmPassword ? "✓ Senhas conferem" : "✗ As senhas não conferem"}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="glow"
              size="xl"
              className="w-full mt-6"
              disabled={isLoading || !!emailError}
            >
              {isLoading ? "Criando conta..." : "Criar conta"}
            </Button>
          </form>

          <p className="text-center text-muted-foreground mt-8 text-sm">
            Ao criar uma conta, você concorda com nossos{" "}
            <Link to="/terms" className="text-foreground hover:underline">
              Termos de Uso
            </Link>{" "}
            e{" "}
            <Link to="/privacy" className="text-foreground hover:underline">
              Política de Privacidade
            </Link>
          </p>

          <p className="text-center text-muted-foreground mt-4">
            Já tem uma conta?{" "}
            <Link
              to="/login"
              className="text-foreground font-medium hover:underline"
            >
              Entrar
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
