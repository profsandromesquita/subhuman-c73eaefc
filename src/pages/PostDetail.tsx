import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { PostHeader } from "@/components/post/PostHeader";
import { PostContent } from "@/components/post/PostContent";
import { PostEngagement } from "@/components/post/PostEngagement";
import { CommentSection } from "@/components/post/CommentSection";
import { CommentInput } from "@/components/post/CommentInput";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// Mock data for demo - will be replaced with real data
const mockPost = {
  id: "1",
  title: "Claude 3.5 Sonnet: O novo benchmark de performance em IA",
  content: `A Anthropic acaba de lançar o Claude 3.5 Sonnet, e os resultados são impressionantes. Este novo modelo estabelece novos padrões em praticamente todos os benchmarks de IA.

O que mais me chamou atenção foi a velocidade. O Sonnet é significativamente mais rápido que o Opus, mantendo qualidade comparável em muitas tarefas. Isso significa que você pode usar um modelo de alta qualidade sem sacrificar a experiência do usuário.

Em termos de código, o Claude 3.5 Sonnet demonstra capacidades excepcionais. Ele consegue entender contextos complexos, sugerir refatorações inteligentes e até identificar bugs sutis que poderiam passar despercebidos.

A janela de contexto de 200K tokens também é um diferencial importante. Isso permite trabalhar com projetos maiores, analisar documentos extensos e manter conversas mais longas sem perder o fio da meada.

Para desenvolvedores que trabalham com IA no dia a dia, essa atualização representa um salto significativo em produtividade e qualidade de output.`,
  thumbnail_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=675&fit=crop",
  media_type: "image",
  space_name: "Produtividade Pessoal",
  space_slug: "produtividade",
  author_name: "Admin",
  published_at: "2 horas atrás",
  read_time: "3 min de leitura",
  likes_count: 42,
  comments_count: 8,
};

const mockComments = [
  {
    id: "c1",
    content: "Excelente análise! Estou usando o Claude 3.5 Sonnet há uma semana e realmente a diferença de velocidade é notável.",
    authorName: "João Silva",
    createdAt: "1h",
    likesCount: 5,
    isLiked: false,
    replies: [
      {
        id: "r1",
        content: "Concordo! A velocidade é impressionante mesmo.",
        authorName: "Maria Santos",
        createdAt: "45min",
        likesCount: 2,
        isLiked: true,
      },
    ],
  },
  {
    id: "c2",
    content: "Como fica a comparação com o GPT-4? Alguém já testou os dois lado a lado?",
    authorName: "Pedro Costa",
    createdAt: "2h",
    likesCount: 3,
    isLiked: false,
    replies: [],
  },
  {
    id: "c3",
    content: "A janela de 200K tokens é game changer para quem trabalha com documentação técnica extensa.",
    authorName: "Ana Oliveira",
    createdAt: "3h",
    likesCount: 8,
    isLiked: true,
    replies: [],
  },
];

export default function PostDetail() {
  const { spaceId, postId } = useParams<{ spaceId: string; postId: string }>();
  const { user } = useAuth();
  const commentSectionRef = useRef<HTMLDivElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(mockPost.likes_count);
  const [comments, setComments] = useState(mockComments);
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string } | null>(null);

  // Check if user has liked/saved this post
  useEffect(() => {
    if (user && postId) {
      checkUserInteractions();
    }
  }, [user, postId]);

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

  const handleLikeComment = (commentId: string) => {
    if (!user) {
      toast({
        title: "Faça login",
        description: "Você precisa estar logado para curtir",
        variant: "destructive",
      });
      return;
    }

    setComments(prev => 
      prev.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            isLiked: !comment.isLiked,
            likesCount: comment.isLiked ? comment.likesCount - 1 : comment.likesCount + 1,
          };
        }
        // Check replies
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
  };

  const handleReplyComment = (commentId: string, authorName: string) => {
    setReplyTo({ id: commentId, authorName });
  };

  const handleSubmitComment = (content: string, parentId?: string) => {
    if (!user) {
      toast({
        title: "Faça login",
        description: "Você precisa estar logado para comentar",
        variant: "destructive",
      });
      return;
    }

    const newComment = {
      id: `temp-${Date.now()}`,
      content,
      authorName: user.email?.split("@")[0] || "Usuário",
      createdAt: "agora",
      likesCount: 0,
      isLiked: false,
      replies: [],
    };

    if (parentId) {
      // Add as reply
      setComments(prev =>
        prev.map(comment =>
          comment.id === parentId
            ? { ...comment, replies: [...comment.replies, { ...newComment, replies: undefined } as any] }
            : comment
        )
      );
      setReplyTo(null);
    } else {
      // Add as new comment
      setComments(prev => [newComment, ...prev]);
    }

    toast({
      title: "Comentário enviado!",
    });
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

  return (
    <div className="min-h-screen bg-background">
      <PostHeader
        isSaved={isSaved}
        onSaveToggle={handleSaveToggle}
        title={mockPost.title}
      />

      <PostContent
        title={mockPost.title}
        content={mockPost.content}
        thumbnailUrl={mockPost.thumbnail_url}
        mediaType={mockPost.media_type}
        spaceName={mockPost.space_name}
        spaceSlug={mockPost.space_slug}
        authorName={mockPost.author_name}
        publishedAt={mockPost.published_at}
        readTime={mockPost.read_time}
      />

      <PostEngagement
        likesCount={likesCount}
        commentsCount={comments.length}
        isLiked={isLiked}
        onLikeToggle={handleLikeToggle}
        onCommentClick={handleCommentClick}
      />

      <div ref={commentSectionRef}>
        <CommentSection
          comments={comments}
          onLikeComment={handleLikeComment}
          onReplyComment={handleReplyComment}
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
