import { useState, useEffect, useRef, useCallback } from 'react';

export type TTSStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error' | 'unsupported';

interface UseArticleTTSReturn {
  status: TTSStatus;
  progress: number;
  play: () => void;
  pause: () => void;
  stop: () => void;
  isSupported: boolean;
  errorMessage: string | null;
}

function splitIntoChunks(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > 200 && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

export function useArticleTTS(text: string): UseArticleTTSReturn {
  const [status, setStatus] = useState<TTSStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const chunksRef = useRef<string[]>([]);
  const currentChunkRef = useRef(0);
  const isCancelledRef = useRef(false);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const getBestVoice = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find(v => v.name === 'Luciana') ||
      voices.find(v => v.name.toLowerCase().includes('brasil')) ||
      voices.find(v => v.lang === 'pt-BR') ||
      voices.find(v => v.lang === 'pt_BR') ||
      voices.find(v => v.lang.startsWith('pt')) ||
      null
    );
  }, []);

  const speakChunk = useCallback((chunkIndex: number) => {
    if (isCancelledRef.current) return;
    if (chunkIndex >= chunksRef.current.length) {
      setStatus('idle');
      setProgress(0);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunksRef.current[chunkIndex]);
    const voice = getBestVoice();
    if (voice) utterance.voice = voice;

    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      if (chunkIndex === 0) setStatus('playing');
    };

    utterance.onend = () => {
      if (isCancelledRef.current) return;
      const nextIndex = chunkIndex + 1;
      currentChunkRef.current = nextIndex;
      setProgress(Math.round((nextIndex / chunksRef.current.length) * 100));
      speakChunk(nextIndex);
    };

    utterance.onerror = (event) => {
      if (event.error === 'interrupted' || event.error === 'canceled') return;
      setStatus('error');
      setErrorMessage('Não foi possível iniciar a leitura.');
    };

    window.speechSynthesis.speak(utterance);
  }, [getBestVoice]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    isCancelledRef.current = true;
    window.speechSynthesis.cancel();
    currentChunkRef.current = 0;
    setStatus('idle');
    setProgress(0);
  }, [isSupported]);

  useEffect(() => {
    return () => {
      isCancelledRef.current = true;
      if (isSupported) window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  const play = useCallback(() => {
    if (!isSupported) { setStatus('unsupported'); return; }
    if (!text) return;

    if (status === 'paused') {
      window.speechSynthesis.resume();
      setStatus('playing');
      return;
    }

    isCancelledRef.current = false;
    window.speechSynthesis.cancel();
    chunksRef.current = splitIntoChunks(text);
    currentChunkRef.current = 0;
    setStatus('loading');
    setProgress(0);

    const startSpeaking = () => {
      speakChunk(0);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      startSpeaking();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        startSpeaking();
      };
    }
  }, [text, status, isSupported, speakChunk]);

  const pause = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.pause();
    setStatus('paused');
  }, [isSupported]);

  return { status, progress, play, pause, stop, isSupported, errorMessage };
}
