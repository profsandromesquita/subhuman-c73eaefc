import { User, Mail, Phone, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Contact() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Logo size="sm" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 pb-20">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Contato</h1>

        <div className="bg-card rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <User className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Responsável</p>
              <p className="font-semibold">Prof. Sandro Mesquita</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Mail className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <a
                href="mailto:sandro.mesquita@itia.org.br"
                className="text-sm font-medium hover:underline"
              >
                sandro.mesquita@itia.org.br
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Phone className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">WhatsApp</p>
              <a
                href="https://wa.me/5585988182453"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline"
              >
                (85) 98818-2453
              </a>
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
