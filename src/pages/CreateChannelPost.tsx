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
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, loading: accessLoading } = useChannelAccess(channelId);
  const { saveMediaToPost } = useMediaUpload();

  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (channelId) {
      fetchChannel();
    }
  }, [channelId]);

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
      // Create the post
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
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao criar publicação");
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
    <div className="min-h-screen bg-background">
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
              onClick={() => navigate(`/channels/${channelId}`)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-semibold">Nova Publicação</h1>
              <p className="text-sm text-muted-foreground">{channel?.name}</p>
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="gap-2"
          >
            <PaperPlaneTilt className="w-4 h-4" weight="bold" />
            {submitting ? "Publicando..." : "Publicar"}
          </Button>
        </div>
      </motion.header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
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
              className="text-lg font-medium border-none bg-transparent px-0 focus-visible:ring-0 placeholder:text-muted-foreground"
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
