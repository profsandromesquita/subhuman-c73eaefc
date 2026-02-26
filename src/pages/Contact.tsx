import { User, Mail, Phone, ArrowLeft, Building2, Handshake, Globe, FileText, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Contact() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Logo size="sm" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 pb-20 space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">Contato</h1>

        {/* ITIA */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Mantido pelo ITIA</h2>
          <div className="bg-card rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Building2 className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="font-semibold">ITIA — Instituto de Tecnologia e Inteligência Artificial</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <FileText className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CNPJ</p>
                <p className="text-sm font-medium">58.246.571/0001-90</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Globe className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <a href="https://itia.org.br" target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline inline-flex items-center gap-1">
                  itia.org.br <ExternalLink className="h-3 w-3" />
                </a>
                <a href="https://itia.ia.br" target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline inline-flex items-center gap-1">
                  itia.ia.br <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Coordenador */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Coordenado por</h2>
          <div className="bg-card rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <User className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="font-semibold">Sandro Costa Mesquita</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <FileText className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CREA-CE</p>
                <p className="text-sm font-medium">44680</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Mail className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <a href="mailto:sandro.mesquita@itia.org.br" className="text-sm font-medium hover:underline">
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
                <a href="https://wa.me/5585988182453" target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline">
                  (85) 98818-2453
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Globe className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <a href="https://profsandromesquita.com.br" target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline inline-flex items-center gap-1">
                  profsandromesquita.com.br <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Roboticamente */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Apoiado pela Roboticamente</h2>
          <div className="bg-card rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Handshake className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="font-semibold">Roboticamente</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <FileText className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CNPJ</p>
                <p className="text-sm font-medium">43.451.391/0001-73</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Globe className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <a href="https://roboticamente.eng.br" target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline inline-flex items-center gap-1">
                  roboticamente.eng.br <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
