import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useEventBySlug, type EventMaterial } from "@/hooks/useEventDetail";
import { typeLabels, modalityLabels } from "@/lib/constants/events";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarBlank, MapPin, VideoCamera, Users as UsersIcon, ArrowLeft, Play, BookOpen, Image, Presentation, ArrowSquareOut } from "@phosphor-icons/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const segments = u.pathname.split("/").filter(Boolean);
      if (["embed", "live"].includes(segments[0]) && segments[1]) return segments[1];
    }
    return null;
  } catch {
    return null;
  }
}

const materialIcons: Record<string, React.ElementType> = {
  video: Play,
  ebook: BookOpen,
  photo: Image,
  slide: Presentation,
};

const materialTypeLabels: Record<string, string> = {
  video: "Vídeo",
  ebook: "E-book",
  photo: "Foto",
  slide: "Slides",
};

function MaterialCard({ material }: { material: EventMaterial }) {
  const Icon = materialIcons[material.type] || Play;

  return (
    <a
      href={material.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 p-3 rounded-xl bg-card hover:ring-1 hover:ring-border transition-all group"
    >
      {material.thumbnail_url ? (
        <img src={material.thumbnail_url} alt={material.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{materialTypeLabels[material.type] || material.type}</Badge>
        </div>
        <h4 className="text-sm font-medium text-foreground leading-tight line-clamp-1">{material.title}</h4>
        {material.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{material.description}</p>}
      </div>
      <ArrowSquareOut className="w-4 h-4 text-muted-foreground group-hover:text-foreground flex-shrink-0 mt-1 transition-colors" />
    </a>
  );
}

function EventDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2"><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-24" /></div>
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="w-full rounded-lg" style={{ aspectRatio: "16/9" }} />
    </div>
  );
}

export default function EventDetail() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useEventBySlug(eventSlug);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const event = data?.event;
  const materials = data?.materials || [];

  const now = new Date().toISOString();
  const hasSessions = event ? event.sessions.length > 0 : false;
  const isPast = event ? hasSessions && event.sessions.every((s) => s.ends_at < now) : false;

  const meetUrl = event?.meet_url;
  const youtubeUrl = event?.youtube_url
    || materials.find((m) => m.type === "video")?.url
    || null;

  const youtubeId = youtubeUrl ? extractYouTubeId(youtubeUrl) : null;

  const getPriceLabel = () => {
    if (!event) return "";
    if (event.is_free) return "Gratuito";
    if (event.price && Number(event.price) > 0) return `R$ ${Number(event.price).toFixed(2).replace(".", ",")}`;
    return "Incluso no plano";
  };

  const showMeetButton = !!meetUrl && !isPast;

  return (
    <AppLayout>
      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate("/events")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold truncate">{event?.title || "Evento"}</h1>
        </div>
      </div>

      <div className="px-4 pt-5 pb-28 space-y-5 lg:px-10 lg:pt-8 lg:pb-10 max-w-3xl mx-auto">
        {/* Desktop back button */}
        <button
          onClick={() => navigate("/events")}
          className="hidden lg:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Eventos
        </button>

        {isLoading && <EventDetailSkeleton />}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <h3 className="font-medium text-foreground">Evento não encontrado</h3>
            <p className="text-sm text-muted-foreground mt-1">O evento que você procura não existe ou foi removido.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/events")}>
              Voltar para Eventos
            </Button>
          </div>
        )}

        {event && !isLoading && (
          <>
            {/* Badges */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">{typeLabels[event.event_type] || event.event_type}</Badge>
              <Badge variant="outline" className="text-xs">{modalityLabels[event.modality] || event.modality}</Badge>
              {isPast && <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/30">Encerrado</Badge>}
              {hasSessions && !isPast && <Badge variant="outline" className="text-xs text-green-500 border-green-500/30">Em breve</Badge>}
            </div>

            {/* Title */}
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground leading-tight">{event.title}</h1>

            {/* Metadata */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {event.sessions.map((session) => (
                <span key={session.id} className="flex items-center gap-1.5">
                  <CalendarBlank className="w-4 h-4 flex-shrink-0" />
                  {format(new Date(session.starts_at), "d 'de' MMMM, HH'h'mm", { locale: ptBR })}
                  {" – "}
                  {format(new Date(session.ends_at), "HH'h'mm")}
                </span>
              ))}
              {event.sessions.length === 0 && (
                <span className="flex items-center gap-1.5">
                  <CalendarBlank className="w-4 h-4 flex-shrink-0" />
                  Sem datas definidas
                </span>
              )}
              {event.location && (
                <span className="flex items-center gap-1.5">
                  {event.modality?.startsWith("online") ? <VideoCamera className="w-4 h-4 flex-shrink-0" /> : <MapPin className="w-4 h-4 flex-shrink-0" />}
                  {event.location}
                </span>
              )}
              {event.max_participants && (
                <span className="flex items-center gap-1.5">
                  <UsersIcon className="w-4 h-4 flex-shrink-0" />
                  Máx. {event.max_participants}
                </span>
              )}
              {getPriceLabel() && (
                <span className={`font-medium ${event.is_free ? "text-green-500" : "text-foreground"}`}>
                  {getPriceLabel()}
                </span>
              )}
            </div>

            {/* Collapsible description */}
            {event.description && (
              <div>
                <p
                  className={`text-sm text-muted-foreground whitespace-pre-line leading-relaxed ${!isDescriptionExpanded ? "line-clamp-3" : ""}`}
                >
                  {event.description}
                </p>
                <button
                  onClick={() => setIsDescriptionExpanded((v) => !v)}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  {isDescriptionExpanded ? "Recolher" : "Ver descrição completa"}
                </button>
              </div>
            )}

            {/* Live button */}
            {showMeetButton && (
              <Button className="w-full rounded-lg bg-green-600 hover:bg-green-700 text-foreground" onClick={() => window.open(meetUrl!, "_blank")}>
                <VideoCamera className="w-4 h-4 mr-2" />
                Entrar na Sala ao Vivo
              </Button>
            )}

            {/* Video player OR cover fallback */}
            {youtubeId ? (
              <div className="w-full">
                <h2 className="text-lg font-semibold mb-3">Gravação do Evento</h2>
                <div className="w-full rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeId}`}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Gravação do evento"
                  />
                </div>
              </div>
            ) : event.cover_url ? (
              <img src={event.cover_url} alt={event.title} className="w-full rounded-xl object-cover max-h-80" />
            ) : null}

            {/* Contextual message when no content */}
            {!youtubeUrl && materials.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {isPast
                  ? "Conteúdo em preparação — será publicado em breve"
                  : "O conteúdo será disponibilizado após o evento"}
              </p>
            )}

            {/* Materials (unchanged) */}
            {materials.length > 0 && (
              <div className="space-y-3 pt-2">
                <h2 className="text-lg font-semibold text-foreground">Materiais do Evento</h2>
                <div className="space-y-2">
                  {materials.map((material) => (
                    <MaterialCard key={material.id} material={material} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
