import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Logo } from "@/components/Logo";
import { useEvents, useUserEventPurchases, type EventFilters, type Event } from "@/hooks/useEvents";
import { useUserAccess } from "@/hooks/useUserAccess";
import { useAuth } from "@/hooks/useAuth";
import { CalendarBlank, MapPin, VideoCamera, Users as UsersIcon, Lock, ArrowSquareOut, ShoppingCart, Trophy } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const periodOptions = [
  { value: "all", label: "Todos" },
  { value: "future", label: "Próximos" },
  { value: "past", label: "Encerrados" },
];

const modalityOptions = [
  { value: "all", label: "Todas" },
  { value: "online_gravado", label: "Online Gravado" },
  { value: "online_ao_vivo", label: "Online ao Vivo" },
  { value: "presencial", label: "Presencial" },
  { value: "hibrido", label: "Híbrido" },
];

const typeOptions = [
  { value: "all", label: "Todos" },
  { value: "workshop", label: "Workshop" },
  { value: "palestra", label: "Palestra" },
  { value: "curso", label: "Curso" },
  { value: "mentoria_grupo", label: "Mentoria em Grupo" },
  { value: "mentoria_individual", label: "Mentoria Individual" },
  { value: "live", label: "Live" },
  { value: "aula_ao_vivo", label: "Aula ao Vivo" },
];

const typeLabels: Record<string, string> = {
  workshop: "Workshop",
  palestra: "Palestra",
  live: "Live",
  aula_ao_vivo: "Aula ao Vivo",
  mentoria: "Mentoria",
  mentoria_grupo: "Mentoria em Grupo",
  mentoria_individual: "Mentoria Individual",
  curso: "Curso",
};

const modalityLabels: Record<string, string> = {
  online: "Online",
  online_gravado: "Online Gravado",
  online_ao_vivo: "Online ao Vivo",
  presencial: "Presencial",
  hibrido: "Híbrido",
};

function formatSessionDates(sessions: Event["sessions"]): string {
  if (!sessions.length) return "Sem datas definidas";

  const dates = sessions.map((s) => {
    const start = new Date(s.starts_at);
    return format(start, "d 'de' MMM", { locale: ptBR });
  });

  const firstSession = new Date(sessions[0].starts_at);
  const lastSession = new Date(sessions[sessions.length - 1].ends_at);
  const timeRange = `${format(firstSession, "HH'h'mm")}–${format(lastSession, "HH'h'mm")}`;

  if (dates.length === 1) return `${dates[0]}, ${timeRange}`;
  return `${dates.join(" e ")}, ${timeRange}`;
}

function EventCard({ event, isPurchased }: { event: Event; isPurchased: boolean }) {
  const { canAccessEvent, tier } = useUserAccess();
  const { user } = useAuth();
  const now = new Date().toISOString();
  const isPast = event.sessions.length > 0 && event.sessions.every((s) => s.ends_at < now);
  const hasAccess = canAccessEvent(event.id, event.event_type, event.modality);

  const handleCheckout = () => {
    if (!event.checkout_url) return;
    const url = new URL(event.checkout_url);
    if (user?.id) url.searchParams.set("src", user.id);
    if (user?.email) url.searchParams.set("email", user.email);
    window.open(url.toString(), "_blank");
  };

  const handleAccess = () => {
    const accessUrl = (event as any).access_url;
    if (accessUrl) {
      window.open(accessUrl, "_blank");
      return;
    }
    // Fallback to first future session URL
    const futureSession = event.sessions.find((s) => s.ends_at > now);
    if (futureSession?.session_url) {
      window.open(futureSession.session_url, "_blank");
    }
  };

  const getActionButtons = () => {
    if (isPast) {
      return (
        <Button disabled className="w-full rounded-lg opacity-50" size="sm">
          Encerrado
        </Button>
      );
    }

    const accessUrl = (event as any).access_url;
    const futureSession = event.sessions.find((s) => s.ends_at > now);
    const hasDestination = !!accessUrl || !!futureSession?.session_url;

    if (hasAccess) {
      return (
        <div className="flex gap-2">
          <Button
            className="flex-1 rounded-lg bg-green-600 hover:bg-green-700 text-foreground"
            size="sm"
            onClick={handleAccess}
            disabled={!hasDestination}
          >
            <ArrowSquareOut className="w-4 h-4 mr-1.5" />
            {hasDestination ? "Acessar" : "Em breve"}
          </Button>
        </div>
      );
    }

    return (
      <div className="flex gap-2">
        <Button
          disabled
          variant="outline"
          className="flex-1 rounded-lg opacity-50"
          size="sm"
        >
          <Lock className="w-3.5 h-3.5 mr-1.5" />
          Acessar
        </Button>
        {event.checkout_url ? (
          <Button
            className="flex-1 rounded-lg"
            size="sm"
            onClick={handleCheckout}
          >
            <ShoppingCart className="w-4 h-4 mr-1.5" />
            {event.is_free
              ? "Inscrever-se"
              : `R$ ${Number(event.price).toFixed(2).replace(".", ",")}`}
          </Button>
        ) : (
          <Button disabled className="flex-1 rounded-lg opacity-50" size="sm">
            Em breve
          </Button>
        )}
      </div>
    );
  };

  const getPriceLabel = () => {
    if (event.is_free) return "Gratuito";
    if (hasAccess && !isPurchased) return "Incluso no plano";
    return `R$ ${Number(event.price).toFixed(2).replace(".", ",")}`;
  };

  return (
    <div className="bg-card rounded-xl overflow-hidden h-full flex flex-col">
      {event.cover_url ? (
        <img
          src={event.cover_url}
          alt={event.title}
          className="w-full h-40 object-cover lg:h-52"
        />
      ) : (
        <div className="w-full h-40 lg:h-52 bg-secondary flex items-center justify-center">
          <CalendarBlank className="w-10 h-10 text-muted-foreground" />
        </div>
      )}
      <div className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            {typeLabels[event.event_type] || event.event_type}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {modalityLabels[event.modality] || event.modality}
          </Badge>
          {isPast && (
            <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/30">
              Encerrado
            </Badge>
          )}
        </div>

        <h3 className="font-semibold text-foreground leading-tight line-clamp-2">
          {event.title}
        </h3>

        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {event.description}
          </p>
        )}

        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarBlank className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{formatSessionDates(event.sessions)}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1.5">
              {event.modality?.startsWith("online") ? (
                <VideoCamera className="w-3.5 h-3.5 flex-shrink-0" />
              ) : (
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              )}
              <span className="truncate">{event.location}</span>
            </div>
          )}
          {event.max_participants && (
            <div className="flex items-center gap-1.5">
              <UsersIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Máx. {event.max_participants} participantes</span>
            </div>
          )}
        </div>

        <div className="mt-auto space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground text-sm">
              {getPriceLabel()}
            </span>
          </div>
          {getActionButtons()}
        </div>
      </div>
    </div>
  );
}

