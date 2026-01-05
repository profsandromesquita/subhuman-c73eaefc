import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Image as ImageIcon, 
  VideoCamera, 
  MusicNote, 
  File, 
  YoutubeLogo,
  X,
  Plus,
  UploadSimple
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useMediaUpload, MediaFile, MediaType } from "@/hooks/useMediaUpload";

interface MediaUploaderProps {
  media: MediaFile[];
  onMediaAdd: (media: MediaFile) => void;
  onMediaRemove: (index: number) => void;
}

export function MediaUploader({ media, onMediaAdd, onMediaRemove }: MediaUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const { uploadFile, createYoutubeMedia, getAcceptedMimeTypes, uploading, progress } = useMediaUpload();

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const mediaFile = await uploadFile(file);
      if (mediaFile) {
        onMediaAdd(mediaFile);
      }
    }
    setIsDialogOpen(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleYoutubeAdd = () => {
    const media = createYoutubeMedia(youtubeUrl);
    if (media) {
      onMediaAdd(media);
      setYoutubeUrl("");
      setIsDialogOpen(false);
    }
  };

  const getMediaIcon = (type: MediaType) => {
    switch (type) {
      case "image":
        return <ImageIcon className="w-5 h-5" />;
      case "video":
        return <VideoCamera className="w-5 h-5" />;
      case "audio":
        return <MusicNote className="w-5 h-5" />;
      case "document":
        return <File className="w-5 h-5" />;
      case "youtube":
        return <YoutubeLogo className="w-5 h-5" weight="fill" />;
    }
  };

  const renderMediaPreview = (item: MediaFile, index: number) => {
    return (
      <motion.div
        key={item.url}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="relative group aspect-video rounded-lg overflow-hidden bg-secondary"
      >
        {item.type === "image" && (
          <img 
            src={item.url} 
            alt={item.name} 
            className="w-full h-full object-cover"
          />
        )}
        {item.type === "video" && (
          <video 
            src={item.url} 
            className="w-full h-full object-cover"
            muted
          />
        )}
        {item.type === "youtube" && (
          <div className="w-full h-full flex items-center justify-center bg-red-600/20">
            <img 
              src={`https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`} 
              alt="YouTube thumbnail"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <YoutubeLogo className="w-12 h-12 text-red-600" weight="fill" />
            </div>
          </div>
        )}
        {item.type === "audio" && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
            <MusicNote className="w-8 h-8 text-muted-foreground" />
            <span className="text-xs text-muted-foreground text-center truncate max-w-full">
              {item.name}
            </span>
          </div>
        )}
        {item.type === "document" && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
            <File className="w-8 h-8 text-muted-foreground" />
            <span className="text-xs text-muted-foreground text-center truncate max-w-full">
              {item.name}
            </span>
          </div>
        )}
        
        {/* Type badge */}
        <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 text-white text-xs flex items-center gap-1">
          {getMediaIcon(item.type)}
        </div>

        {/* Remove button */}
        <button
          type="button"
          onClick={() => onMediaRemove(index)}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Media Grid */}
      <AnimatePresence mode="popLayout">
        {media.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 gap-3"
          >
            {media.map((item, index) => renderMediaPreview(item, index))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            Fazendo upload... {progress}%
          </p>
        </div>
      )}

      {/* Add Media Button */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="w-full gap-2">
            <Plus className="w-4 h-4" />
            Adicionar mídia
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar mídia</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="youtube">YouTube</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4">
              {/* Drag & Drop Area */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                  ${dragActive ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}
                `}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={getAcceptedMimeTypes()}
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
                <UploadSimple className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">
                  Arraste arquivos ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground">
                  Imagens, vídeos, áudios ou PDFs (máx. 50MB)
                </p>
              </div>

              {/* Quick select buttons */}
              <div className="grid grid-cols-4 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-col h-auto py-3 gap-1"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = "image/*";
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-xs">Imagem</span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-col h-auto py-3 gap-1"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = "video/*";
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <VideoCamera className="w-5 h-5" />
                  <span className="text-xs">Vídeo</span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-col h-auto py-3 gap-1"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = "audio/*";
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <MusicNote className="w-5 h-5" />
                  <span className="text-xs">Áudio</span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-col h-auto py-3 gap-1"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = "application/pdf";
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <File className="w-5 h-5" />
                  <span className="text-xs">PDF</span>
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="youtube" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="Cole o link do YouTube aqui"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleYoutubeAdd();
                    }
                  }}
                  className="flex-1"
                />
                <Button 
                  type="button"
                  onClick={handleYoutubeAdd}
                  disabled={!youtubeUrl.trim()}
                >
                  Adicionar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Suporta links do YouTube, YouTube Shorts e links de embed.
              </p>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
