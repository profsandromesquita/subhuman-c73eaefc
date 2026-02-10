import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PodcastPlayer } from "@/components/podcast/PodcastPlayer";
import { PodcastHeader } from "@/components/podcast/PodcastHeader";
import { PostEngagement } from "@/components/post/PostEngagement";
import { CommentSection } from "@/components/post/CommentSection";
import { CommentInput } from "@/components/post/CommentInput";
import { usePodcastBySlug, useLikePodcast, useSavePodcast, useAddPodcastComment, useLikePodcastComment } from "@/hooks/usePodcasts";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Comment {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
  likesCount: number;
  isLiked: boolean;
  userId?: string;
  replies: Comment[];
}

export default function PodcastDetail() {
  const { podcastSlug } = useParams<{ podcastSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const commentSectionRef = useRef<HTMLDivElement>(null);
  
  const { data: podcast, isLoading } = usePodcastBySlug(podcastSlug);
  const likeMutation = useLikePodcast();
  const saveMutation = useSavePodcast();
  const commentMutation = useAddPodcastComment();
  const commentLikeMutation = useLikePodcastComment();

  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string } | null>(null);

  useEffect(() => {
    if (podcast?.id) {
      fetchEngagementData();
      fetchComments();
    }
  }, [podcast?.id, user]);

  const fetchEngagementData = async () => {
    if (!podcast?.id) return;

    const { count } = await supabase
      .from("podcast_likes")
      .select("id", { count: "exact", head: true })
      .eq("podcast_id", podcast.id);
    
    setLikesCount(count || 0);

    if (user) {
      const [likeResult, saveResult] = await Promise.all([
        supabase.from("podcast_likes").select("id").eq("podcast_id", podcast.id).eq("user_id", user.id).maybeSingle(),
        supabase.from("saved_podcasts").select("id").eq("podcast_id", podcast.id).eq("user_id", user.id).maybeSingle(),
      ]);

      setIsLiked(!!likeResult.data);
      setIsSaved(!!saveResult.data);
    }
  };

  const fetchComments = async () => {
    if (!podcast?.id) return;

    const { data: commentsData, error } = await supabase
      .from("podcast_comments")
      .select(`id, content, user_id, parent_id, created_at`)
      .eq("podcast_id", podcast.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !commentsData || commentsData.length === 0) {
      setComments([]);
      return;
    }

    const commentIds = commentsData.map(c => c.id);
    const uniqueUserIds = [...new Set(commentsData.map(c => c.user_id))];

    const [profilesResult, likesCountResult, userLikesResult] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", uniqueUserIds),
      supabase.from("podcast_comment_likes").select("comment_id").in("comment_id", commentIds),
      user 
        ? supabase.from("podcast_comment_likes").select("comment_id").in("comment_id", commentIds).eq("user_id", user.id)
        : Promise.resolve({ data: [] }),
    ]);

    const profilesMap = new Map(profilesResult.data?.map(p => [p.id, p.full_name]) || []);

    const likesCountMap: Record<string, number> = {};
    likesCountResult.data?.forEach((like) => {
      likesCountMap[like.comment_id] = (likesCountMap[like.comment_id] || 0) + 1;
    });

    const userLikedSet = new Set(userLikesResult.data?.map(l => l.comment_id) || []);

    const commentsWithLikes = commentsData.map((comment) => ({
      id: comment.id,
      content: comment.content,
      authorName: profilesMap.get(comment.user_id) || "Usuário",
      createdAt: formatDistanceToNow(new Date(comment.created_at!), { addSuffix: false, locale: ptBR }),
      likesCount: likesCountMap[comment.id] || 0,
      isLiked: userLikedSet.has(comment.id),
      userId: comment.user_id,
      parentId: comment.parent_id,
      replies: [] as Comment[],
    }));

    const parentComments: Comment[] = [];
    const replyMap = new Map<string, Comment[]>();

    commentsWithLikes.forEach((comment) => {
      if ((comment as any).parentId) {
        const existing = replyMap.get((comment as any).parentId) || [];
        existing.push({ ...comment, replies: [] });
        replyMap.set((comment as any).parentId, existing);
      } else {
        parentComments.push(comment);
      }
    });

    parentComments.forEach((parent) => {
      parent.replies = replyMap.get(parent.id) || [];
    });

    setComments(parentComments);
  };

  const handleLikeToggle = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para curtir");
      return;
    }

    const wasLiked = isLiked;
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

    try {
      await likeMutation.mutateAsync({ podcastId: podcast!.id, isLiked: wasLiked });
    } catch (error) {
      setIsLiked(wasLiked);
      setLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
    }
  };

  const handleSaveToggle = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para salvar");
      return;
    }

    const wasSaved = isSaved;
    setIsSaved(!isSaved);

    try {
      await saveMutation.mutateAsync({ podcastId: podcast!.id, isSaved: wasSaved });
      toast.success(wasSaved ? "Removido dos salvos" : "Podcast salvo!");
    } catch (error) {
      setIsSaved(wasSaved);
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

    setComments(prev => 
      prev.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            isLiked: !comment.isLiked,
            likesCount: comment.isLiked ? comment.likesCount - 1 : comment.likesCount + 1,
          };
        }
        return {
          ...comment,
          replies: comment.replies.map(reply => 
            reply.id === commentId
              ? { ...reply, isLiked: !reply.isLiked, likesCount: reply.isLiked ? reply.likesCount - 1 : reply.likesCount + 1 }
              : reply
          ),
        };
      })
    );

    try {
      await commentLikeMutation.mutateAsync({ commentId, isLiked: isCurrentlyLiked });
    } catch (error) {
      await fetchComments();
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
      await fetchComments();
      setReplyTo(null);
      toast.success("Comentário enviado!");
    } catch (error) {
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

      setComments(prev =>
        prev.map(comment => {
          if (comment.id === commentId) return { ...comment, content: newContent };
          return {
            ...comment,
            replies: comment.replies.map(reply =>
              reply.id === commentId ? { ...reply, content: newContent } : reply
            ),
          };
        })
      );

      toast.success("Comentário atualizado!");
    } catch (error) {
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

      setComments(prev =>
        prev
          .filter(comment => comment.id !== commentId)
          .map(comment => ({
            ...comment,
            replies: comment.replies.filter(reply => reply.id !== commentId),
          }))
      );

      toast.success("Comentário excluído!");
    } catch (error) {
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
          <PodcastPlayer
            audioUrl={podcast.audio_url}
            title={podcast.title}
            coverUrl={podcast.cover_url}
            podcastId={podcast.id}
            durationSeconds={podcast.duration_seconds}
          />

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
      </div>

      <CommentInput
        onSubmit={handleSubmitComment}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </AppLayout>
  );
}
