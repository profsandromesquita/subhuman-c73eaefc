import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Warning } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";

export default function SetupAdmin() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Digite o email do usuário");
      return;
    }

    setLoading(true);

    try {
      // First, find the user by email in profiles
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .ilike("full_name", `%${email}%`);

      if (profileError) throw profileError;

      // If not found by name, we need to get the user ID differently
      // The user needs to be logged in to become admin
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Você precisa estar logado para se tornar admin");
        setLoading(false);
        return;
      }

      // Check if this user's email matches
      if (user.email?.toLowerCase() !== email.toLowerCase()) {
        toast.error("Você só pode tornar admin o usuário atualmente logado. Faça login com o email correto.");
        setLoading(false);
        return;
      }

      // Check if already admin
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (existingRole) {
        toast.info("Este usuário já é admin");
        setSuccess(true);
        setLoading(false);
        return;
      }

      // Insert admin role
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({
          user_id: user.id,
          role: "admin"
        });

      if (insertError) throw insertError;

      toast.success("Usuário promovido a admin com sucesso!");
      setSuccess(true);
    } catch (error: any) {
      console.error("Error creating admin:", error);
      toast.error(error.message || "Erro ao criar admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <SEO
        title="Configuração Admin — Subhumano"
        description="Configuração inicial de administrador."
        path="/setup-admin"
        noindex
        nofollow
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="border-destructive/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10 w-fit">
              <Warning className="w-8 h-8 text-destructive" weight="fill" />
            </div>
            <CardTitle className="text-xl">Configuração Inicial de Admin</CardTitle>
            <CardDescription>
              Esta página é temporária e deve ser removida após criar o primeiro administrador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="text-center space-y-4">
                <div className="mx-auto p-3 rounded-full bg-green-500/10 w-fit">
                  <ShieldCheck className="w-12 h-12 text-green-500" weight="fill" />
                </div>
                <p className="text-muted-foreground">
                  Admin configurado com sucesso!
                </p>
                <Button asChild className="w-full">
                  <Link to="/admin">Acessar Painel Admin</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email do usuário logado</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Digite o email da conta que está logada para promovê-la a admin.
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Processando..." : "Tornar Admin"}
                </Button>

                <p className="text-xs text-center text-muted-foreground mt-4">
                  Não tem conta?{" "}
                  <Link to="/register" className="text-primary hover:underline">
                    Registre-se primeiro
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
