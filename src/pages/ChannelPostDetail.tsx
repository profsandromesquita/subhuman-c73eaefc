import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Heart, ChatCircle, DotsThree, Pencil, Trash } from "@phosphor-icons/react";
import { MentionCommentInput, type MentionData } from "@/components/MentionCommentInput";
import { MentionText } from "@/components/post/MentionText";
import { useCreateMentions } from "@/hooks/useMentions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useUserAccess } from "@/hooks/useUserAccess";
import { ContentPaywall } from "@/components/ContentPaywall";
import { useDeleteChannelPost } from "@/hooks/usePosts";
import { useChannelPostDetail, type ChannelPostComment } from "@/hooks/useChannelPostDetail";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { MediaGallery } from "@/components/post/MediaGallery";
import DOMPurify from "dompurify";
import { AuthorModal } from "@/components/post/AuthorModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ChannelPostDetail() {
  const { channelId, postId } = useParams<{ channelId: string; postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdminOrModerator } = useAdminAuth();
  const { canReadFullChannelPosts, canComment, canLike } = useUserAccess();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteChannelPost();
  const commentSectionRef = useRef<HTMLDivElement>(null);
  const createMentions = useCreateMentions();

  const { data, isLoading } = useChannelPostDetail(postId);

  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mentionAuthor, setMentionAuthor] = useState<any>(null);
  const [showMentionModal, setShowMentionModal] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleMentionClick = useCallback(async (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const mentionEl = target.closest('.mention') as HTMLElement | null;
    if (!mentionEl) return;

    e.preventDefault();
    e.stopPropagation();

    const mentionId = mentionEl.getAttribute('data-mention-id');
    const mentionType = mentionEl.getAttribute('data-mention-type');
    if (!mentionId) return;

    try {
      if (mentionType === 'company') {
        const { data } = await supabase
          .from('companies')
          .select('id, name, logo_url, description, instagram_url, linkedin_url, website, industry')
          .eq('id', mentionId)
          .maybeSingle();
        if (data) {
          setMentionAuthor({
            id: data.id, full_name: data.name, avatar_url: data.logo_url,
            bio: data.description, education: data.industry,
            instagram_url: data.instagram_url, linkedin_url: data.linkedin_url, website: data.website,
          });
          setShowMentionModal(true);
        }
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio, education, instagram_url, linkedin_url, website')
          .eq('id', mentionId)
          .maybeSingle();
        if (data) {
          setMentionAuthor(data);
          setShowMentionModal(true);
        }
      }
    } catch (err) {
      console.error('Error fetching mention profile:', err);
    }
  }, []);

  const post = data?.post ?? null;

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.addEventListener('click', handleMentionClick);
    return () => el.removeEventListener('click', handleMentionClick);
  }, [handleMentionClick, post]);

  // Local optimistic state for likes
  const [optimisticLike, setOptimisticLike] = useState<{ isLiked: boolean; likesCount: number } | null>(null);

  // post already declared above
  const media = data?.media ?? [];
  const comments = data?.comments ?? [];
  const likesCount = optimisticLike?.likesCount ?? data?.likesCount ?? 0;
  const isLiked = optimisticLike?.isLiked ?? data?.isLiked ?? false;

  const canEdit = user?.id === post?.author_id;
  const canDelete = user?.id === post?.author_id || isAdminOrModerator;
  const showActions = canEdit || canDelete;

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(postId!);
      toast.success("Publicação excluída!");
      navigate(`/channels/${channelId}`);
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Erro ao excluir publicação");
    }
  };

  const handleLikePost = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para curtir");
      return;
    }

    const newIsLiked = !isLiked;
    const newCount = newIsLiked ? likesCount + 1 : likesCount - 1;
    setOptimisticLike({ isLiked: newIsLiked, likesCount: newCount });

    try {
      if (newIsLiked) {
        await supabase.from("channel_post_likes").insert({ post_id: postId, user_id: user.id });
      } else {
        await supabase.from("channel_post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      }
      queryClient.invalidateQueries({ queryKey: ["channel-post-detail", postId] });
      queryClient.invalidateQueries({ queryKey: ["recent-discussions"] });
      queryClient.invalidateQueries({ queryKey: ["channel-posts"] });
    } catch {
      setOptimisticLike(null);
    }
  };

  const handleLikeComment = async (commentId: string, currentlyLiked: boolean) => {
    if (!user) {
      toast.error("Você precisa estar logado para curtir");
      return;
    }

    if (currentlyLiked) {
      await supabase.from("channel_post_comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id);
    } else {
      await supabase.from("channel_post_comment_likes").insert({ comment_id: commentId, user_id: user.id });
    }

    queryClient.invalidateQueries({ queryKey: ["channel-post-detail", postId] });
  };

  const handleSubmitComment = async (content: string, mentions: MentionData[], parentId?: string) => {
    if (!user) {
      toast.error("Você precisa estar logado para comentar");
      return;
    }

    const { data: commentData, error } = await supabase.from("channel_post_comments").insert({
      post_id: postId,
      user_id: user.id,
      content,
      parent_id: parentId || null,
    }).select("id").single();

    if (error) {
      console.error("Error creating comment:", error);
      toast.error("Erro ao enviar comentário");
    } else {
      // Save mentions
      if (mentions.length > 0 && commentData) {
        createMentions.mutate(
          mentions.map((m) => ({
            mentionedUserId: m.type === "user" ? m.id : undefined,
            mentionedCompanyId: m.type === "company" ? m.id : undefined,
            contextType: "channel_comment",
            contextId: commentData.id,
          }))
        );
      }
      toast.success(parentId ? "Resposta enviada!" : "Comentário enviado!");
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["channel-post-detail", postId] });
      queryClient.invalidateQueries({ queryKey: ["recent-discussions"] });
    }
  };

  const formatTime = (dateString: string) => {
    const distance = formatDistanceToNow(new Date(dateString), { locale: ptBR });
    return distance
      .replace("cerca de ", "")
      .replace("menos de um", "< 1")
      .replace("menos de ", "< ")
      .replace(/\bum\b/g, "1")
      .replace(/\bdois\b/g, "2")
      .replace(/\btrês\b/g, "3")
      .replace(/\bquatro\b/g, "4")
      .replace(/\bcinco\b/g, "5")
      .replace(/\bseis\b/g, "6")
      .replace(/\bsete\b/g, "7")
      .replace(/\boito\b/g, "8")
      .replace(/\bnove\b/g, "9")
      .replace(/\bdez\b/g, "10")
      .replace(/\bonze\b/g, "11")
      .replace(/\bdoze\b/g, "12")
      .replace(" horas", "h")
      .replace(" hora", "h")
      .replace(" minutos", " min")
      .replace(" minuto", " min")
      .replace(" dias", "d")
      .replace(" dia", "d")
      .replace(" semanas", " sem")
      .replace(" semana", " sem")
      .replace(" meses", " meses")
      .replace(" mês", " mês");
  };

  const renderComment = (comment: ChannelPostComment, isReply = false) => (
    <motion.div
      key={comment.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={isReply ? "ml-8 mt-3" : ""}
    >
      <div className="flex gap-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src={comment.author_avatar || undefined} />
          <AvatarFallback>{comment.author_name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (!comment.user_id) return;
                try {
                  const { data } = await supabase
                    .from("profiles")
                    .select("id, full_name, avatar_url, bio, education, instagram_url, linkedin_url, website")
                    .eq("id", comment.user_id)
                    .maybeSingle();
                  if (data) {
                    setMentionAuthor(data);
                    setShowMentionModal(true);
                  }
                } catch (err) {
                  console.error("Error fetching commenter profile:", err);
                }
              }}
              className="text-sm font-medium hover:underline text-left"
            >
              {comment.author_name}
            </button>
            <span className="text-xs text-muted-foreground">{formatTime(comment.created_at)}</span>
          </div>
          <MentionText text={comment.content} />
          <div className="flex items-center gap-3 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1 h-6 px-1.5 text-xs ${comment.is_liked ? 'text-red-500' : 'text-muted-foreground'}`}
              onClick={() => handleLikeComment(comment.id, comment.is_liked)}
            >
              <Heart className="w-3 h-3" weight={comment.is_liked ? "fill" : "regular"} />
              {comment.likes_count > 0 && comment.likes_count}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-xs text-muted-foreground"
              onClick={() => {
                setReplyTo({ id: comment.id, name: comment.author_name });
              }}
            >
              Responder
            </Button>
          </div>
        </div>
      </div>
      {comment.replies.map(reply => renderComment(reply, true))}
    </motion.div>
  );

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 pt-4">
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-48 w-full mb-4" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!post) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 pt-4 text-center">
          <p>Post não encontrado</p>
          <Button onClick={() => navigate(`/channels/${channelId}`)} className="mt-4">
            Voltar ao canal
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-4 pb-32">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/channels/${channelId}`)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm text-muted-foreground">{post.channel_name}</span>
        </motion.div>

        {/* Post Content */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          {/* Author */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={post.author_avatar || undefined} />
                <AvatarFallback>{post.author_name?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{post.author_name}</p>
                <p className="text-sm text-muted-foreground">{formatTime(post.created_at)}</p>
              </div>
            </div>

            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <DotsThree className="w-5 h-5" weight="bold" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-border">
                  {canEdit && (
                    <DropdownMenuItem onClick={() => navigate(`/channels/${channelId}/edit/${postId}`)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem 
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-red-500 focus:text-red-500"
                    >
                      <Trash className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir publicação?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. A publicação será permanentemente excluída.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete} 
                  className="bg-red-500 hover:bg-red-600"
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Title & Content */}
          {post.title && (
            <h1 className="text-xl font-bold mb-3">{post.title}</h1>
          )}
          {canReadFullChannelPosts ? (
            <div 
              ref={contentRef}
              className="prose prose-sm dark:prose-invert max-w-none [&_.mention]:text-primary [&_.mention]:font-medium [&_.mention]:cursor-pointer"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content, { ADD_ATTR: ['data-mention-type', 'data-mention-id'] }) }}
            />
          ) : (
            <ContentPaywall maxLines={1} type="channel">
              <div 
                ref={contentRef}
                className="prose prose-sm dark:prose-invert max-w-none [&_.mention]:text-primary [&_.mention]:font-medium [&_.mention]:cursor-pointer"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content, { ADD_ATTR: ['data-mention-type', 'data-mention-id'] }) }}
              />
            </ContentPaywall>
          )}

          {/* Media Gallery */}
          {media.length > 0 && (
            <div className="mt-6">
              <MediaGallery media={media} />
            </div>
          )}

          {/* Engagement */}
          <div className="flex items-center gap-4 mt-6 pt-4 border-t">
            <Button
              variant="ghost"
              className={`gap-2 ${isLiked ? 'text-red-500' : ''}`}
              onClick={canLike ? handleLikePost : () => toast.error("Assine para curtir conteúdos")}
            >
              <Heart className="w-5 h-5" weight={isLiked ? "fill" : "regular"} />
              <span>{likesCount} curtidas</span>
            </Button>
            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => commentSectionRef.current?.scrollIntoView({ behavior: "smooth" })}
            >
              <ChatCircle className="w-5 h-5" />
              <span>{comments.reduce((acc, c) => acc + 1 + c.replies.length, 0)} comentários</span>
            </Button>
          </div>
        </motion.article>

        <Separator className="my-6" />

        {/* Comments Section */}
        {canComment && (
          <>
            <div className="space-y-6 mb-6">
              <h2 className="font-semibold">Comentários</h2>
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum comentário ainda. Seja o primeiro!
                </p>
              ) : (
                <div className="space-y-6">
                  {comments.map(comment => renderComment(comment))}
                </div>
              )}
            </div>

            {/* Comment Input */}
            <div className="fixed bottom-20 left-0 right-0 bg-background border-t p-4">
              <div className="max-w-lg mx-auto">
                <MentionCommentInput
                  onSubmit={handleSubmitComment}
                  replyTo={replyTo ? { id: replyTo.id, authorName: replyTo.name } : null}
                  onCancelReply={() => setReplyTo(null)}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <AuthorModal 
        author={mentionAuthor} 
        isOpen={showMentionModal} 
        onClose={() => setShowMentionModal(false)} 
      />
    </AppLayout>
  );
}
