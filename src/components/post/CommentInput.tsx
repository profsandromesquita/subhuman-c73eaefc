import { MentionCommentInput, type MentionData } from "@/components/MentionCommentInput";

interface CommentInputProps {
  onSubmit: (content: string, parentId?: string, mentions?: MentionData[]) => void;
  replyTo?: { id: string; authorName: string } | null;
  onCancelReply?: () => void;
  placeholder?: string;
}

export function CommentInput({
  onSubmit,
  replyTo,
  onCancelReply,
  placeholder = "Escreva um comentário...",
}: CommentInputProps) {
  const handleSubmit = (content: string, mentions: MentionData[], parentId?: string) => {
    onSubmit(content, parentId, mentions);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 pb-safe">
      <div className="max-w-6xl mx-auto lg:px-10">
        <div className="lg:max-w-[760px]">
          <MentionCommentInput
            onSubmit={handleSubmit}
            replyTo={replyTo}
            onCancelReply={onCancelReply}
            placeholder={placeholder}
          />
        </div>
      </div>
    </div>
  );
}
