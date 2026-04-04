import { useState, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { PostHeader } from "@/components/post/PostHeader";
import { PostContent } from "@/components/post/PostContent";
import { PostEngagement } from "@/components/post/PostEngagement";
import { CommentSection } from "@/components/post/CommentSection";
import { CommentInput } from "@/components/post/CommentInput";
import { type MentionData } from "@/components/MentionCommentInput";
import { useAuth } from "@/hooks/useAuth";
import { useUserAccess } from "@/hooks/useUserAccess";
import { useLikeSpaceUpdate, useAddSpaceUpdateComment } from "@/hooks/usePosts";
import { usePostDetail, PostComment } from "@/hooks/usePostDetail";
import { useCreateMentions } from "@/hooks/useMentions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthPromptDialog } from "@/components/AuthPromptDialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lock, BookmarkSimple, Heart, ChatCircle } from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ptBR } from "date-fns/locale";

export default function PostDetail() {
  const { spaceSlug, postSlug } = useParams<{ spaceSlug: string; postSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canComment, canLike } = useUserAccess();
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
  const [optimisticSavesCount, setOptimisticSavesCount] = useState<number | null>(null);
  const [localComments, setLocalComments] = useState<PostComment[] | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string } | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const showAccessPrompt = () => {
    if (!user) setShowAuthPrompt(true);
    else setShowUpgradePrompt(true);
  };

  const post = postDetail?.post || null;
  const postId = post?.id || null;
  const isLiked = optimisticLiked ?? postDetail?.isLiked ?? false;
  const isSaved = optimisticSaved ?? postDetail?.isSaved ?? false;
  const likesCount = optimisticLikesCount ?? postDetail?.likesCount ?? 0;
  const savesCount = optimisticSavesCount ?? postDetail?.savesCount ?? 0;
  const comments = localComments ?? postDetail?.comments ?? [];
  const media = postDetail?.media ?? [];

  const handleLikeToggle = async () => {
    if (!user) { showAccessPrompt(); return; }
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
    if (!user) { showAccessPrompt(); return; }
    if (!postId) return;

    const wasSaved = isSaved;
    setOptimisticSaved(!isSaved);
    setOptimisticSavesCount(wasSaved ? savesCount - 1 : savesCount + 1);

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
      setOptimisticSavesCount(wasSaved ? savesCount : savesCount);
      toast.error("Não foi possível salvar");
    }
  };

  const handleCommentClick = () => {
    commentSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) { showAccessPrompt(); return; }

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
    if (!user) { showAccessPrompt(); return; }
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
            notificationUrl: window.location.pathname,
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
        <div className="fixed top-14 left-0 right-0 w-full z-40 bg-card border-b border-border">
          <div className="max-w-6xl mx-auto px-4 lg:px-10 py-2.5 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Conheça o Subhumano</span>
            <Button size="sm" variant="outline" onClick={() => navigate("/")}>
              Ver plataforma
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <AuthPromptDialog open={showAuthPrompt} onOpenChange={setShowAuthPrompt} />

      {/* Desktop: three-column layout */}
      <div className="lg:flex lg:px-10 lg:gap-12 lg:min-h-screen lg:max-w-6xl lg:mx-auto">
        {/* Article column */}
        <div className="flex-1 min-w-0 lg:max-w-[760px]">
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
            postId={post.id}
            audioUrl={post.audio_url}
          />

          <PostEngagement
            likesCount={likesCount}
            commentsCount={comments.reduce((acc, c) => acc + 1 + c.replies.length, 0)}
            savesCount={savesCount}
            isLiked={isLiked}
            isSaved={isSaved}
            onLikeToggle={canLike ? handleLikeToggle : showAccessPrompt}
            onCommentClick={handleCommentClick}
            onSave={handleSaveToggle}
          />

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

        {/* Right sidebar — desktop only */}
        <aside className="hidden lg:block lg:w-56 lg:shrink-0 lg:pt-20">
          <div className="sticky top-20 space-y-4">
            {/* Engagement vertical */}
            <div className="rounded-2xl border border-border/60 bg-card/50 p-4 space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Engajamento</p>
              <button
                onClick={canLike ? handleLikeToggle : showAccessPrompt}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-sm font-medium ${
                  isLiked ? "text-red-400" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Heart className="w-4.5 h-4.5" weight={isLiked ? "fill" : "regular"} />
                <span>{likesCount} curtidas</span>
              </button>
              <button
                onClick={handleCommentClick}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ChatCircle className="w-4.5 h-4.5" />
                <span>{comments.reduce((acc, c) => acc + 1 + c.replies.length, 0)} comentários</span>
              </button>
              <button
                onClick={handleSaveToggle}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-sm font-medium ${
                  isSaved ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BookmarkSimple className="w-4.5 h-4.5" weight={isSaved ? "fill" : "regular"} />
                <span>{savesCount} {isSaved ? "salvo" : "salvos"}</span>
              </button>
            </div>

            {/* Author info */}
            {post.author && (
              <div className="rounded-2xl border border-border/60 bg-card/50 p-4 space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Autor</p>
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 ring-1 ring-border/50">
                    <AvatarImage src={post.author.avatar_url || undefined} />
                    <AvatarFallback className="bg-secondary text-sm">
                      {post.author.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{post.author.full_name}</p>
                    {post.author.bio && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">{post.author.bio}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      <Dialog open={showUpgradePrompt} onOpenChange={setShowUpgradePrompt}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader className="items-center text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-elevated">
              <Lock className="h-6 w-6 text-muted-foreground" weight="bold" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              Desbloqueie este conteúdo com seu Passe VIP
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Leia artigos completos e tenha acesso a todo o conteúdo.
            </DialogDescription>
          </DialogHeader>
          <Button
            className="w-full bg-foreground text-background font-semibold rounded-lg hover:bg-foreground/90"
            onClick={() => { setShowUpgradePrompt(false); navigate("/plans"); }}
          >
            Ver planos
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
