import { useRef, useState, useEffect, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Rewind,
  FastForward,
  SpeakerHigh,
  SpeakerSlash,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useTrackPodcastListen } from "@/hooks/usePodcasts";

interface PodcastPlayerProps {
  audioUrl: string;
  title: string;
  coverUrl?: string | null;
  podcastId?: string;
  durationSeconds?: number | null;
}

export function PodcastPlayer({ audioUrl, title, coverUrl, podcastId, durationSeconds }: PodcastPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const trackListen = useTrackPodcastListen();
  const lastTrackedRef = useRef(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      // Mark as completed on end
      if (podcastId) {
        trackListen.mutate({ podcastId, progressSeconds: Math.floor(audio.duration), totalSeconds: durationSeconds || Math.floor(audio.duration) });
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [podcastId, durationSeconds]);

  // Ref for Media Session handlers
  const togglePlayRef = useRef(() => {});

  // Track progress every 30 seconds
  useEffect(() => {
    if (!podcastId || !isPlaying) return;
    const interval = setInterval(() => {
      const audio = audioRef.current;
      if (!audio) return;
      const secs = Math.floor(audio.currentTime);
      if (secs - lastTrackedRef.current >= 30) {
        lastTrackedRef.current = secs;
        trackListen.mutate({ podcastId, progressSeconds: secs, totalSeconds: durationSeconds || Math.floor(audio.duration) });
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [podcastId, isPlaying, durationSeconds]);

  // Media Session API
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: "Subhumano",
      album: "Podcast",
      artwork: coverUrl
        ? [
            { src: coverUrl, sizes: "96x96", type: "image/png" },
            { src: coverUrl, sizes: "256x256", type: "image/png" },
            { src: coverUrl, sizes: "512x512", type: "image/png" },
          ]
        : [],
    });

    navigator.mediaSession.setActionHandler("play", () => togglePlayRef.current());
    navigator.mediaSession.setActionHandler("pause", () => togglePlayRef.current());
    navigator.mediaSession.setActionHandler("seekbackward", () => skip(-15));
    navigator.mediaSession.setActionHandler("seekforward", () => skip(15));

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("seekbackward", null);
      navigator.mediaSession.setActionHandler("seekforward", null);
    };
  }, [title, coverUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Keep togglePlayRef in sync
  togglePlayRef.current = togglePlay;

  const seek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = Math.max(0, Math.min(audio.currentTime + seconds, duration));
  };

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = value[0];
    audio.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume || 1;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return "0:00";
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full space-y-6">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Cover Image */}
      {coverUrl && (
        <div className="aspect-video w-full rounded-2xl overflow-hidden bg-secondary">
          <img
            src={coverUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-2">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={1}
          onValueChange={seek}
          className="w-full cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Skip Back */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => skip(-15)}
          className="h-12 w-12 rounded-full"
        >
          <Rewind className="w-6 h-6" weight="fill" />
        </Button>

        {/* Play/Pause */}
        <Button
          onClick={togglePlay}
          size="icon"
          className={cn(
            "h-16 w-16 rounded-full bg-foreground text-background hover:bg-foreground/90"
          )}
        >
          {isPlaying ? (
            <Pause className="w-8 h-8" weight="fill" />
          ) : (
            <Play className="w-8 h-8 ml-1" weight="fill" />
          )}
        </Button>

        {/* Skip Forward */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => skip(15)}
          className="h-12 w-12 rounded-full"
        >
          <FastForward className="w-6 h-6" weight="fill" />
        </Button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center justify-center gap-3 max-w-[200px] mx-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className="h-9 w-9 flex-shrink-0"
        >
          {isMuted ? (
            <SpeakerSlash className="w-5 h-5" />
          ) : (
            <SpeakerHigh className="w-5 h-5" />
          )}
        </Button>
        <Slider
          value={[isMuted ? 0 : volume]}
          max={1}
          step={0.01}
          onValueChange={handleVolumeChange}
          className="w-full cursor-pointer"
        />
      </div>
    </div>
  );
}
