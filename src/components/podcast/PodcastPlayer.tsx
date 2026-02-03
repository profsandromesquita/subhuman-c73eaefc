import { useRef, useState, useEffect } from "react";
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

interface PodcastPlayerProps {
  audioUrl: string;
  title: string;
  coverUrl?: string | null;
}

export function PodcastPlayer({ audioUrl, title, coverUrl }: PodcastPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

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
        <div className="aspect-square w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-secondary">
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
