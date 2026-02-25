import { User, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

export default function Contact() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="py-6 px-6 flex justify-center">
        <Link to="/">
          <Logo size="sm" />
        </Link>
      </header>

      <main className="flex-1 flex items-start justify-center px-6 pt-8 pb-20">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold tracking-tight mb-6">Contato</h1>

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
        </div>
      </main>
    </div>
  );
}
