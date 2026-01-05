import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Eye, EyeSlash, Shield } from '@phosphor-icons/react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { isAdminOrModerator, loading: authLoading } = useAdminAuth();

  useEffect(() => {
    if (!authLoading && isAdminOrModerator) {
      navigate('/admin', { replace: true });
    }
  }, [isAdminOrModerator, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        toast.error(error.message || 'Erro ao fazer login');
        setIsLoading(false);
        return;
      }

      toast.success('Login realizado com sucesso!');
      // The useEffect will handle navigation after roles are fetched
    } catch (err) {
      toast.error('Erro inesperado ao fazer login');
      setIsLoading(false);
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
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-secondary">
              <Shield className="w-6 h-6 text-foreground" weight="fill" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Área Administrativa
            </h1>
          </div>
          <p className="text-muted-foreground mb-8">
            Acesso restrito a administradores e moderadores
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Email
              </label>
              <Input
                type="email"
                placeholder="admin@email.com"
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
                  type={showPassword ? 'text' : 'password'}
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
              {isLoading ? 'Entrando...' : 'Acessar Painel'}
            </Button>
          </form>

          <p className="text-center text-muted-foreground mt-8">
            <Link
              to="/"
              className="text-foreground font-medium hover:underline"
            >
              Voltar ao site
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