export default function Events() {
  const [filters, setFilters] = useState<EventFilters>({
    period: "all",
    modality: "all",
    eventType: "all",
  });

  const { data: events, isLoading } = useEvents(filters);
  const { data: purchases } = useUserEventPurchases();

  const purchasedIds = new Set(purchases?.map((p) => p.event_id) || []);

  // Split events into future and past
  const { futureEvents, pastEvents } = useMemo(() => {
    if (!events) return { futureEvents: [], pastEvents: [] };
    const now = new Date().toISOString();
    const future: Event[] = [];
    const past: Event[] = [];

    events.forEach((event) => {
      const isPast = event.sessions.length > 0 && event.sessions.every((s) => s.ends_at < now);
      if (isPast) {
        past.push(event);
      } else {
        future.push(event);
      }
    });

    return { futureEvents: future, pastEvents: past };
  }, [events]);

  const SkeletonCard = () => (
    <div className="bg-card rounded-xl animate-pulse">
      <div className="w-full aspect-video bg-secondary rounded-t-xl" />
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-secondary rounded" />
          <div className="h-5 w-14 bg-secondary rounded" />
        </div>
        <div className="h-5 w-3/4 bg-secondary rounded" />
        <div className="h-4 w-1/2 bg-secondary rounded" />
        <div className="h-9 w-full bg-secondary rounded-lg" />
      </div>
    </div>
  );

  return (
    <AppLayout>
      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="font-semibold">Eventos</h1>
          <Logo size="sm" />
        </div>
      </div>

      <div className="px-4 pt-5 pb-28 space-y-5 lg:px-10 lg:pt-8 lg:pb-10">
        {/* Desktop title */}
        <div className="hidden lg:block">
          <h1 className="text-3xl font-bold tracking-tight">Eventos</h1>
          <p className="text-muted-foreground mt-1">Workshops, palestras, mentorias e mais</p>
        </div>

        {/* Mobile subtitle */}
        <p className="text-sm text-muted-foreground lg:hidden">Workshops, palestras, mentorias e mais</p>

        {/* Filters */}
        <div className="flex gap-2 lg:flex-row lg:gap-3 lg:items-center">
          <p className="hidden lg:block text-sm text-muted-foreground shrink-0">Filtrar por:</p>
          <Select value={filters.period || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, period: v as any }))}>
            <SelectTrigger className="flex-1 bg-card border-border text-foreground h-9 text-xs lg:w-36 lg:flex-none">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
              {periodOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.modality || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, modality: v }))}>
            <SelectTrigger className="flex-1 bg-card border-border text-foreground h-9 text-xs">
              <SelectValue placeholder="Modalidade" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
              {modalityOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.eventType || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, eventType: v }))}>
            <SelectTrigger className="flex-1 bg-card border-border text-foreground h-9 text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
              {typeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Event List */}
        <div className="space-y-4 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-6 lg:space-y-0">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl animate-pulse">
                <div className="w-full h-28 bg-secondary rounded-t-xl" />
                <div className="p-4 space-y-3">
                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-secondary rounded" />
                    <div className="h-5 w-14 bg-secondary rounded" />
                  </div>
                  <div className="h-5 w-3/4 bg-secondary rounded" />
                  <div className="h-4 w-1/2 bg-secondary rounded" />
                  <div className="h-9 w-full bg-secondary rounded-lg" />
                </div>
              </div>
            ))
          ) : (
            <>
              {futureEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isPurchased={purchasedIds.has(event.id)}
                />
              ))}
              {pastEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isPurchased={purchasedIds.has(event.id)}
                />
              ))}

              {/* Empty state */}
              {futureEvents.length === 0 && pastEvents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                    <CalendarBlank className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground">
                    Nenhum evento encontrado
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Novos eventos serão publicados em breve
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
