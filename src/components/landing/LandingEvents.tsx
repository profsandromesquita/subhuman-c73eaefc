import { CalendarDays, Monitor, Clock, Sparkles, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollReveal } from "./ScrollReveal";
import { useEvents } from "@/hooks/useEvents";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function LandingEvents() {
  const { data: events } = useEvents({ period: "future" });

  // Get next upcoming event (first future published event)
  const nextEvent = events?.[0];

  if (!nextEvent) return null;

  const typeLabel =
    nextEvent.event_type === "workshop"
      ? "Workshop"
      : nextEvent.event_type === "palestra"
      ? "Palestra"
      : nextEvent.event_type === "live"
      ? "Live"
      : nextEvent.event_type === "mentoria"
      ? "Mentoria"
      : nextEvent.event_type;

  const priceFormatted = nextEvent.is_free
    ? "Gratuito"
    : `R$ ${Number(nextEvent.price).toFixed(2).replace(".", ",")}`;

  const ctaLink = nextEvent.checkout_url || "/plans";

  return (
    <section className="py-20 sm:py-28 px-6">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-amber-500/10 text-amber-400 border-amber-500/20">
              <Sparkles className="w-3 h-3 mr-1" />
              Próximo evento
            </Badge>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-3">
              Aprenda fazendo,{" "}
              <span className="text-muted-foreground">ao vivo</span>
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              Workshops práticos, palestras e mentorias com especialistas para você aplicar IA no seu dia a dia.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="relative rounded-xl border border-border bg-card overflow-hidden">
            {/* Accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-400 z-10" />

            {/* Cover image */}
            {nextEvent.cover_url && (
              <img
                src={nextEvent.cover_url}
                alt={nextEvent.title}
                className="w-full h-48 sm:h-56 object-cover"
              />
            )}

            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Content */}
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-foreground/10 text-foreground border-0 text-xs">
                      {typeLabel}
                    </Badge>
                    <Badge className="bg-blue-500/10 text-blue-400 border-0 text-xs">
                      {nextEvent.modality === "online" ? (
                        <><Monitor className="w-3 h-3 mr-1" /> Online</>
                      ) : nextEvent.modality === "presencial" ? (
                        <><MapPin className="w-3 h-3 mr-1" /> Presencial</>
                      ) : (
                        <><Monitor className="w-3 h-3 mr-1" /> Híbrido</>
                      )}
                    </Badge>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold leading-tight">
                    {nextEvent.title}
                  </h3>
                  {nextEvent.description && (
                    <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                      {nextEvent.description}
                    </p>
                  )}

                  {/* Dates */}
                  {nextEvent.sessions.length > 0 && (
                    <div className="space-y-2">
                      {nextEvent.sessions.map((session) => (
                        <div key={session.id} className="flex items-center gap-2 text-sm">
                          <CalendarDays className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {format(new Date(session.starts_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {format(new Date(session.starts_at), "HH'h'", { locale: ptBR })} às{" "}
                            {format(new Date(session.ends_at), "HH'h'", { locale: ptBR })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Price + CTA */}
                <div className="flex flex-col items-center justify-center gap-3 sm:min-w-[180px]">
                  <div className="text-center">
                    <p className="text-3xl font-extrabold">{priceFormatted}</p>
                    {!nextEvent.is_free && (
                      <p className="text-xs text-muted-foreground">pagamento único</p>
                    )}
                  </div>
                  <Button asChild variant="glow" size="lg" className="w-full">
                    {nextEvent.checkout_url ? (
                      <a href={nextEvent.checkout_url} target="_blank" rel="noopener noreferrer">
                        Garantir minha vaga
                      </a>
                    ) : (
                      <Link to="/plans">Garantir minha vaga</Link>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    {nextEvent.modality === "online" ? "Sala exclusiva online" : nextEvent.location || "Vagas limitadas"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
