import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Logo } from "@/components/Logo";
import { useEvents, useUserEventPurchases, type EventFilters, type Event } from "@/hooks/useEvents";
import { useUserAccess } from "@/hooks/useUserAccess";
import { useAuth } from "@/hooks/useAuth";
import { CalendarBlank, MapPin, VideoCamera, Users as UsersIcon, Lock, ArrowSquareOut, ShoppingCart, Trophy, YoutubeLogo } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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

function useEventActions(event: Event, isPurchased: boolean) {
  const { canAccessEvent, canWatchPodcast, canJoinPodcast, canBeGuestOnPodcast } = useUserAccess();
  const { user } = useAuth();
  const now = new Date().toISOString();
  const isPast = event.sessions.length > 0 && event.sessions.every((s) => s.ends_at < now);
  const hasAccess = canAccessEvent(event.id, event.event_type, event.modality);
  const youtubeUrl = (event as any).youtube_url as string | null;
  const meetUrl = (event as any).meet_url as string | null;
  const isLive = event.event_type === 'live';

  const handleCheckout = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!event.checkout_url) return;
    const url = new URL(event.checkout_url);
    if (user?.id) url.searchParams.set("src", user.id);
    if (user?.email) url.searchParams.set("email", user.email);
    window.open(url.toString(), "_blank");
  };

  const handleAccess = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const accessUrl = (event as any).access_url;
    if (accessUrl) {
      window.open(accessUrl, "_blank");
      return;
    }
    const futureSession = event.sessions.find((s) => s.ends_at > now);
    if (futureSession?.session_url) {
      window.open(futureSession.session_url, "_blank");
    }
  };

  const getPriceLabel = () => {
    if (event.is_free) return "Gratuito";
    if (hasAccess && !isPurchased) return "Incluso no plano";
    return `R$ ${Number(event.price).toFixed(2).replace(".", ",")}`;
  };

  return { isPast, hasAccess, youtubeUrl, meetUrl, isLive, canWatchPodcast, canJoinPodcast, handleCheckout, handleAccess, getPriceLabel, now };
}

function ActionButtons({ event, isPurchased, stopPropagation }: { event: Event; isPurchased: boolean; stopPropagation?: boolean }) {
  const { isPast, hasAccess, youtubeUrl, meetUrl, isLive, canWatchPodcast, canJoinPodcast, canBeGuestOnPodcast, handleCheckout, handleAccess, now } = useEventActions(event, isPurchased);

  const wrap = (fn: (e?: React.MouseEvent) => void) => (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    fn(e);
  };

  if (isPast) {
    if (isLive && canWatchPodcast && youtubeUrl) {
      return (
        <Button variant="outline" className="w-full rounded-lg" size="sm" onClick={wrap(() => window.open(youtubeUrl, "_blank"))}>
          <YoutubeLogo className="w-4 h-4 mr-1.5" />
          Assistir gravação
        </Button>
      );
    }
    return <Button disabled className="w-full rounded-lg opacity-50" size="sm">Encerrado</Button>;
  }

  if (isLive) {
    return (
      <div className="flex gap-2">
        {canWatchPodcast && youtubeUrl && (
          <Button className="flex-1 rounded-lg" variant="outline" size="sm" onClick={wrap(() => window.open(youtubeUrl, "_blank"))}>
            <YoutubeLogo className="w-4 h-4 mr-1.5" />
            Assistir
          </Button>
        )}
        {meetUrl && (
          canJoinPodcast ? (
            <Button className="flex-1 rounded-lg bg-green-600 hover:bg-green-700 text-foreground" size="sm" onClick={wrap(() => window.open(meetUrl, "_blank"))}>
              <VideoCamera className="w-4 h-4 mr-1.5" />
              Participar
            </Button>
          ) : (
            <Button disabled variant="outline" className="flex-1 rounded-lg opacity-50" size="sm">
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Participar
            </Button>
          )
        )}
        {canBeGuestOnPodcast && meetUrl && (
          <Button className="rounded-lg border-amber-500/50 text-amber-500 hover:bg-amber-500/10" variant="outline" size="sm" onClick={wrap(() => window.open(meetUrl, "_blank"))}>
            <Microphone className="w-4 h-4 mr-1.5" />
            Convidado
          </Button>
        )}
      </div>
    );
  }

  const accessUrl = (event as any).access_url;
  const futureSession = event.sessions.find((s) => s.ends_at > now);
  const hasDestination = !!accessUrl || !!futureSession?.session_url;

  if (hasAccess) {
    return (
      <Button className="w-full rounded-lg bg-green-600 hover:bg-green-700 text-foreground" size="sm" onClick={wrap(handleAccess)} disabled={!hasDestination}>
        <ArrowSquareOut className="w-4 h-4 mr-1.5" />
        {hasDestination ? "Acessar" : "Em breve"}
      </Button>
    );
  }

  return (
    <div className="flex gap-2">
      <Button disabled variant="outline" className="flex-1 rounded-lg opacity-50" size="sm">
        <Lock className="w-3.5 h-3.5 mr-1.5" />
        Acessar
      </Button>
      {event.checkout_url ? (
        <Button className="flex-1 rounded-lg" size="sm" onClick={wrap(handleCheckout)}>
          <ShoppingCart className="w-4 h-4 mr-1.5" />
          {event.is_free ? "Inscrever-se" : `R$ ${Number(event.price).toFixed(2).replace(".", ",")}`}
        </Button>
      ) : (
        <Button disabled className="flex-1 rounded-lg opacity-50" size="sm">Em breve</Button>
      )}
    </div>
  );
}

