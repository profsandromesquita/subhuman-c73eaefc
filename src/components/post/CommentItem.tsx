import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, User, DotsThree, Pencil, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";

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
  const [showReplies, setShowReplies] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${isReply ? "ml-10 mt-3" : ""}`}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className={`${isReply ? "w-7 h-7" : "w-9 h-9"} rounded-full bg-secondary flex items-center justify-center flex-shrink-0`}>
          <User className={`${isReply ? "w-3.5 h-3.5" : "w-4 h-4"}`} weight="bold" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{authorName}</span>
              <span className="text-xs text-muted-foreground">{createdAt}</span>
            </div>

            {/* Menu de opções - apenas para o dono do comentário */}
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <DotsThree className="w-5 h-5" weight="bold" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem
                    onClick={() => setIsEditing(true)}
                    className="gap-2"
                  >
                    <Pencil className="w-4 h-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete?.(id)}
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash className="w-4 h-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
            <p className="text-sm text-foreground/90 leading-relaxed">{content}</p>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-4 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLikeToggle(id)}
                className={`h-7 px-2 gap-1.5 ${isLiked ? "text-red-500" : "text-muted-foreground"}`}
              >
                <motion.div
                  animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 0.2 }}
                >
                  <Heart className="w-3.5 h-3.5" weight={isLiked ? "fill" : "regular"} />
                </motion.div>
                {likesCount > 0 && <span className="text-xs">{likesCount}</span>}
              </Button>

              {!isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReply(id, authorName)}
                  className="h-7 px-2 text-muted-foreground text-xs"
                >
                  Responder
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && showReplies && (
        <div className="mt-3 space-y-3">
          {replies.map((reply) => (
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

      {/* Show more replies */}
      {replies.length > 0 && !showReplies && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowReplies(true)}
          className="ml-12 mt-2 text-xs text-muted-foreground"
        >
          Ver {replies.length} resposta{replies.length > 1 ? "s" : ""}
        </Button>
      )}
    </motion.div>
  );
}
