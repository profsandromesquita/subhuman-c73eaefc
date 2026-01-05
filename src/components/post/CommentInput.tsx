import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PaperPlaneTilt, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface CommentInputProps {
  onSubmit: (content: string, parentId?: string) => void;
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
  const [content, setContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (replyTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyTo]);

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit(content.trim(), replyTo?.id);
    setContent("");
    setIsFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      initial={false}
      animate={{
        height: isFocused || content || replyTo ? "auto" : "auto",
      }}
      className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 pb-safe"
    >
      <div className="max-w-2xl mx-auto">
        {/* Reply indicator */}
        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between mb-2 text-sm"
            >
              <span className="text-muted-foreground">
                Respondendo a <span className="text-foreground font-medium">@{replyTo.authorName}</span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onCancelReply}
              >
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => !content && setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder={replyTo ? `Responder a @${replyTo.authorName}...` : placeholder}
              rows={1}
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              style={{
                minHeight: "44px",
                maxHeight: "120px",
              }}
            />
          </div>

          <AnimatePresence>
            {(content || isFocused) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Button
                  size="icon"
                  onClick={handleSubmit}
                  disabled={!content.trim()}
                  className="h-11 w-11 rounded-xl"
                >
                  <PaperPlaneTilt className="w-5 h-5" weight="fill" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
