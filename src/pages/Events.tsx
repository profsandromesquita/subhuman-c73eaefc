import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Logo } from "@/components/Logo";
import { useEvents, useUserEventPurchases, type EventFilters, type Event } from "@/hooks/useEvents";
import { useSubscription } from "@/hooks/useSubscription";
import { CalendarBlank, MapPin, VideoCamera, Users as UsersIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const periodOptions = [
  { value: "all", label: "Todos" },
  { value: "future", label: "Futuros" },
  { value: "past", label: "Passados" },
];

const modalityOptions = [
  { value: "all", label: "Todos" },
  { value: "online", label: "Online" },
  { value: "presencial", label: "Presencial" },
  { value: "hibrido", label: "Híbrido" },
];

const typeOptions = [
  { value: "all", label: "Todos" },
  { value: "workshop", label: "Workshop" },
  { value: "palestra", label: "Palestra" },
  { value: "live", label: "Live" },
  { value: "mentoria", label: "Mentoria" },
  { value: "curso", label: "Curso" },
];

const typeLabels: Record<string, string> = {
  workshop: "Workshop",
  palestra: "Palestra",
  live: "Live",
  aula_ao_vivo: "Aula ao Vivo",
  mentoria: "Mentoria",
  curso: "Curso",
};

const modalityLabels: Record<string, string> = {
  online: "Online",
  presencial: "Presencial",
  hibrido: "Híbrido",
};

function FilterChips({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            value === opt.value
              ? "bg-foreground text-background"
              : "bg-card text-muted-foreground hover:bg-secondary"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

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

function EventCard({
  event,
  isPurchased,
  isSubscriber,
}: {
  event: Event;
  isPurchased: boolean;
  isSubscriber: boolean;
}) {
  const navigate = useNavigate();
  const now = new Date().toISOString();
  const isPast = event.sessions.length > 0 && event.sessions.every((s) => s.ends_at < now);

  const getActionButton = () => {
    if (isPast) {
      return (
        <Button disabled className="w-full rounded-lg" size="sm">
          Encerrado
        </Button>
      );
    }
    if (isPurchased || isSubscriber) {
      return (
        <Button
          className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-foreground"
          size="sm"
        >
          Acessar
        </Button>
      );
    }
    return (
      <Button
        className="w-full rounded-lg"
        size="sm"
        onClick={() => navigate("/plans")}
      >
        {event.is_free
          ? "Inscrever-se"
          : `Adquirir – R$ ${Number(event.price).toFixed(2).replace(".", ",")}`}
      </Button>
    );
  };

  return (
    <div className="bg-card rounded-xl overflow-hidden">
      {event.cover_url ? (
        <img
          src={event.cover_url}
          alt={event.title}
          className="w-full h-40 object-cover"
        />
      ) : (
        <div className="w-full h-28 bg-secondary flex items-center justify-center">
          <CalendarBlank className="w-10 h-10 text-muted-foreground" />
        </div>
      )}
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-xs">
            {typeLabels[event.event_type] || event.event_type}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {modalityLabels[event.modality] || event.modality}
          </Badge>
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
            <CalendarBlank className="w-3.5 h-3.5" />
            <span>{formatSessionDates(event.sessions)}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1.5">
              {event.modality === "online" ? (
                <VideoCamera className="w-3.5 h-3.5" />
              ) : (
                <MapPin className="w-3.5 h-3.5" />
              )}
              <span>{event.location}</span>
            </div>
          )}
          {event.max_participants && (
            <div className="flex items-center gap-1.5">
              <UsersIcon className="w-3.5 h-3.5" />
              <span>Máx. {event.max_participants} participantes</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="font-semibold text-foreground">
            {event.is_free
              ? "Gratuito"
              : isSubscriber
              ? "Incluso no plano"
              : `R$ ${Number(event.price).toFixed(2).replace(".", ",")}`}
          </span>
        </div>

        {getActionButton()}
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
  const subscription = useSubscription();

  const purchasedIds = new Set(purchases?.map((p) => p.event_id) || []);
  const isSubscriber =
    subscription.status === "active" &&
    ["monthly", "yearly", "lifetime"].includes(subscription.planType || "");

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-8 pb-24 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground">Eventos</h1>
            <Logo size="sm" />
          </div>
          <p className="text-muted-foreground mt-1">
            Workshops, palestras, mentorias e mais
          </p>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <FilterChips
            options={periodOptions}
            value={filters.period || "all"}
            onChange={(v) => setFilters((f) => ({ ...f, period: v as any }))}
          />
          <FilterChips
            options={modalityOptions}
            value={filters.modality || "all"}
            onChange={(v) => setFilters((f) => ({ ...f, modality: v }))}
          />
          <FilterChips
            options={typeOptions}
            value={filters.eventType || "all"}
            onChange={(v) => setFilters((f) => ({ ...f, eventType: v }))}
          />
        </div>

        {/* Event List */}
        <div className="space-y-4">
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
          ) : events && events.length > 0 ? (
            events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isPurchased={purchasedIds.has(event.id)}
                isSubscriber={isSubscriber}
              />
            ))
          ) : (
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
        </div>
      </div>
    </AppLayout>
  );
}
