import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { resetPassword } = useAuth();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await resetPassword(email);

    if (error) {
      const msg = (error.message || "").toLowerCase();
      const status = (error as any)?.status;
      if (msg.includes("rate limit") || msg.includes("rate_limit") || msg.includes("429") || msg.includes("over_email_send") || status === 429) {
        toast.error("Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.");
      } else {
        toast.error("Erro ao enviar email de recuperação. Tente novamente.");
      }
      setIsLoading(false);
      return;
    }

    setSent(true);
    setCooldown(60);
    toast.success("Solicitação enviada!");
    setIsLoading(false);
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
            to="/login"
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
          {!sent ? (
            <>
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                Esqueceu a senha?
              </h1>
              <p className="text-muted-foreground mb-8">
                Digite seu email e enviaremos um link para recuperação
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

                <Button
                  type="submit"
                  variant="glow"
                  size="xl"
                  className="w-full mt-6"
                  disabled={isLoading}
                >
                  {isLoading ? "Enviando..." : "Enviar link"}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-foreground mx-auto mb-6 flex items-center justify-center">
                <span className="text-3xl">✓</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                Verifique seu email
              </h1>
              <p className="text-muted-foreground mb-4">
                Se este email estiver cadastrado, você receberá um link de recuperação em breve.
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                Verifique também a pasta de spam. Caso não receba, aguarde alguns minutos e tente novamente.
              </p>
              <div className="space-y-3">
                <Button
                  variant="glow"
                  size="xl"
                  className="w-full"
                  disabled={cooldown > 0 || isLoading}
                  onClick={handleSubmit as any}
                >
                  {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar link"}
                </Button>
                <Button asChild variant="outline" size="xl" className="w-full">
                  <Link to="/login">Voltar ao login</Link>
                </Button>
              </div>
            </div>
          )}

          <p className="text-center text-muted-foreground mt-8">
            Lembrou a senha?{" "}
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
