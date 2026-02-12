import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { PostHeader } from "@/components/post/PostHeader";
import { PostContent } from "@/components/post/PostContent";
import { PostEngagement } from "@/components/post/PostEngagement";
import { CommentSection } from "@/components/post/CommentSection";
import { CommentInput } from "@/components/post/CommentInput";
import { type MentionData } from "@/components/MentionCommentInput";
import { useAuth } from "@/hooks/useAuth";
import { useLikeSpaceUpdate, useAddSpaceUpdateComment } from "@/hooks/usePosts";
import { usePostDetail, PostComment } from "@/hooks/usePostDetail";
import { useCreateMentions } from "@/hooks/useMentions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthPromptDialog } from "@/components/AuthPromptDialog";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PostDetail() {
  const { spaceSlug, postSlug } = useParams<{ spaceSlug: string; postSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const commentSectionRef = useRef<HTMLDivElement>(null);

  const likeMutation = useLikeSpaceUpdate();
  const commentMutation = useAddSpaceUpdateComment();
  const createMentions = useCreateMentions();

  const { data: postDetail, isLoading } = usePostDetail(spaceSlug, postSlug);

  // Local optimistic state overrides
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
  const [optimisticLikesCount, setOptimisticLikesCount] = useState<number | null>(null);
  const [optimisticSaved, setOptimisticSaved] = useState<boolean | null>(null);
  const [localComments, setLocalComments] = useState<PostComment[] | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string } | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const post = postDetail?.post || null;
  const postId = post?.id || null;
  const isLiked = optimisticLiked ?? postDetail?.isLiked ?? false;
  const isSaved = optimisticSaved ?? postDetail?.isSaved ?? false;
  const likesCount = optimisticLikesCount ?? postDetail?.likesCount ?? 0;
  const comments = localComments ?? postDetail?.comments ?? [];
  const media = postDetail?.media ?? [];

  const handleLikeToggle = async () => {
    if (!user) { setShowAuthPrompt(true); return; }
    if (!postId) return;

    const wasLiked = isLiked;
    setOptimisticLiked(!isLiked);
    setOptimisticLikesCount(wasLiked ? likesCount - 1 : likesCount + 1);

    try {
      await likeMutation.mutateAsync({ updateId: postId, isLiked: wasLiked });
    } catch {
      setOptimisticLiked(wasLiked);
      setOptimisticLikesCount(wasLiked ? likesCount : likesCount);
    }
  };

  const handleSaveToggle = async () => {
    if (!user) { setShowAuthPrompt(true); return; }
    if (!postId) return;

    const wasSaved = isSaved;
    setOptimisticSaved(!isSaved);

    try {
      if (wasSaved) {
        await supabase.from("saved_updates").delete().eq("update_id", postId).eq("user_id", user.id);
        toast.success("Removido dos salvos");
      } else {
        await supabase.from("saved_updates").insert({ update_id: postId, user_id: user.id });
        toast.success("Post salvo!");
      }
    } catch {
      setOptimisticSaved(wasSaved);
      toast.error("Não foi possível salvar");
    }
  };

  const handleCommentClick = () => {
    commentSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) { setShowAuthPrompt(true); return; }

    const currentComments = comments;
    let isCurrentlyLiked = false;
    currentComments.forEach(c => {
      if (c.id === commentId) isCurrentlyLiked = c.isLiked;
      c.replies.forEach(r => { if (r.id === commentId) isCurrentlyLiked = r.isLiked; });
    });

    const updated = currentComments.map(comment => {
      if (comment.id === commentId) {
        return { ...comment, isLiked: !comment.isLiked, likesCount: comment.isLiked ? comment.likesCount - 1 : comment.likesCount + 1 };
      }
      return {
        ...comment,
        replies: comment.replies.map(reply =>
          reply.id === commentId
            ? { ...reply, isLiked: !reply.isLiked, likesCount: reply.isLiked ? reply.likesCount - 1 : reply.likesCount + 1 }
            : reply
        ),
      };
    });
    setLocalComments(updated);

    try {
      if (isCurrentlyLiked) {
        await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id);
      } else {
        await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: user.id });
      }
    } catch {
      queryClient.invalidateQueries({ queryKey: ["post-detail", spaceSlug, postSlug] });
    }
  };

  const handleReplyComment = (commentId: string, authorName: string) => {
    setReplyTo({ id: commentId, authorName });
  };

  const handleSubmitComment = async (content: string, parentId?: string, mentions?: MentionData[]) => {
    if (!user) { setShowAuthPrompt(true); return; }
    if (!postId) return;

    try {
      await commentMutation.mutateAsync({ updateId: postId, content, parentId });
      // Save mentions if any
      if (mentions && mentions.length > 0) {
        createMentions.mutate(
          mentions.map((m) => ({
            mentionedUserId: m.type === "user" ? m.id : undefined,
            mentionedCompanyId: m.type === "company" ? m.id : undefined,
            contextType: "update_comment",
            contextId: postId,
          }))
        );
      }
      setLocalComments(null);
      setReplyTo(null);
      toast.success("Comentário enviado!");
    } catch {
      toast.error("Não foi possível enviar o comentário");
    }
  };

  const handleEditComment = async (commentId: string, newContent: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("update_comments").update({ content: newContent }).eq("id", commentId).eq("user_id", user.id);
      if (error) throw error;

      const updated = comments.map(comment => {
        if (comment.id === commentId) return { ...comment, content: newContent };
        return { ...comment, replies: comment.replies.map(r => r.id === commentId ? { ...r, content: newContent } : r) };
      });
      setLocalComments(updated);
      toast.success("Comentário atualizado!");
    } catch {
      toast.error("Não foi possível editar o comentário");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("update_comments").delete().eq("id", commentId).eq("user_id", user.id);
      if (error) throw error;

      const updated = comments
        .filter(c => c.id !== commentId)
        .map(c => ({ ...c, replies: c.replies.filter(r => r.id !== commentId) }));
      setLocalComments(updated);
      toast.success("Comentário excluído!");
    } catch {
      toast.error("Não foi possível excluir o comentário");
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "";
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ptBR });
  };

  const estimateReadTime = (content: string | null): string => {
    if (!content) return "1 min de leitura";
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min de leitura`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-safe">
        <div className="pt-14 px-5 max-w-2xl mx-auto space-y-4">
          <Skeleton className="w-full aspect-video" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background pt-safe flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Post não encontrado</p>
          <button onClick={() => navigate(`/spaces/${spaceSlug}`)} className="text-primary">
            Voltar para o espaço
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-safe">
      <PostHeader
        isSaved={isSaved}
        onSaveToggle={handleSaveToggle}
        title={post.title}
        isGuest={!user}
      />

      {!user && (
        <div className="fixed top-14 left-0 right-0 z-40 bg-card border-b border-border">
          <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Conheça o Subhumano</span>
            <Button size="sm" variant="outline" onClick={() => navigate("/")}>
              Ver plataforma
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <AuthPromptDialog open={showAuthPrompt} onOpenChange={setShowAuthPrompt} />

      <PostContent
        title={post.title}
        content={post.content || ""}
        thumbnailUrl={post.thumbnail_url}
        mediaType={post.media_type}
        spaceName={post.space.name}
        spaceSlug={post.space.slug}
        authorName={post.author?.full_name || "Autor"}
        publishedAt={formatTime(post.published_at || post.created_at)}
        readTime={estimateReadTime(post.content)}
        media={media}
        author={post.author}
      />

      <PostEngagement
        likesCount={likesCount}
        commentsCount={comments.reduce((acc, c) => acc + 1 + c.replies.length, 0)}
        isLiked={isLiked}
        onLikeToggle={handleLikeToggle}
        onCommentClick={handleCommentClick}
      />

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
    </div>
  );
}
