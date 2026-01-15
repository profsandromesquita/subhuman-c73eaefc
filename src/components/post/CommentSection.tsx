import { ChatCircle } from "@phosphor-icons/react";
import { CommentItem } from "./CommentItem";

interface Reply {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
  likesCount: number;
  isLiked: boolean;
  userId?: string;
}

interface Comment {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
  likesCount: number;
  isLiked: boolean;
  userId?: string;
  replies: Reply[];
}

interface CommentSectionProps {
  comments: Comment[];
  currentUserId?: string;
  onLikeComment: (commentId: string) => void;
  onReplyComment: (commentId: string, authorName: string) => void;
  onEditComment?: (commentId: string, newContent: string) => void;
  onDeleteComment?: (commentId: string) => void;
}

export function CommentSection({
  comments,
  currentUserId,
  onLikeComment,
  onReplyComment,
  onEditComment,
  onDeleteComment,
}: CommentSectionProps) {
  return (
    <div className="max-w-2xl mx-auto px-5 pb-32">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <ChatCircle className="w-5 h-5" weight="bold" />
        <h2 className="font-bold text-lg">
          Comentários ({comments.length})
        </h2>
      </div>

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="text-center py-12">
          <ChatCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Seja o primeiro a comentar!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              id={comment.id}
              content={comment.content}
              authorName={comment.authorName}
              createdAt={comment.createdAt}
              likesCount={comment.likesCount}
              isLiked={comment.isLiked}
              userId={comment.userId}
              currentUserId={currentUserId}
              replies={comment.replies}
              onLikeToggle={onLikeComment}
              onReply={onReplyComment}
              onEdit={onEditComment}
              onDelete={onDeleteComment}
            />
          ))}
        </div>
      )}
    </div>
  );
}
