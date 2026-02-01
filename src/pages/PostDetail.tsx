import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PostHeader } from "@/components/post/PostHeader";
import { PostContent } from "@/components/post/PostContent";
import { PostEngagement } from "@/components/post/PostEngagement";
import { CommentSection } from "@/components/post/CommentSection";
import { CommentInput } from "@/components/post/CommentInput";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Post {
  id: string;
  title: string;
  content: string | null;
  thumbnail_url: string | null;
  media_type: string | null;
  published_at: string | null;
  created_at: string;
  space: {
    name: string;
    slug: string;
  };
}

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

export default function PostDetail() {
  const { spaceId, postId } = useParams<{ spaceId: string; postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const commentSectionRef = useRef<HTMLDivElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [post, setPost] = useState<Post | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string } | null>(null);

  useEffect(() => {
    if (postId) {
      fetchPostData();
    }
  }, [postId]);

  useEffect(() => {
    if (user && postId) {
      checkUserInteractions();
    }
  }, [user, postId]);

  const fetchPostData = async () => {
    if (!postId) return;
    
    setIsLoading(true);

    // Fetch post with space info
    const { data: postData, error: postError } = await supabase
      .from("space_updates")
      .select(`
        id,
        title,
        content,
        thumbnail_url,
        media_type,
        published_at,
        created_at,
        spaces (
          name,
          slug
        )
      `)
      .eq("id", postId)
      .eq("is_published", true)
      .maybeSingle();

    if (postError || !postData) {
      setIsLoading(false);
      return;
    }

    setPost({
      ...postData,
      space: postData.spaces as { name: string; slug: string },
    });

    // Fetch likes count
    const { count: likesCountResult } = await supabase
      .from("update_likes")
      .select("id", { count: "exact", head: true })
      .eq("update_id", postId);
    
    setLikesCount(likesCountResult || 0);

    // Fetch comments with profiles
    await fetchComments();

    setIsLoading(false);
  };

  const fetchComments = async () => {
    if (!postId) return;

    // Fetch all comments for this post
    const { data: commentsData, error } = await supabase
      .from("update_comments")
      .select(`
        id,
        content,
        user_id,
        parent_id,
        created_at
      `)
      .eq("update_id", postId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !commentsData || commentsData.length === 0) {
      setComments([]);
      return;
    }

    const commentIds = commentsData.map(c => c.id);
    const uniqueUserIds = [...new Set(commentsData.map(c => c.user_id))];

    // Batch fetch all related data in parallel (no N+1!)
    const [profilesResult, likesCountResult, userLikesResult] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", uniqueUserIds),
      supabase.from("comment_likes").select("comment_id").in("comment_id", commentIds),
      user 
        ? supabase.from("comment_likes").select("comment_id").in("comment_id", commentIds).eq("user_id", user.id)
        : Promise.resolve({ data: [] }),
    ]);

    // Build lookup maps
    const profilesMap = new Map(
      profilesResult.data?.map(p => [p.id, p.full_name]) || []
    );

    const likesCountMap: Record<string, number> = {};
    likesCountResult.data?.forEach((like) => {
      likesCountMap[like.comment_id] = (likesCountMap[like.comment_id] || 0) + 1;
    });

    const userLikedSet = new Set(userLikesResult.data?.map(l => l.comment_id) || []);

    // Build comments with engagement data
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

    // Organize into parent/reply structure
    const parentComments: Comment[] = [];
    const replyMap = new Map<string, Comment[]>();

    commentsWithLikes.forEach((comment) => {
      if (comment.parentId) {
        const existing = replyMap.get(comment.parentId) || [];
        existing.push({ ...comment, replies: [] });
        replyMap.set(comment.parentId, existing);
      } else {
        parentComments.push(comment);
      }
    });

    // Attach replies to parents
    parentComments.forEach((parent) => {
      parent.replies = replyMap.get(parent.id) || [];
    });

    setComments(parentComments);
  };

  const checkUserInteractions = async () => {
    if (!user || !postId) return;
    
    // Check if liked
    const { data: likeData } = await supabase
      .from("update_likes")
      .select("id")
      .eq("update_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();
    
    setIsLiked(!!likeData);

    // Check if saved
    const { data: savedData } = await supabase
      .from("saved_updates")
      .select("id")
      .eq("update_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();
    
    setIsSaved(!!savedData);
  };

  const handleLikeToggle = async () => {
    if (!user) {
      toast({
        title: "Faça login",
        description: "Você precisa estar logado para curtir",
        variant: "destructive",
      });
      return;
    }

    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

    try {
      if (isLiked) {
        await supabase
          .from("update_likes")
          .delete()
          .eq("update_id", postId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("update_likes")
          .insert({ update_id: postId, user_id: user.id });
      }
    } catch (error) {
      // Rollback on error
      setIsLiked(isLiked);
      setLikesCount(prev => isLiked ? prev + 1 : prev - 1);
    }
  };

  const handleSaveToggle = async () => {
    if (!user) {
      toast({
        title: "Faça login",
        description: "Você precisa estar logado para salvar",
        variant: "destructive",
      });
      return;
    }

    // Optimistic update
    const wasSaved = isSaved;
    setIsSaved(!isSaved);

    try {
      if (wasSaved) {
        await supabase
          .from("saved_updates")
          .delete()
          .eq("update_id", postId)
          .eq("user_id", user.id);
        
        toast({
          title: "Removido dos salvos",
        });
      } else {
        await supabase
          .from("saved_updates")
          .insert({ update_id: postId, user_id: user.id });
        
        toast({
          title: "Post salvo!",
          description: "Você pode acessar seus posts salvos no perfil",
        });
      }
    } catch (error) {
      setIsSaved(wasSaved);
      toast({
        title: "Erro",
        description: "Não foi possível salvar",
        variant: "destructive",
      });
    }
  };

  const handleCommentClick = () => {
    commentSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      toast({
        title: "Faça login",
        description: "Você precisa estar logado para curtir",
        variant: "destructive",
      });
      return;
    }

    // Find the comment to check if it's liked
    let isCurrentlyLiked = false;
    comments.forEach(comment => {
      if (comment.id === commentId) {
        isCurrentlyLiked = comment.isLiked;
      }
      comment.replies.forEach(reply => {
        if (reply.id === commentId) {
          isCurrentlyLiked = reply.isLiked;
        }
      });
    });

    // Optimistic update
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
              ? {
                  ...reply,
                  isLiked: !reply.isLiked,
                  likesCount: reply.isLiked ? reply.likesCount - 1 : reply.likesCount + 1,
                }
              : reply
          ),
        };
      })
    );

    try {
      if (isCurrentlyLiked) {
        await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("comment_likes")
          .insert({ comment_id: commentId, user_id: user.id });
      }
    } catch (error) {
      // Rollback - refetch comments
      await fetchComments();
    }
  };

  const handleReplyComment = (commentId: string, authorName: string) => {
    setReplyTo({ id: commentId, authorName });
  };

  const handleSubmitComment = async (content: string, parentId?: string) => {
    if (!user) {
      toast({
        title: "Faça login",
        description: "Você precisa estar logado para comentar",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("update_comments")
        .insert({
          update_id: postId,
          user_id: user.id,
          content,
          parent_id: parentId || null,
        });

      if (error) throw error;

      // Refresh comments
      await fetchComments();
      setReplyTo(null);

      toast({
        title: "Comentário enviado!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar o comentário",
        variant: "destructive",
      });
    }
  };

  const handleEditComment = async (commentId: string, newContent: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("update_comments")
        .update({ content: newContent })
        .eq("id", commentId)
        .eq("user_id", user.id);

      if (error) throw error;

      // Update local state
      setComments(prev =>
        prev.map(comment => {
          if (comment.id === commentId) {
            return { ...comment, content: newContent };
          }
          return {
            ...comment,
            replies: comment.replies.map(reply =>
              reply.id === commentId ? { ...reply, content: newContent } : reply
            ),
          };
        })
      );

      toast({ title: "Comentário atualizado!" });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível editar o comentário",
        variant: "destructive",
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("update_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id);

      if (error) throw error;

      // Remove from local state
      setComments(prev =>
        prev
          .filter(comment => comment.id !== commentId)
          .map(comment => ({
            ...comment,
            replies: comment.replies.filter(reply => reply.id !== commentId),
          }))
      );

      toast({ title: "Comentário excluído!" });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o comentário",
        variant: "destructive",
      });
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
      <div className="min-h-screen bg-background">
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Post não encontrado</p>
          <button 
            onClick={() => navigate(`/spaces/${spaceId}`)}
            className="text-primary"
          >
            Voltar para o espaço
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PostHeader
        isSaved={isSaved}
        onSaveToggle={handleSaveToggle}
        title={post.title}
      />

      <PostContent
        title={post.title}
        content={post.content || ""}
        thumbnailUrl={post.thumbnail_url}
        mediaType={post.media_type}
        spaceName={post.space.name}
        spaceSlug={post.space.slug}
        authorName="Admin"
        publishedAt={formatTime(post.published_at || post.created_at)}
        readTime={estimateReadTime(post.content)}
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
