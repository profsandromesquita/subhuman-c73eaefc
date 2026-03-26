import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TTSStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'error'
  | 'unsupported';

interface UseArticleTTSReturn {
  status: TTSStatus;
  progress: number;
  play: () => void;
  pause: () => void;
  stop: () => void;
  isSupported: boolean;
  errorMessage: string | null;
}

const MAX_CHARS_PER_CHUNK = 4000;

function splitIntoChunks(text: string): string[] {
  if (text.length <= MAX_CHARS_PER_CHUNK) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_CHARS_PER_CHUNK) {
      chunks.push(remaining.trim());
      break;
    }
    let cutAt = remaining.lastIndexOf('. ', MAX_CHARS_PER_CHUNK);
    if (cutAt === -1) cutAt = MAX_CHARS_PER_CHUNK;
    else cutAt += 1;

    chunks.push(remaining.slice(0, cutAt).trim());
    remaining = remaining.slice(cutAt).trim();
  }

  return chunks;
}

export function useArticleTTS(blocks: string[]): UseArticleTTSReturn {
  const [status, setStatus] = useState<TTSStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<string[]>([]);
  const currentChunkRef = useRef(0);
  const objectUrlsRef = useRef<string[]>([]);
  const isCancelledRef = useRef(false);

  const isSupported = true;

  const revokeObjectUrls = useCallback(() => {
    objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    isCancelledRef.current = true;
    stopAudio();
    revokeObjectUrls();
    currentChunkRef.current = 0;
    setStatus('idle');
    setProgress(0);
    setErrorMessage(null);
  }, [stopAudio, revokeObjectUrls]);

  useEffect(() => {
    return () => {
      isCancelledRef.current = true;
      stopAudio();
      revokeObjectUrls();
    };
  }, [stopAudio, revokeObjectUrls]);

  const setupAudioEvents = useCallback((audio: HTMLAudioElement, chunkIndex: number) => {
    audio.onended = () => {
      if (isCancelledRef.current) return;
      const next = chunkIndex + 1;
      currentChunkRef.current = next;
      setProgress(Math.round((next / chunksRef.current.length) * 100));
      generateAndPlayChunk(next);
    };
    audio.onerror = () => {
      if (isCancelledRef.current) return;
      setStatus('error');
      setErrorMessage('Erro ao reproduzir o áudio.');
    };
  }, []);

  const generateAndPlayChunk = useCallback(async (chunkIndex: number) => {
    if (isCancelledRef.current) return;
    if (chunkIndex >= chunksRef.current.length) {
      setStatus('idle');
      setProgress(0);
      revokeObjectUrls();
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/tts-generate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: chunksRef.current[chunkIndex] }),
        }
      );

      if (!response.ok) throw new Error(`TTS failed: ${response.status}`);
      if (isCancelledRef.current) return;

      // Streaming via MediaSource quando suportado
      if (
        typeof MediaSource !== 'undefined' &&
        MediaSource.isTypeSupported('audio/mpeg') &&
        response.body
      ) {
        const mediaSource = new MediaSource();
        const objectUrl = URL.createObjectURL(mediaSource);
        objectUrlsRef.current.push(objectUrl);

        const audio = new Audio(objectUrl);
        audioRef.current = audio;
        setupAudioEvents(audio, chunkIndex);

        mediaSource.addEventListener('sourceopen', async () => {
          try {
            const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
            const reader = response.body!.getReader();

            const pump = async (): Promise<void> => {
              if (isCancelledRef.current) {
                reader.cancel();
                if (mediaSource.readyState === 'open') mediaSource.endOfStream();
                return;
              }

              const { done, value } = await reader.read();

              if (done) {
                if (sourceBuffer.updating) {
                  await new Promise<void>(r => sourceBuffer.addEventListener('updateend', () => r(), { once: true }));
                }
                if (mediaSource.readyState === 'open') mediaSource.endOfStream();
                return;
              }

              if (sourceBuffer.updating) {
                await new Promise<void>(r => sourceBuffer.addEventListener('updateend', () => r(), { once: true }));
              }

              sourceBuffer.appendBuffer(value);
              await pump();
            };

            await pump();
          } catch (err) {
            if (!isCancelledRef.current) {
              console.error('MediaSource pump error:', err);
              setStatus('error');
              setErrorMessage('Erro ao reproduzir o áudio.');
            }
          }
        });

        await audio.play();
        if (chunkIndex === 0) setStatus('playing');

      } else {
        // Fallback para browsers sem MediaSource (Safari iOS)
        const audioBlob = await response.blob();
        if (isCancelledRef.current) return;

        const objectUrl = URL.createObjectURL(audioBlob);
        objectUrlsRef.current.push(objectUrl);

        const audio = new Audio(objectUrl);
        audioRef.current = audio;
        setupAudioEvents(audio, chunkIndex);

        await audio.play();
        if (chunkIndex === 0) setStatus('playing');
      }

    } catch (err) {
      if (isCancelledRef.current) return;
      console.error('TTS chunk error:', err);
      setStatus('error');
      setErrorMessage('Não foi possível gerar o áudio. Tente novamente.');
    }
  }, [revokeObjectUrls, setupAudioEvents]);

  const play = useCallback(async () => {
    if (!blocks.length) return;

    if (status === 'paused' && audioRef.current) {
      await audioRef.current.play();
      setStatus('playing');
      return;
    }

    isCancelledRef.current = false;
    stopAudio();
    revokeObjectUrls();
    currentChunkRef.current = 0;

    const fullText = blocks.join(' ');
    chunksRef.current = splitIntoChunks(fullText);

    setStatus('loading');
    setProgress(0);
    setErrorMessage(null);

    await generateAndPlayChunk(0);
  }, [blocks, status, stopAudio, revokeObjectUrls, generateAndPlayChunk]);

  const pause = useCallback(() => {
    if (audioRef.current && status === 'playing') {
      audioRef.current.pause();
      setStatus('paused');
    }
  }, [status]);

  return { status, progress, play, pause, stop, isSupported, errorMessage };
}
