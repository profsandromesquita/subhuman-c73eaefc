import { useUserAccess } from "@/hooks/useUserAccess";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { VideoCamera, Lock, ArrowSquareOut, ShoppingCart, YoutubeLogo } from "@phosphor-icons/react";
import type { Event } from "@/hooks/useEvents";

export function useEventActions(event: Event, isPurchased: boolean) {
  const { canAccessEvent, canWatchPodcast, canJoinPodcast } = useUserAccess();
  const { user } = useAuth();
  const now = new Date().toISOString();
  const isPast = event.sessions.length > 0 && event.sessions.every((s) => s.ends_at < now);
  const hasAccess = canAccessEvent(event.id, event.event_type, event.modality);
  const youtubeUrl = (event as any).youtube_url as string | null;
  const meetUrl = (event as any).meet_url as string | null;
  const isLive = event.event_type === "live";

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

interface EventActionButtonsProps {
  event: Event;
  isPurchased: boolean;
  stopPropagation?: boolean;
  size?: "sm" | "default" | "lg";
}

export function EventActionButtons({ event, isPurchased, stopPropagation, size = "sm" }: EventActionButtonsProps) {
  const { isPast, hasAccess, youtubeUrl, meetUrl, isLive, canWatchPodcast, canJoinPodcast, handleCheckout, handleAccess, now } = useEventActions(event, isPurchased);

  const wrap = (fn: (e?: React.MouseEvent) => void) => (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    fn(e);
  };

  if (isPast) {
    if (isLive && canWatchPodcast && youtubeUrl) {
      return (
        <Button variant="outline" className="w-full rounded-lg" size={size} onClick={wrap(() => window.open(youtubeUrl, "_blank"))}>
          <YoutubeLogo className="w-4 h-4 mr-1.5" />
          Assistir gravação
        </Button>
      );
    }
    return <Button disabled className="w-full rounded-lg opacity-50" size={size}>Encerrado</Button>;
  }

  if (isLive) {
    return (
      <div className="flex gap-2">
        {canWatchPodcast && youtubeUrl && (
          <Button className="flex-1 rounded-lg" variant="outline" size={size} onClick={wrap(() => window.open(youtubeUrl, "_blank"))}>
            <YoutubeLogo className="w-4 h-4 mr-1.5" />
            Assistir
          </Button>
        )}
        {meetUrl && (
          canJoinPodcast ? (
            <Button className="flex-1 rounded-lg bg-green-600 hover:bg-green-700 text-foreground" size={size} onClick={wrap(() => window.open(meetUrl, "_blank"))}>
              <VideoCamera className="w-4 h-4 mr-1.5" />
              Participar
            </Button>
          ) : (
            <Button disabled variant="outline" className="flex-1 rounded-lg opacity-50" size={size}>
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Participar
            </Button>
          )
        )}
      </div>
    );
  }

  const accessUrl = (event as any).access_url;
  const futureSession = event.sessions.find((s) => s.ends_at > now);
  const hasDestination = !!accessUrl || !!futureSession?.session_url;

  if (hasAccess) {
    return (
      <Button className="w-full rounded-lg bg-green-600 hover:bg-green-700 text-foreground" size={size} onClick={wrap(handleAccess)} disabled={!hasDestination}>
        <ArrowSquareOut className="w-4 h-4 mr-1.5" />
        {hasDestination ? "Acessar" : "Em breve"}
      </Button>
    );
  }

  return (
    <div className="flex gap-2">
      <Button disabled variant="outline" className="flex-1 rounded-lg opacity-50" size={size}>
        <Lock className="w-3.5 h-3.5 mr-1.5" />
        Acessar
      </Button>
      {event.checkout_url ? (
        <Button className="flex-1 rounded-lg" size={size} onClick={wrap(handleCheckout)}>
          <ShoppingCart className="w-4 h-4 mr-1.5" />
          {event.is_free ? "Inscrever-se" : `R$ ${Number(event.price).toFixed(2).replace(".", ",")}`}
        </Button>
      ) : (
        <Button disabled className="flex-1 rounded-lg opacity-50" size={size}>Em breve</Button>
      )}
    </div>
  );
}
