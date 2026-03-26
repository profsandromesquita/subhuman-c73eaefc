import { useState, useRef, useEffect, useCallback } from 'react';
import { Headphones, Pause, Play, X, WarningCircle, Spinner } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

interface ArticleTTSPlayerProps {
  postId: string;
  htmlContent: string;
  articleTitle: string;
  audioUrl?: string | null;
}

export function ArticleTTSPlayer({
  postId,
  htmlContent,
  articleTitle,
  audioUrl: initialAudioUrl,
}: ArticleTTSPlayerProps) {
  const [audioUrl, setAudioUrl] = useState(initialAudioUrl ?? null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync prop changes
  useEffect(() => {
    if (initialAudioUrl) setAudioUrl(initialAudioUrl);
  }, [initialAudioUrl]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const setupAudio = useCallback((url: string) => {
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setProgress(Math.round((audio.currentTime / audio.duration) * 100));
      }
    };

    audio.onended = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(0);
    };

    audio.onerror = () => {
      setIsPlaying(false);
      setError('Erro ao reproduzir o áudio.');
    };

    return audio;
  }, []);

  const handlePlay = useCallback(async () => {
    setError(null);

    // Tem URL — toca direto
    if (audioUrl) {
      if (isPaused && audioRef.current) {
        await audioRef.current.play();
        setIsPlaying(true);
        setIsPaused(false);
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = setupAudio(audioUrl);
      await audio.play();
      setIsPlaying(true);
      setIsPaused(false);
      return;
    }

    // Não tem URL — gera agora (lazy)
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-generate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            post_id: postId,
            html_content: htmlContent,
          }),
        }
      );

      if (!response.ok) throw new Error('Falha ao gerar áudio');

      const { audio_url } = await response.json();
      setAudioUrl(audio_url);

      const audio = setupAudio(audio_url);
      await audio.play();
      setIsPlaying(true);
      setIsPaused(false);
    } catch (err) {
      console.error('TTS generation error:', err);
      setError('Não foi possível gerar o áudio. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  }, [audioUrl, isPaused, postId, htmlContent, setupAudio]);

  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsPaused(true);
    }
  }, []);

  const handleStop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
  }, []);

  // Estado idle — botão simples
  if (!isPlaying && !isPaused && !isGenerating) {
    return (
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePlay}
          className="gap-2 text-muted-foreground hover:text-foreground border-border/60"
        >
          <Headphones className="w-4 h-4" />
          Ouvir artigo
        </Button>
        {error && (
          <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
            <WarningCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  // Estado gerando
  if (isGenerating) {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-4 py-3">
        <Spinner className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Gerando áudio... (pode levar alguns segundos)
        </span>
      </div>
    );
  }

  // Estado ativo — mini player
  return (
    <div className="mb-6 rounded-xl border border-border/60 bg-card/50 px-4 py-3">
      <div className="flex items-center gap-3 w-full">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={isPlaying ? handlePause : handlePlay}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" weight="fill" />
          ) : (
            <Play className="w-4 h-4" weight="fill" />
          )}
        </Button>

        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-xs text-muted-foreground truncate">
            {isPaused ? 'Pausado' : articleTitle}
          </p>
          <Progress value={progress} className="h-1" />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={handleStop}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
