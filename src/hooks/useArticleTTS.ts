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
const FETCH_TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;

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

async function fetchTTSWithRetry(
  text: string,
  accessToken: string,
  supabaseUrl: string,
  retriesLeft = MAX_RETRIES
): Promise<Blob> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/tts-generate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`TTS failed: ${response.status}`);
    }

    return await response.blob();

  } catch (err) {
    clearTimeout(timeoutId);

    const isTimeout = err instanceof Error && err.name === 'AbortError';
    const isNetworkError = err instanceof TypeError;

    if ((isTimeout || isNetworkError) && retriesLeft > 0) {
      console.log(`TTS retry — tentativas restantes: ${retriesLeft}`);
      return fetchTTSWithRetry(text, accessToken, supabaseUrl, retriesLeft - 1);
    }

    throw err;
  }
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

      const audioBlob = await fetchTTSWithRetry(
        chunksRef.current[chunkIndex],
        session.access_token,
        supabaseUrl
      );

      if (isCancelledRef.current) return;

      const objectUrl = URL.createObjectURL(audioBlob);
      objectUrlsRef.current.push(objectUrl);

      const audio = new Audio(objectUrl);
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        if (
          !isCancelledRef.current &&
          audio.duration &&
          isFinite(audio.duration) &&
          audio.duration > 0
        ) {
          const totalChunks = chunksRef.current.length;
          const completedBase = chunkIndex / totalChunks;
          const currentChunkProgress =
            (audio.currentTime / audio.duration) / totalChunks;
          const totalProgress = Math.round(
            (completedBase + currentChunkProgress) * 100
          );
          setProgress(Math.min(totalProgress, 99));
        }
      };

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

      await audio.play();
      if (chunkIndex === 0) setStatus('playing');

    } catch (err) {
      if (isCancelledRef.current) return;
      console.error('TTS error após retries:', err);
      setStatus('error');
      setErrorMessage('Não foi possível gerar o áudio. Tente novamente.');
    }
  }, [revokeObjectUrls]);

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
