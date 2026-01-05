import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Eye, EyeSlash, Check } from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const passwordRequirements = [
    { label: "Mínimo 8 caracteres", met: password.length >= 8 },
    { label: "Uma letra maiúscula", met: /[A-Z]/.test(password) },
    { label: "Um número", met: /[0-9]/.test(password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordRequirements.some((req) => !req.met)) {
      toast.error("Sua senha não atende aos requisitos");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signUp(email, password, name);

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("Este email já está cadastrado");
        } else {
          toast.error(error.message || "Erro ao criar conta");
        }
        setIsLoading(false);
        return;
      }

      toast.success("Conta criada com sucesso!");
      navigate("/plans");
    } catch (err) {
      toast.error("Erro inesperado ao criar conta");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-foreground/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-lg mx-auto px-6 pt-8 pb-12">
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
                onChange={(e) => setEmail(e.target.value)}
                required
              />
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

            <Button
              type="submit"
              variant="glow"
              size="xl"
              className="w-full mt-6"
              disabled={isLoading}
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
