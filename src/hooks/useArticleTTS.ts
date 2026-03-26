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

export function useArticleTTS(text: string): UseArticleTTSReturn {
  const [status, setStatus] = useState<TTSStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setStatus('idle');
    setProgress(0);
  }, [isSupported]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const play = useCallback(() => {
    if (!isSupported) {
      setStatus('unsupported');
      return;
    }

    if (!text) return;

    if (status === 'paused') {
      window.speechSynthesis.resume();
      setStatus('playing');
      return;
    }

    window.speechSynthesis.cancel();
    setStatus('loading');

    const utterance = new SpeechSynthesisUtterance(text);

    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const ptBRVoice = voices.find(v =>
        v.lang === 'pt-BR' || v.lang === 'pt_BR'
      ) || voices.find(v => v.lang.startsWith('pt'));

      if (ptBRVoice) {
        utterance.voice = ptBRVoice;
      }
      utterance.lang = 'pt-BR';
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      setVoice();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        setVoice();
        window.speechSynthesis.onvoiceschanged = null;
      };
    }

    let charProgress = 0;
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        charProgress = event.charIndex;
        setProgress(Math.round((charProgress / text.length) * 100));
      }
    };

    utterance.onstart = () => setStatus('playing');
    utterance.onend = () => {
      setStatus('idle');
      setProgress(0);
    };

    utterance.onerror = (event) => {
      if (event.error !== 'interrupted') {
        setStatus('error');
        setErrorMessage('Não foi possível iniciar a leitura.');
      }
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [text, status, isSupported]);

  const pause = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.pause();
    setStatus('paused');
  }, [isSupported]);

  return {
    status,
    progress,
    play,
    pause,
    stop,
    isSupported,
    errorMessage,
  };
}
