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

export function useArticleTTS(blocks: string[]): UseArticleTTSReturn {
  const [status, setStatus] = useState<TTSStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentBlockRef = useRef(0);
  const isCancelledRef = useRef(false);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const getBestVoice = useCallback((): SpeechSynthesisVoice | null => {
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

  const speakBlock = useCallback((index: number) => {
    if (isCancelledRef.current) return;
    if (index >= blocks.length) {
      setStatus('idle');
      setProgress(0);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(blocks[index]);
    const voice = getBestVoice();
    if (voice) utterance.voice = voice;

    utterance.lang = 'pt-BR';
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      if (index === 0) setStatus('playing');
    };

    utterance.onend = () => {
      if (isCancelledRef.current) return;
      const next = index + 1;
      currentBlockRef.current = next;
      setProgress(Math.round((next / blocks.length) * 100));
      speakBlock(next);
    };

    utterance.onerror = (event) => {
      if (event.error === 'interrupted' || event.error === 'canceled') return;
      setStatus('error');
      setErrorMessage('Não foi possível iniciar a leitura.');
    };

    window.speechSynthesis.speak(utterance);
  }, [blocks, getBestVoice]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    isCancelledRef.current = true;
    window.speechSynthesis.cancel();
    currentBlockRef.current = 0;
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
    if (!blocks.length) return;

    if (status === 'paused') {
      window.speechSynthesis.resume();
      setStatus('playing');
      return;
    }

    isCancelledRef.current = false;
    window.speechSynthesis.cancel();
    currentBlockRef.current = 0;
    setStatus('loading');
    setProgress(0);

    const startSpeaking = () => speakBlock(0);

    if (window.speechSynthesis.getVoices().length > 0) {
      startSpeaking();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        startSpeaking();
      };
    }
  }, [blocks, status, isSupported, speakBlock]);

  const pause = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.pause();
    setStatus('paused');
  }, [isSupported]);

  return { status, progress, play, pause, stop, isSupported, errorMessage };
}
