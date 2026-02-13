import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PodcastPlayer } from "@/components/podcast/PodcastPlayer";
import { PodcastHeader } from "@/components/podcast/PodcastHeader";
import { PostEngagement } from "@/components/post/PostEngagement";
import { CommentSection } from "@/components/post/CommentSection";
import { CommentInput } from "@/components/post/CommentInput";
import { usePodcastBySlug, useLikePodcast, useSavePodcast, useAddPodcastComment, useLikePodcastComment, usePodcastProgress } from "@/hooks/usePodcasts";
import { usePodcastEngagement } from "@/hooks/usePodcastEngagement";
import { useAuth } from "@/hooks/useAuth";
import { useUserAccess } from "@/hooks/useUserAccess";
import { ContentPaywall } from "@/components/ContentPaywall";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

export default function PodcastDetail() {
  const { podcastSlug } = useParams<{ podcastSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canListenPodcast, canComment } = useUserAccess();
  const queryClient = useQueryClient();
  const commentSectionRef = useRef<HTMLDivElement>(null);
  
  const { data: podcast, isLoading } = usePodcastBySlug(podcastSlug);
  const { data: savedProgress } = usePodcastProgress(podcast?.id);
  const { data: engagement } = usePodcastEngagement(podcast?.id);
  const likeMutation = useLikePodcast();
  const saveMutation = useSavePodcast();
  const commentMutation = useAddPodcastComment();
  const commentLikeMutation = useLikePodcastComment();

  // Local optimistic state
  const [optimisticLike, setOptimisticLike] = useState<{ isLiked: boolean; likesCount: number } | null>(null);
  const [optimisticSave, setOptimisticSave] = useState<boolean | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string } | null>(null);

  const likesCount = optimisticLike?.likesCount ?? engagement?.likesCount ?? 0;
  const isLiked = optimisticLike?.isLiked ?? engagement?.isLiked ?? false;
  const isSaved = optimisticSave ?? engagement?.isSaved ?? false;
  const comments = engagement?.comments ?? [];

  const invalidateEngagement = () => {
    queryClient.invalidateQueries({ queryKey: ["podcast-engagement", podcast?.id] });
  };

  const handleLikeToggle = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para curtir");
      return;
    }

    const newIsLiked = !isLiked;
    const newCount = newIsLiked ? likesCount + 1 : likesCount - 1;
    setOptimisticLike({ isLiked: newIsLiked, likesCount: newCount });

    try {
      await likeMutation.mutateAsync({ podcastId: podcast!.id, isLiked: !newIsLiked });
      invalidateEngagement();
    } catch {
      setOptimisticLike(null);
    }
  };

  const handleSaveToggle = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para salvar");
      return;
    }

    const newSaved = !isSaved;
    setOptimisticSave(newSaved);

    try {
      await saveMutation.mutateAsync({ podcastId: podcast!.id, isSaved: !newSaved });
      invalidateEngagement();
      toast.success(newSaved ? "Podcast salvo!" : "Removido dos salvos");
    } catch {
      setOptimisticSave(null);
      toast.error("Não foi possível salvar");
    }
  };

  const handleCommentClick = () => {
    commentSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      toast.error("Você precisa estar logado para curtir");
      return;
    }

    let isCurrentlyLiked = false;
    comments.forEach(comment => {
      if (comment.id === commentId) isCurrentlyLiked = comment.isLiked;
      comment.replies.forEach(reply => {
        if (reply.id === commentId) isCurrentlyLiked = reply.isLiked;
      });
    });

    try {
      await commentLikeMutation.mutateAsync({ commentId, isLiked: isCurrentlyLiked });
      invalidateEngagement();
    } catch {
      // Refetch on error
      invalidateEngagement();
    }
  };

  const handleReplyComment = (commentId: string, authorName: string) => {
    setReplyTo({ id: commentId, authorName });
  };

  const handleSubmitComment = async (content: string, parentId?: string) => {
    if (!user) {
      toast.error("Você precisa estar logado para comentar");
      return;
    }

    try {
      await commentMutation.mutateAsync({ podcastId: podcast!.id, content, parentId });
      invalidateEngagement();
      setReplyTo(null);
      toast.success("Comentário enviado!");
    } catch {
      toast.error("Não foi possível enviar o comentário");
    }
  };

  const handleEditComment = async (commentId: string, newContent: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("podcast_comments")
        .update({ content: newContent })
        .eq("id", commentId)
        .eq("user_id", user.id);

      if (error) throw error;
      invalidateEngagement();
      toast.success("Comentário atualizado!");
    } catch {
      toast.error("Não foi possível editar o comentário");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("podcast_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id);

      if (error) throw error;
      invalidateEngagement();
      toast.success("Comentário excluído!");
    } catch {
      toast.error("Não foi possível excluir o comentário");
    }
  };

  if (isLoading) {
    return (
      <AppLayout showNav={false}>
        <div className="max-w-lg mx-auto px-4 pt-20 pb-24 space-y-6 animate-pulse">
          <div className="aspect-video w-full rounded-2xl bg-secondary" />
          <div className="h-8 w-3/4 bg-secondary rounded mx-auto" />
          <div className="h-4 w-1/2 bg-secondary rounded mx-auto" />
          <div className="h-12 w-full bg-secondary rounded" />
        </div>
      </AppLayout>
    );
  }

  if (!podcast) {
    return (
      <AppLayout showNav={false}>
        <PodcastHeader isSaved={false} onSaveToggle={() => {}} title="" />
        <div className="max-w-lg mx-auto px-4 pt-20 pb-24 flex flex-col items-center justify-center py-16 text-center">
          <h3 className="font-medium text-foreground">Podcast não encontrado</h3>
        </div>
      </AppLayout>
    );
  }

  const timeAgo = podcast.published_at
    ? formatDistanceToNow(new Date(podcast.published_at), { addSuffix: true, locale: ptBR })
    : null;

  return (
    <AppLayout showNav={false}>
      <PodcastHeader 
        isSaved={isSaved} 
        onSaveToggle={handleSaveToggle}
        title={podcast.title}
      />

      <div className="pt-14">
        <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
          {canListenPodcast ? (
            <PodcastPlayer
              audioUrl={podcast.audio_url}
              title={podcast.title}
              coverUrl={podcast.cover_url}
              podcastId={podcast.id}
              durationSeconds={podcast.duration_seconds}
              initialProgress={savedProgress?.completed ? null : savedProgress?.progress_seconds}
            />
          ) : (
            <ContentPaywall maxLines={0} type="podcast">
              <div className="aspect-video w-full rounded-2xl bg-secondary flex items-center justify-center">
                <img src={podcast.cover_url || ''} alt="" className="w-full h-full object-cover rounded-2xl opacity-50" />
              </div>
            </ContentPaywall>
          )}

          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-bold text-foreground">{podcast.title}</h1>
            
            {podcast.spaces && (
              <p className="text-sm text-muted-foreground">
                {podcast.spaces.name}
                {timeAgo && ` · ${timeAgo}`}
              </p>
            )}

            {podcast.tags && podcast.tags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {podcast.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {podcast.description && (
              <div className="text-muted-foreground text-left mt-6 whitespace-pre-wrap leading-relaxed">
                {podcast.description}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <PostEngagement
            likesCount={likesCount}
            commentsCount={comments.length}
            isLiked={isLiked}
            onLikeToggle={handleLikeToggle}
            onCommentClick={handleCommentClick}
          />
        </div>

        {canComment && (
          <>
            <div ref={commentSectionRef}>
              <CommentSection
                comments={comments}
                currentUserId={user?.id}
                onLikeComment={handleLikeComment}
                onReplyComment={handleReplyComment}
                onEditComment={handleEditComment}
                onDeleteComment={handleDeleteComment}
              />
            </div>

            <CommentInput
              onSubmit={handleSubmitComment}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}
