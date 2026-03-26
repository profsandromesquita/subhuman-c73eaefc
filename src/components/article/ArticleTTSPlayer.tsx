import { useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Headphones, Pause, Play, X, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useArticleTTS } from "@/hooks/useArticleTTS";
import { htmlToSpeechBlocks } from "@/utils/htmlToSpeechText";
import { useIsMobile } from "@/hooks/use-mobile";

interface ArticleTTSPlayerProps {
  htmlContent: string;
  articleTitle: string;
}

export function ArticleTTSPlayer({ htmlContent, articleTitle }: ArticleTTSPlayerProps) {
  const plainText = useMemo(() => htmlToSpeechText(htmlContent), [htmlContent]);
  const { status, progress, play, pause, stop, isSupported } = useArticleTTS(plainText);
  const isMobile = useIsMobile();

  const isActive = status === 'playing' || status === 'paused' || status === 'loading';

  useEffect(() => {
    if (!isMobile) return;
    const PLAYER_HEIGHT = 72;
    if (isActive) {
      document.documentElement.style.setProperty('--tts-player-height', `${PLAYER_HEIGHT}px`);
      document.body.classList.add('tts-player-active');
    } else {
      document.documentElement.style.removeProperty('--tts-player-height');
      document.body.classList.remove('tts-player-active');
    }
    return () => {
      document.documentElement.style.removeProperty('--tts-player-height');
      document.body.classList.remove('tts-player-active');
    };
  }, [isActive, isMobile]);

  if (!isSupported) return null;

  // Idle state — simple button
  if (!isActive && status !== 'error') {
    return (
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={play}
          className="gap-2 text-muted-foreground hover:text-foreground border-border/60"
        >
          <Headphones className="w-4 h-4" />
          Ouvir artigo
        </Button>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="mb-6 flex items-center gap-2 text-sm text-destructive">
        <WarningCircle className="w-4 h-4" />
        <span>Não foi possível iniciar a leitura.</span>
        <Button variant="ghost" size="sm" onClick={play} className="text-xs">
          Tentar novamente
        </Button>
      </div>
    );
  }

  // Active player
  const playerContent = (
    <div className="flex items-center gap-3 w-full">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={status === 'playing' ? pause : play}
      >
        {status === 'playing' ? (
          <Pause className="w-4 h-4" weight="fill" />
        ) : (
          <Play className="w-4 h-4" weight="fill" />
        )}
      </Button>

      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-xs text-muted-foreground truncate">
          {status === 'loading' ? 'Carregando...' : status === 'paused' ? 'Pausado' : articleTitle}
        </p>
        <Progress value={progress} className="h-1" />
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={stop}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );

  // Mobile: fixed bottom bar via portal
  if (isMobile) {
    return createPortal(
      <div className="fixed bottom-16 left-0 right-0 z-50 border-t border-border bg-card px-4 py-2.5 safe-bottom">
        {playerContent}
      </div>,
      document.body
    );
  }

  // Desktop: inline
  return (
    <div className="mb-6 rounded-xl border border-border/60 bg-card/50 px-4 py-3">
      {playerContent}
    </div>
  );
}
