import { Logo } from "@/components/Logo";
import { Link } from "react-router-dom";

export function LandingFooter() {
  return (
    <footer className="py-12 px-6 border-t border-border">
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-6">
        <Logo size="sm" />

        <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">Termos de Uso</a>
          <Link to="/privacidade" className="hover:text-foreground transition-colors">Política de Privacidade</Link>
          <Link to="/contato" className="hover:text-foreground transition-colors">Contato</Link>
        </div>

        <p className="text-xs text-muted-foreground">
          © 2025 Subhumano. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
