import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, User } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface Reply {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
  likesCount: number;
  isLiked: boolean;
}

interface CommentItemProps {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
  likesCount: number;
  isLiked: boolean;
  replies?: Reply[];
  onLikeToggle: (commentId: string) => void;
  onReply: (commentId: string, authorName: string) => void;
  isReply?: boolean;
}

export function CommentItem({
  id,
  content,
  authorName,
  createdAt,
  likesCount,
  isLiked,
  replies = [],
  onLikeToggle,
  onReply,
  isReply = false,
}: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(true);

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
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm">{authorName}</span>
            <span className="text-xs text-muted-foreground">{createdAt}</span>
          </div>

          <p className="text-sm text-foreground/90 leading-relaxed">{content}</p>

          {/* Actions */}
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
              onLikeToggle={onLikeToggle}
              onReply={onReply}
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
