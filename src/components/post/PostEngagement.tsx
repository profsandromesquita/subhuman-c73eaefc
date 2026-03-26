import { motion } from "framer-motion";
import { Heart, ChatCircle, BookmarkSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface PostEngagementProps {
  likesCount: number;
  commentsCount: number;
  savesCount?: number;
  isLiked: boolean;
  isSaved?: boolean;
  onLikeToggle: () => void;
  onCommentClick: () => void;
  onSave?: () => void;
}

export function PostEngagement({
  likesCount,
  commentsCount,
  savesCount,
  isLiked,
  isSaved = false,
  onLikeToggle,
  onCommentClick,
  onSave,
}: PostEngagementProps) {
  return (
    <div className="max-w-2xl mx-auto px-5 lg:max-w-none lg:px-0">
      {/* Divider */}
      <div className="w-full h-px bg-border mb-6" />
      
      {/* Stats */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
        <span className="flex items-center gap-1.5">
          <Heart className="w-4 h-4" weight="fill" />
          {likesCount} curtidas
        </span>
        <span className="flex items-center gap-1.5">
          <ChatCircle className="w-4 h-4" weight="fill" />
          {commentsCount} comentários
        </span>
        {savesCount !== undefined && (
          <span className="flex items-center gap-1.5">
            <BookmarkSimple className="w-4 h-4" weight="fill" />
            {savesCount} salvos
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <motion.div className="flex-1" whileTap={{ scale: 0.98 }}>
          <Button
            variant={isLiked ? "secondary" : "outline"}
            className={`w-full gap-2 h-12 ${isLiked ? "text-red-500" : ""}`}
            onClick={onLikeToggle}
          >
            <motion.div
              animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Heart 
                className="w-5 h-5" 
                weight={isLiked ? "fill" : "regular"} 
              />
            </motion.div>
            {isLiked ? "Curtido" : "Curtir"}
          </Button>
        </motion.div>
        
        <motion.div className="flex-1" whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            className="w-full gap-2 h-12"
            onClick={onCommentClick}
          >
            <ChatCircle className="w-5 h-5" />
            Comentar
          </Button>
        </motion.div>

        {onSave && (
          <motion.div className="flex-1" whileTap={{ scale: 0.98 }}>
            <Button
              variant={isSaved ? "secondary" : "outline"}
              className={`w-full gap-2 h-12 ${isSaved ? "text-primary" : ""}`}
              onClick={onSave}
            >
              <BookmarkSimple 
                className="w-5 h-5" 
                weight={isSaved ? "fill" : "regular"} 
              />
              {isSaved ? "Salvo" : "Salvar"}
            </Button>
          </motion.div>
        )}
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-border mt-8 mb-6" />
    </div>
  );
}
