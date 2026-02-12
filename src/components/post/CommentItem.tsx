import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, User, Pencil, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MentionText } from "@/components/post/MentionText";

interface Reply {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
  likesCount: number;
  isLiked: boolean;
  userId?: string;
}

interface CommentItemProps {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
  likesCount: number;
  isLiked: boolean;
  userId?: string;
  currentUserId?: string;
  replies?: Reply[];
  onLikeToggle: (commentId: string) => void;
  onReply: (commentId: string, authorName: string) => void;
  onEdit?: (commentId: string, newContent: string) => void;
  onDelete?: (commentId: string) => void;
  isReply?: boolean;
}

// MentionText is now imported from @/components/post/MentionText

export function CommentItem({
  id,
  content,
  authorName,
  createdAt,
  likesCount,
  isLiked,
  userId,
  currentUserId,
  replies = [],
  onLikeToggle,
  onReply,
  onEdit,
  onDelete,
  isReply = false,
}: CommentItemProps) {
  const [visibleRepliesCount, setVisibleRepliesCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [showContextMenu, setShowContextMenu] = useState(false);

  const visibleReplies = replies.slice(0, visibleRepliesCount);
  const remainingReplies = replies.length - visibleRepliesCount;
  const hasMoreReplies = remainingReplies > 0;
  
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const isOwner = currentUserId && userId && currentUserId === userId;

  const handleSaveEdit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(id, editContent.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  const handleTouchStart = useCallback(() => {
    if (!isOwner) return;
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setShowContextMenu(true);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  }, [isOwner]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleContextAction = (action: 'edit' | 'delete') => {
    setShowContextMenu(false);
    if (action === 'edit') setIsEditing(true);
    else if (action === 'delete') onDelete?.(id);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${isReply ? "ml-10 mt-3" : ""}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        <div className="flex gap-3">
          <div className={`${isReply ? "w-7 h-7" : "w-9 h-9"} rounded-full bg-secondary flex items-center justify-center flex-shrink-0`}>
            <User className={`${isReply ? "w-3.5 h-3.5" : "w-4 h-4"}`} weight="bold" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{authorName}</span>
                  <span className="text-xs text-muted-foreground">{createdAt}</span>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[60px] text-sm resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit} className="h-7 text-xs">
                        Salvar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-7 text-xs">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <MentionText text={content} />
                )}

                {!isEditing && !isReply && (
                  <div className="mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onReply(id, authorName)}
                      className="h-7 px-2 text-muted-foreground text-xs"
                    >
                      Responder
                    </Button>
                  </div>
                )}
              </div>

              {!isEditing && (
                <div className="flex flex-col items-center gap-0.5 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onLikeToggle(id)}
                    className={`h-8 w-8 p-0 ${isLiked ? "text-red-500" : "text-muted-foreground"}`}
                  >
                    <motion.div
                      animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
                      transition={{ duration: 0.2 }}
                    >
                      <Heart className="w-4 h-4" weight={isLiked ? "fill" : "regular"} />
                    </motion.div>
                  </Button>
                  {likesCount > 0 && (
                    <span className="text-xs text-muted-foreground">{likesCount}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {visibleRepliesCount > 0 && visibleReplies.length > 0 && (
          <div className="mt-3 space-y-3">
            {visibleReplies.map((reply) => (
              <CommentItem
                key={reply.id}
                id={reply.id}
                content={reply.content}
                authorName={reply.authorName}
                createdAt={reply.createdAt}
                likesCount={reply.likesCount}
                isLiked={reply.isLiked}
                userId={reply.userId}
                currentUserId={currentUserId}
                onLikeToggle={onLikeToggle}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                isReply
              />
            ))}
          </div>
        )}

        {replies.length > 0 && hasMoreReplies && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisibleRepliesCount(prev => prev + 10)}
            className="ml-12 mt-2 text-xs text-primary font-medium"
          >
            Ver mais {Math.min(remainingReplies, 10)} resposta{Math.min(remainingReplies, 10) > 1 ? "s" : ""}
          </Button>
        )}
      </motion.div>

      <AnimatePresence>
        {showContextMenu && isOwner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
            onClick={() => setShowContextMenu(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-xl shadow-lg overflow-hidden w-64"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => handleContextAction('edit')}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary transition-colors text-left"
              >
                <Pencil className="w-5 h-5" />
                <span className="text-sm font-medium">Editar comentário</span>
              </button>
              <div className="h-px bg-border" />
              <button
                onClick={() => handleContextAction('delete')}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary transition-colors text-left text-destructive"
              >
                <Trash className="w-5 h-5" />
                <span className="text-sm font-medium">Excluir comentário</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
