import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Envelope, ArrowLeft, ArrowClockwise, CheckCircle } from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/SEO";

export default function VerifyEmail() {
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();
  const { resendConfirmationEmail, user } = useAuth();

  useEffect(() => {
    // Get email from sessionStorage (saved during registration)
    const storedEmail = sessionStorage.getItem("pending_verification_email");
    if (storedEmail) {
      setEmail(storedEmail);
    }

    // If user is already confirmed, redirect to appropriate page
    if (user?.email_confirmed_at) {
      sessionStorage.removeItem("pending_verification_email");
      const workshopIntent = sessionStorage.getItem('workshop_intent');
      if (workshopIntent) {
        sessionStorage.removeItem('workshop_intent');
        navigate("/plans?tab=workshops", { replace: true });
      } else {
        navigate("/plans", { replace: true });
      }
    }
  }, [user, navigate]);

  useEffect(() => {
    // Cooldown timer for resend button
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResendEmail = async () => {
    if (!email || cooldown > 0) return;

    setIsResending(true);
    try {
      const { error } = await resendConfirmationEmail(email);

      if (error) {
        toast.error(error.message || "Erro ao reenviar email");
      } else {
        toast.success("Email de verificação reenviado!");
        setCooldown(60); // 60 second cooldown
      }
    } catch (err) {
      toast.error("Erro inesperado ao reenviar email");
    } finally {
      setIsResending(false);
    }
  };

  const handleUseAnotherEmail = () => {
    sessionStorage.removeItem("pending_verification_email");
    navigate("/register");
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
          className="text-center"
        >
          {/* Email Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-8 rounded-full bg-card flex items-center justify-center"
          >
            <Envelope className="w-10 h-10 text-foreground" weight="duotone" />
          </motion.div>

          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Verifique seu email
          </h1>
          
          {email ? (
            <p className="text-muted-foreground mb-2">
              Enviamos um link de confirmação para
            </p>
          ) : (
            <p className="text-muted-foreground mb-2">
              Enviamos um link de confirmação para seu email
            </p>
          )}
          
          {email && (
            <p className="text-foreground font-medium mb-6 break-all">
              {email}
            </p>
          )}

          <div className="bg-card rounded-xl p-6 mb-8 text-left space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0" weight="bold" />
              <p className="text-sm text-muted-foreground">
                Clique no link enviado para ativar sua conta
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0" weight="bold" />
              <p className="text-sm text-muted-foreground">
                Verifique também sua pasta de spam
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0" weight="bold" />
              <p className="text-sm text-muted-foreground">
                O link expira em 24 horas
              </p>
            </div>
          </div>

          <Button
            onClick={handleResendEmail}
            variant="glow"
            size="xl"
            className="w-full mb-4"
            disabled={isResending || cooldown > 0 || !email}
          >
            {isResending ? (
              <>
                <ArrowClockwise className="w-5 h-5 animate-spin" />
                Reenviando...
              </>
            ) : cooldown > 0 ? (
              `Reenviar em ${cooldown}s`
            ) : (
              <>
                <ArrowClockwise className="w-5 h-5" />
                Reenviar email de verificação
              </>
            )}
          </Button>

          <button
            onClick={handleUseAnotherEmail}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Usar outro email
          </button>

          <p className="text-muted-foreground mt-8">
            Já confirmou seu email?{" "}
            <Link
              to="/login"
              className="text-foreground font-medium hover:underline"
            >
              Fazer login
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
