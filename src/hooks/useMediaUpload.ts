import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type MediaType = "image" | "video" | "audio" | "document" | "youtube";

export interface MediaFile {
  id?: string;
  file?: File;
  url: string;
  type: MediaType;
  name: string;
  size?: number;
  mimeType?: string;
  youtubeId?: string;
  uploading?: boolean;
  progress?: number;
}

export function useMediaUpload() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (file: File): Promise<MediaFile | null> => {
    if (!user) {
      toast.error("Você precisa estar logado");
      return null;
    }

    const type = getMediaType(file.type);
    if (!type) {
      toast.error("Tipo de arquivo não suportado");
      return null;
    }

    // Validate file size (50MB max)
    if (file.size > 52428800) {
      toast.error("Arquivo muito grande. Máximo 50MB.");
      return null;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Generate unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("channel-media")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Upload error:", error);
        toast.error("Erro ao fazer upload do arquivo");
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("channel-media")
        .getPublicUrl(data.path);

      setProgress(100);

      return {
        url: urlData.publicUrl,
        type,
        name: file.name,
        size: file.size,
        mimeType: file.type,
      };
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Falha no upload");
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const saveMediaToPost = async (postId: string, media: MediaFile[]) => {
    if (media.length === 0) return;

    const mediaRecords = media.map((m, index) => ({
      post_id: postId,
      file_url: m.url,
      file_type: m.type,
      file_name: m.name,
      file_size: m.size || null,
      mime_type: m.mimeType || null,
      youtube_id: m.youtubeId || null,
      sort_order: index,
    }));

    const { error } = await supabase
      .from("channel_post_media")
      .insert(mediaRecords);

    if (error) {
      console.error("Error saving media:", error);
      toast.error("Erro ao salvar mídias");
    }
  };

  const extractYoutubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const createYoutubeMedia = (url: string): MediaFile | null => {
    const youtubeId = extractYoutubeId(url);
    if (!youtubeId) {
      toast.error("URL do YouTube inválida");
      return null;
    }

    return {
      url: `https://www.youtube.com/watch?v=${youtubeId}`,
      type: "youtube",
      name: `YouTube: ${youtubeId}`,
      youtubeId,
    };
  };

  const getMediaType = (mimeType: string): MediaType | null => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType === "application/pdf") return "document";
    return null;
  };

  const getAcceptedMimeTypes = () => {
    return "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/ogg,audio/mp3,application/pdf";
  };

  return {
    uploadFile,
    saveMediaToPost,
    createYoutubeMedia,
    extractYoutubeId,
    getAcceptedMimeTypes,
    uploading,
    progress,
  };
}