function EventCard({ event, isPurchased, onOpenDetail }: { event: Event; isPurchased: boolean; onOpenDetail: () => void }) {
  const { getPriceLabel } = useEventActions(event, isPurchased);
  const now = new Date().toISOString();
  const isPast = event.sessions.length > 0 && event.sessions.every((s) => s.ends_at < now);

  return (
    <div
      className="bg-card rounded-xl overflow-hidden h-full flex flex-col cursor-pointer hover:ring-1 hover:ring-border transition-all"
      onClick={onOpenDetail}
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
          {isPast && <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/30">Encerrado</Badge>}
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
        <div className="mt-auto space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground text-sm">{getPriceLabel()}</span>
          </div>
          <ActionButtons event={event} isPurchased={isPurchased} stopPropagation />
        </div>
      </div>
    </div>
  );
}

function EventDetailModal({ event, isPurchased, open, onClose }: { event: Event | null; isPurchased: boolean; open: boolean; onClose: () => void }) {
  if (!event) return null;

  const now = new Date().toISOString();
  const isPast = event.sessions.length > 0 && event.sessions.every((s) => s.ends_at < now);

  const getPriceLabel = () => {
    if (event.is_free) return "Gratuito";
    return event.price ? `R$ ${Number(event.price).toFixed(2).replace(".", ",")}` : "";
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {event.cover_url && (
          <img src={event.cover_url} alt={event.title} className="w-full h-48 sm:h-64 object-cover rounded-t-lg" />
        )}
        <div className="p-5 space-y-4">
          <DialogHeader className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">{typeLabels[event.event_type] || event.event_type}</Badge>
              <Badge variant="outline" className="text-xs">{modalityLabels[event.modality] || event.modality}</Badge>
              {isPast && <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/30">Encerrado</Badge>}
            </div>
            <DialogTitle className="text-xl font-bold leading-tight">{event.title}</DialogTitle>
          </DialogHeader>

          {event.description && (
            <DialogDescription asChild>
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{event.description}</p>
            </DialogDescription>
          )}

          <div className="space-y-2 text-sm text-muted-foreground">
            {event.sessions.map((session) => (
              <div key={session.id} className="flex items-center gap-2">
                <CalendarBlank className="w-4 h-4 flex-shrink-0" />
                <span>
                  {format(new Date(session.starts_at), "d 'de' MMMM, HH'h'mm", { locale: ptBR })}
                  {" – "}
                  {format(new Date(session.ends_at), "HH'h'mm")}
                </span>
              </div>
            ))}
            {event.location && (
              <div className="flex items-center gap-2">
                {event.modality?.startsWith("online") ? <VideoCamera className="w-4 h-4 flex-shrink-0" /> : <MapPin className="w-4 h-4 flex-shrink-0" />}
                <span>{event.location}</span>
              </div>
            )}
            {event.max_participants && (
              <div className="flex items-center gap-2">
                <UsersIcon className="w-4 h-4 flex-shrink-0" />
                <span>Máx. {event.max_participants} participantes</span>
              </div>
            )}
          </div>

          {getPriceLabel() && (
            <div className="flex items-center">
              <span className="font-semibold text-foreground">{getPriceLabel()}</span>
            </div>
          )}

          <ActionButtons event={event} isPurchased={isPurchased} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Events() {
  const [filters, setFilters] = useState<EventFilters>({
    period: "all",
    modality: "all",
    eventType: "all",
  });
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const { data: events, isLoading } = useEvents(filters);
  const { data: purchases } = useUserEventPurchases();

  const purchasedIds = new Set(purchases?.map((p) => p.event_id) || []);

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
                <EventCard key={event.id} event={event} isPurchased={purchasedIds.has(event.id)} onOpenDetail={() => setSelectedEvent(event)} />
              ))}
              {pastEvents.map((event) => (
                <EventCard key={event.id} event={event} isPurchased={purchasedIds.has(event.id)} onOpenDetail={() => setSelectedEvent(event)} />
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

      <EventDetailModal
        event={selectedEvent}
        isPurchased={selectedEvent ? purchasedIds.has(selectedEvent.id) : false}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </AppLayout>
  );
}
