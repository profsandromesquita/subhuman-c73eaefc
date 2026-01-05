import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Pause, 
  YoutubeLogo, 
  File, 
  DownloadSimple,
  X
} from "@phosphor-icons/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface MediaItem {
  id: string;
  file_url: string;
  file_type: string;
  file_name: string | null;
  youtube_id: string | null;
}

interface MediaGalleryProps {
  media: MediaItem[];
}

export function MediaGallery({ media }: MediaGalleryProps) {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  if (media.length === 0) return null;

  const images = media.filter((m) => m.file_type === "image");
  const videos = media.filter((m) => m.file_type === "video");
  const youtubeVideos = media.filter((m) => m.file_type === "youtube");
  const audios = media.filter((m) => m.file_type === "audio");
  const documents = media.filter((m) => m.file_type === "document");

  const renderImage = (item: MediaItem, index: number, isGrid = false) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className={`relative cursor-pointer overflow-hidden rounded-lg ${
        isGrid ? "aspect-square" : "aspect-video"
      }`}
      onClick={() => setSelectedMedia(item)}
    >
      <img
        src={item.file_url}
        alt={item.file_name || "Image"}
        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        loading="lazy"
      />
    </motion.div>
  );

  const renderVideo = (item: MediaItem) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative rounded-lg overflow-hidden"
    >
      <video
        src={item.file_url}
        controls
        className="w-full aspect-video rounded-lg bg-black"
        preload="metadata"
      />
    </motion.div>
  );

  const renderYoutube = (item: MediaItem) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative rounded-lg overflow-hidden aspect-video"
    >
      <iframe
        src={`https://www.youtube.com/embed/${item.youtube_id}`}
        title="YouTube video"
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </motion.div>
  );

  const renderAudio = (item: MediaItem) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 p-4 rounded-lg bg-secondary"
    >
      <Button
        size="icon"
        variant="secondary"
        className="shrink-0"
        onClick={() => setIsPlaying(!isPlaying)}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" weight="fill" />
        ) : (
          <Play className="w-5 h-5" weight="fill" />
        )}
      </Button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.file_name || "Áudio"}</p>
        <audio
          src={item.file_url}
          controls
          className="w-full mt-2"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </div>
    </motion.div>
  );

  const renderDocument = (item: MediaItem) => (
    <motion.a
      key={item.id}
      href={item.file_url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
    >
      <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
        <File className="w-5 h-5 text-red-500" weight="fill" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.file_name || "Documento"}</p>
        <p className="text-xs text-muted-foreground">PDF</p>
      </div>
      <DownloadSimple className="w-5 h-5 text-muted-foreground" />
    </motion.a>
  );

  return (
    <div className="space-y-4">
      {/* Images Grid */}
      {images.length > 0 && (
        <div
          className={`grid gap-2 ${
            images.length === 1
              ? "grid-cols-1"
              : images.length === 2
              ? "grid-cols-2"
              : images.length === 3
              ? "grid-cols-3"
              : "grid-cols-2"
          }`}
        >
          {images.map((img, i) => renderImage(img, i, images.length > 1))}
        </div>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <div className="space-y-3">
          {videos.map(renderVideo)}
        </div>
      )}

      {/* YouTube Videos */}
      {youtubeVideos.length > 0 && (
        <div className="space-y-3">
          {youtubeVideos.map(renderYoutube)}
        </div>
      )}

      {/* Audios */}
      {audios.length > 0 && (
        <div className="space-y-2">
          {audios.map(renderAudio)}
        </div>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map(renderDocument)}
        </div>
      )}

      {/* Lightbox for images */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-none">
          <AnimatePresence>
            {selectedMedia && selectedMedia.file_type === "image" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative"
              >
                <img
                  src={selectedMedia.file_url}
                  alt={selectedMedia.file_name || "Image"}
                  className="w-full max-h-[80vh] object-contain rounded-lg"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-4 right-4"
                  onClick={() => setSelectedMedia(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}
