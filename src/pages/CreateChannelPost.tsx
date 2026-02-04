import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, PaperPlaneTilt } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { MediaUploader } from "@/components/editor/MediaUploader";
import { useMediaUpload, MediaFile } from "@/hooks/useMediaUpload";
import { useAuth } from "@/hooks/useAuth";
import { useChannelAccess } from "@/hooks/useChannelAccess";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Channel {
  id: string;
  name: string;
}

export default function CreateChannelPost() {
  const { channelId, postId } = useParams<{ channelId: string; postId?: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, loading: accessLoading } = useChannelAccess(channelId);
  const { saveMediaToPost } = useMediaUpload();

  const isEditMode = !!postId;

  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [originalAuthorId, setOriginalAuthorId] = useState<string | null>(null);

  useEffect(() => {
    if (channelId) {
      fetchChannel();
    }
    if (postId && user) {
      fetchPostForEdit();
    }
  }, [channelId, postId, user]);

  useEffect(() => {
    // Redirect if not authenticated
    if (!authLoading && !user) {
      navigate(`/channels/${channelId}`);
      toast.error("Você precisa estar logado para publicar");
    }
  }, [authLoading, user, channelId, navigate]);

  useEffect(() => {
    // Redirect if no access
    if (!accessLoading && !hasAccess) {
      navigate(`/channels/${channelId}`);
      toast.error("Você não tem acesso a este canal");
    }
  }, [accessLoading, hasAccess, channelId, navigate]);

  const fetchChannel = async () => {
    const { data, error } = await supabase
      .from("channels")
      .select("id, name")
      .eq("id", channelId)
      .single();

    if (!error && data) {
      setChannel(data);
    }
    setLoading(false);
  };

  const fetchPostForEdit = async () => {
    if (!postId) return;

    const { data: postData, error } = await supabase
      .from("channel_posts")
      .select("title, content, author_id")
      .eq("id", postId)
      .single();

    if (error || !postData) {
      toast.error("Publicação não encontrada");
      navigate(`/channels/${channelId}`);
      return;
    }

    // Verificar se é o autor
    if (postData.author_id !== user?.id) {
      toast.error("Você não pode editar esta publicação");
      navigate(`/channels/${channelId}`);
      return;
    }

    setOriginalAuthorId(postData.author_id);
    setTitle(postData.title || "");
    setContent(postData.content);

    // Buscar mídia existente
    const { data: mediaData } = await supabase
      .from("channel_post_media")
      .select("*")
      .eq("post_id", postId)
      .order("sort_order");

    if (mediaData) {
      setMedia(mediaData.map(m => ({
        url: m.file_url,
        type: m.file_type as "image" | "video" | "audio" | "document" | "youtube",
        name: m.file_name || undefined,
        youtubeId: m.youtube_id || undefined,
      })));
    }
  };

  const handleMediaAdd = (mediaFile: MediaFile) => {
    setMedia((prev) => [...prev, mediaFile]);
  };

  const handleMediaRemove = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    // Check if there's content (text or media)
    const hasTextContent = content.replace(/<[^>]*>/g, "").trim().length > 0;
    const hasMedia = media.length > 0;

    if (!hasTextContent && !hasMedia) {
      toast.error("Adicione algum conteúdo à sua publicação");
      return;
    }

    setSubmitting(true);

    try {
      if (isEditMode) {
        // Modo de edição - atualizar publicação existente
        const { error: updateError } = await supabase
          .from("channel_posts")
          .update({
            title: title.trim() || null,
            content: content,
            updated_at: new Date().toISOString(),
          })
          .eq("id", postId);

        if (updateError) {
          console.error("Error updating post:", updateError);
          toast.error("Erro ao atualizar publicação");
          return;
        }

        toast.success("Publicação atualizada!");
        navigate(`/channels/${channelId}/post/${postId}`);
      } else {
        // Modo de criação - criar nova publicação
        const { data: post, error: postError } = await supabase
          .from("channel_posts")
          .insert({
            channel_id: channelId,
            author_id: user.id,
            title: title.trim() || null,
            content: content,
          } as any)
          .select("id")
          .single();

        if (postError) {
          console.error("Error creating post:", postError);
          toast.error("Erro ao criar publicação");
          return;
        }

        // Save media if any
        if (media.length > 0 && post) {
          await saveMediaToPost(post.id, media);
        }

        toast.success("Publicação criada!");
        navigate(`/channels/${channelId}/post/${post.id}`);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error(isEditMode ? "Erro ao atualizar publicação" : "Erro ao criar publicação");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading || accessLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-safe overflow-y-auto">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border"
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(isEditMode ? `/channels/${channelId}/post/${postId}` : `/channels/${channelId}`)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-semibold">{isEditMode ? "Editar Publicação" : "Nova Publicação"}</h1>
              <p className="text-sm text-muted-foreground">{channel?.name}</p>
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="gap-2"
          >
            <PaperPlaneTilt className="w-4 h-4" weight="bold" />
            {submitting ? (isEditMode ? "Salvando..." : "Publicando...") : (isEditMode ? "Salvar" : "Publicar")}
          </Button>
        </div>
      </motion.header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-32 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Title */}
          <div>
            <Input
              type="text"
              placeholder="Título (opcional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-medium bg-input border border-border rounded-lg px-4 py-3 focus-visible:ring-1 focus-visible:ring-border placeholder:text-muted-foreground"
            />
          </div>

          {/* Rich Text Editor */}
          <div>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Escreva sua publicação..."
            />
          </div>

          {/* Media Section */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium mb-4">Mídia</h3>
              <MediaUploader
                media={media}
                onMediaAdd={handleMediaAdd}
                onMediaRemove={handleMediaRemove}
              />
            </CardContent>
          </Card>

          {/* Tips */}
          <div className="text-xs text-muted-foreground space-y-1 px-1">
            <p>💡 Use a barra de ferramentas para formatar seu texto com negrito, itálico, cores e mais.</p>
            <p>🎬 Adicione vídeos do YouTube colando o link na seção de mídia.</p>
            <p>📎 Você pode anexar imagens, vídeos, áudios e PDFs.</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
