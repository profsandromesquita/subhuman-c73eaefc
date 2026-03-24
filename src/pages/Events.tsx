import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Logo } from "@/components/Logo";
import { useEvents, type EventFilters, type Event } from "@/hooks/useEvents";
import { typeLabels, modalityLabels, formatSessionDates } from "@/lib/constants/events";
import { CalendarBlank, MapPin, VideoCamera, Users as UsersIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

function EventCard({ event }: { event: Event }) {
  const navigate = useNavigate();
  const now = new Date().toISOString();
  const hasSessions = event.sessions.length > 0;
  const isPast = hasSessions && event.sessions.every((s) => s.ends_at < now);

  const priceText = event.is_free
    ? "Gratuito"
    : event.price && Number(event.price) > 0
      ? `R$ ${Number(event.price).toFixed(2).replace(".", ",")}`
      : "Incluso no plano";

  return (
    <div
      className="bg-card rounded-xl overflow-hidden h-full flex flex-col cursor-pointer hover:ring-1 hover:ring-border transition-all"
      onClick={() => navigate(`/events/${event.slug}`)}
    >
      {event.cover_url ? (
        <img src={event.cover_url} alt={event.title} className="w-full h-40 object-cover lg:h-52" />
      ) : (
        <div className="w-full h-40 lg:h-52 bg-secondary flex items-center justify-center">
          <CalendarBlank className="w-10 h-10 text-muted-foreground" />
        </div>
      )}
      <div className="p-4 gap-3 flex-1 flex flex-col">
        <div className="flex gap-2 flex-wrap lg:flex-nowrap lg:overflow-hidden">
          <Badge variant="secondary" className="text-xs">{typeLabels[event.event_type] || event.event_type}</Badge>
          <Badge variant="outline" className="text-xs">{modalityLabels[event.modality] || event.modality}</Badge>
        </div>
        <h3 className="font-semibold text-foreground leading-tight line-clamp-2">{event.title}</h3>
        {event.description && <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarBlank className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{formatSessionDates(event.sessions)}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1.5">
              {event.modality?.startsWith("online") ? <VideoCamera className="w-3.5 h-3.5 flex-shrink-0" /> : <MapPin className="w-3.5 h-3.5 flex-shrink-0" />}
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
        <div className="mt-auto flex items-center justify-between pt-3">
          {hasSessions && (
            isPast ? (
              <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/30">Encerrado</Badge>
            ) : (
              <Badge className="text-xs bg-green-600/20 text-green-500 border-green-600/30 hover:bg-green-600/20">Em breve</Badge>
            )
          )}
          {!hasSessions && <span />}
          <span className={`text-sm font-semibold ${event.is_free ? "text-green-500" : "text-foreground"}`}>
            {priceText}
          </span>
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

  const { futureEvents, pastEvents } = useMemo(() => {
    if (!events) return { futureEvents: [], pastEvents: [] };
    const now = new Date().toISOString();
    const future: Event[] = [];
    const past: Event[] = [];
    events.forEach((event) => {
      const isPast = event.sessions.length > 0 && event.sessions.every((s) => s.ends_at < now);
      if (isPast) past.push(event);
      else future.push(event);
    });
    return { futureEvents: future, pastEvents: past };
  }, [events]);

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
        <div className="hidden lg:block">
          <h1 className="text-3xl font-bold tracking-tight">Eventos</h1>
          <p className="text-muted-foreground mt-1">Workshops, palestras, mentorias e mais</p>
        </div>
        <p className="text-sm text-muted-foreground lg:hidden">Workshops, palestras, mentorias e mais</p>

        {/* Filters */}
        <div className="flex gap-2 lg:flex-row lg:gap-3 lg:items-center">
          <p className="hidden lg:block text-sm text-muted-foreground shrink-0">Filtrar por:</p>
          <Select value={filters.period || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, period: v as any }))}>
            <SelectTrigger className="flex-1 bg-card border-border text-foreground h-9 text-xs lg:w-36 lg:flex-none"><SelectValue placeholder="Período" /></SelectTrigger>
            <SelectContent className="bg-card border-border z-50">{periodOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.modality || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, modality: v }))}>
            <SelectTrigger className="flex-1 bg-card border-border text-foreground h-9 text-xs"><SelectValue placeholder="Modalidade" /></SelectTrigger>
            <SelectContent className="bg-card border-border z-50">{modalityOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.eventType || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, eventType: v }))}>
            <SelectTrigger className="flex-1 bg-card border-border text-foreground h-9 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent className="bg-card border-border z-50">{typeOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* Event List */}
        <div className="space-y-4 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-6 lg:space-y-0">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl animate-pulse">
                <div className="w-full h-28 bg-secondary rounded-t-xl" />
                <div className="p-4 space-y-3">
                  <div className="flex gap-2"><div className="h-5 w-16 bg-secondary rounded" /><div className="h-5 w-14 bg-secondary rounded" /></div>
                  <div className="h-5 w-3/4 bg-secondary rounded" />
                  <div className="h-4 w-1/2 bg-secondary rounded" />
                  <div className="h-9 w-full bg-secondary rounded-lg" />
                </div>
              </div>
            ))
          ) : (
            <>
              {futureEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
              {pastEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
              {futureEvents.length === 0 && pastEvents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                    <CalendarBlank className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground">Nenhum evento encontrado</h3>
                  <p className="text-sm text-muted-foreground mt-1">Novos eventos serão publicados em breve</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
