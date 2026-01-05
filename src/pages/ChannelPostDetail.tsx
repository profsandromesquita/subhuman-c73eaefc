import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Heart, ChatCircle, PaperPlaneTilt } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Post {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  author_id: string | null;
  author_name: string | null;
  author_avatar: string | null;
  channel_name: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author_name: string;
  author_avatar: string | null;
  parent_id: string | null;
  likes_count: number;
  is_liked: boolean;
  replies: Comment[];
}

export default function ChannelPostDetail() {
  const { channelId, postId } = useParams<{ channelId: string; postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (postId) {
      fetchPost();
      fetchComments();
      checkUserLiked();
    }
  }, [postId, user]);

  const fetchPost = async () => {
    setLoading(true);

    // Get post data
    const { data: postData, error } = await supabase
      .from('channel_posts')
      .select('*, channels(name)')
      .eq('id', postId)
      .single();

    if (error || !postData) {
      console.error('Error fetching post:', error);
      setLoading(false);
      return;
    }

    // Get author profile
    let authorName = 'Usuário';
    let authorAvatar = null;
    if (postData.author_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', postData.author_id)
        .single();
      if (profile) {
        authorName = profile.full_name || 'Usuário';
        authorAvatar = profile.avatar_url;
      }
    }

    // Get likes count
    const { count } = await supabase
      .from('channel_post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    setLikesCount(count || 0);

    setPost({
      id: postData.id,
      title: (postData as any).title || null,
      content: postData.content,
      created_at: postData.created_at,
      author_id: postData.author_id,
      author_name: authorName,
      author_avatar: authorAvatar,
      channel_name: (postData as any).channels?.name || 'Canal',
    });

    setLoading(false);
  };

  const fetchComments = async () => {
    const { data: commentsData, error } = await supabase
      .from('channel_post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }

    // Enrich comments with author info and likes
    const enrichedComments = await Promise.all(
      (commentsData || []).map(async (comment) => {
        // Get author profile
        let authorName = 'Usuário';
        let authorAvatar = null;
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', comment.user_id)
          .single();
        if (profile) {
          authorName = profile.full_name || 'Usuário';
          authorAvatar = profile.avatar_url;
        }

        // Get likes count
        const { count: likesCount } = await supabase
          .from('channel_post_comment_likes')
          .select('*', { count: 'exact', head: true })
          .eq('comment_id', comment.id);

        // Check if user liked
        let isLiked = false;
        if (user) {
          const { data: likeData } = await supabase
            .from('channel_post_comment_likes')
            .select('id')
            .eq('comment_id', comment.id)
            .eq('user_id', user.id)
            .maybeSingle();
          isLiked = !!likeData;
        }

        return {
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          user_id: comment.user_id,
          author_name: authorName,
          author_avatar: authorAvatar,
          parent_id: comment.parent_id,
          likes_count: likesCount || 0,
          is_liked: isLiked,
          replies: [],
        };
      })
    );

    // Organize into tree structure
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    enrichedComments.forEach(comment => {
      commentMap.set(comment.id, comment);
    });

    enrichedComments.forEach(comment => {
      if (comment.parent_id && commentMap.has(comment.parent_id)) {
        commentMap.get(comment.parent_id)!.replies.push(comment);
      } else {
        rootComments.push(comment);
      }
    });

    setComments(rootComments);
  };

  const checkUserLiked = async () => {
    if (!user || !postId) return;

    const { data } = await supabase
      .from('channel_post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    setIsLiked(!!data);
  };

  const handleLikePost = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para curtir");
      return;
    }

    if (isLiked) {
      await supabase
        .from('channel_post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);
      setIsLiked(false);
      setLikesCount(prev => prev - 1);
    } else {
      await supabase
        .from('channel_post_likes')
        .insert({ post_id: postId, user_id: user.id });
      setIsLiked(true);
      setLikesCount(prev => prev + 1);
    }
  };

  const handleLikeComment = async (commentId: string, currentlyLiked: boolean) => {
    if (!user) {
      toast.error("Você precisa estar logado para curtir");
      return;
    }

    if (currentlyLiked) {
      await supabase
        .from('channel_post_comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('channel_post_comment_likes')
        .insert({ comment_id: commentId, user_id: user.id });
    }

    // Update local state
    const updateCommentLike = (comments: Comment[]): Comment[] => {
      return comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            is_liked: !currentlyLiked,
            likes_count: currentlyLiked ? comment.likes_count - 1 : comment.likes_count + 1,
          };
        }
        return {
          ...comment,
          replies: updateCommentLike(comment.replies),
        };
      });
    };

    setComments(updateCommentLike(comments));
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para comentar");
      return;
    }

    if (!commentContent.trim()) return;

    setSubmittingComment(true);

    const { error } = await supabase
      .from('channel_post_comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content: commentContent.trim(),
        parent_id: replyTo?.id || null,
      });

    if (error) {
      console.error('Error creating comment:', error);
      toast.error("Erro ao enviar comentário");
    } else {
      toast.success(replyTo ? "Resposta enviada!" : "Comentário enviado!");
      setCommentContent("");
      setReplyTo(null);
      fetchComments();
    }

    setSubmittingComment(false);
  };

  const formatTime = (dateString: string) => {
    const distance = formatDistanceToNow(new Date(dateString), { locale: ptBR });
    return distance
      .replace("cerca de ", "")
      .replace(" horas", "h")
      .replace(" hora", "h")
      .replace(" minutos", "min")
      .replace(" minuto", "min")
      .replace(" dias", "d")
      .replace(" dia", "d")
      .replace(" semanas", "sem")
      .replace(" semana", "sem")
      .replace(" meses", "m")
      .replace(" mês", "m");
  };

  const renderComment = (comment: Comment, isReply = false) => (
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
            <span className="text-sm font-medium">{comment.author_name}</span>
            <span className="text-xs text-muted-foreground">{formatTime(comment.created_at)}</span>
          </div>
          <p className="text-sm mt-1">{comment.content}</p>
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
                commentInputRef.current?.focus();
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

  if (loading) {
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
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-10 h-10">
              <AvatarImage src={post.author_avatar || undefined} />
              <AvatarFallback>{post.author_name?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{post.author_name}</p>
              <p className="text-sm text-muted-foreground">{formatTime(post.created_at)}</p>
            </div>
          </div>

          {/* Title & Content */}
          {post.title && (
            <h1 className="text-xl font-bold mb-3">{post.title}</h1>
          )}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{post.content}</p>
          </div>

          {/* Engagement */}
          <div className="flex items-center gap-4 mt-6 pt-4 border-t">
            <Button
              variant="ghost"
              className={`gap-2 ${isLiked ? 'text-red-500' : ''}`}
              onClick={handleLikePost}
            >
              <Heart className="w-5 h-5" weight={isLiked ? "fill" : "regular"} />
              <span>{likesCount} curtidas</span>
            </Button>
            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => commentInputRef.current?.focus()}
            >
              <ChatCircle className="w-5 h-5" />
              <span>{comments.reduce((acc, c) => acc + 1 + c.replies.length, 0)} comentários</span>
            </Button>
          </div>
        </motion.article>

        <Separator className="my-6" />

        {/* Comments Section */}
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
            {replyTo && (
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-muted-foreground">
                  Respondendo a <span className="font-medium text-foreground">{replyTo.name}</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setReplyTo(null)}
                >
                  Cancelar
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                ref={commentInputRef}
                placeholder={replyTo ? "Escreva sua resposta..." : "Escreva um comentário..."}
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                className="min-h-[44px] max-h-32 resize-none"
                rows={1}
              />
              <Button
                size="icon"
                onClick={handleSubmitComment}
                disabled={submittingComment || !commentContent.trim()}
              >
                <PaperPlaneTilt className="w-5 h-5" weight="fill" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
