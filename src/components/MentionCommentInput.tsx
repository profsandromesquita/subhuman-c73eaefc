import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PaperPlaneTilt, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { fetchMentionSuggestions, type MentionSuggestionItem } from "@/components/MentionSuggestions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Buildings } from "@phosphor-icons/react";
import { useDebounce } from "@/hooks/useDebounce";

export interface MentionData {
  id: string;
  label: string;
  type: "user" | "company";
}

interface MentionCommentInputProps {
  onSubmit: (content: string, mentions: MentionData[], parentId?: string) => void;
  replyTo?: { id: string; authorName: string } | null;
  onCancelReply?: () => void;
  placeholder?: string;
}

export function MentionCommentInput({
  onSubmit,
  replyTo,
  onCancelReply,
  placeholder = "Escreva um comentário...",
}: MentionCommentInputProps) {
  const [content, setContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [mentions, setMentions] = useState<MentionData[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MentionSuggestionItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionStartPos, setMentionStartPos] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const debouncedQuery = useDebounce(mentionQuery || "", 200);

  useEffect(() => {
    if (replyTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyTo]);

  // Fetch suggestions when query changes
  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length >= 1) {
      fetchMentionSuggestions(debouncedQuery).then((results) => {
        setSuggestions(results);
        setSelectedIndex(0);
        setShowSuggestions(results.length > 0);
      });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedQuery]);

  const detectMentionQuery = useCallback((text: string, cursorPos: number) => {
    // Look backwards from cursor to find @
    const textBeforeCursor = text.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    
    if (atIndex === -1) {
      setMentionQuery(null);
      setShowSuggestions(false);
      return;
    }

    // Check if @ is at start or preceded by space/newline
    if (atIndex > 0 && !/\s/.test(textBeforeCursor[atIndex - 1])) {
      setMentionQuery(null);
      setShowSuggestions(false);
      return;
    }

    const query = textBeforeCursor.slice(atIndex + 1);
    // No spaces in query (means mention is complete)
    if (/\s/.test(query) && query.length > 0) {
      setMentionQuery(null);
      setShowSuggestions(false);
      return;
    }

    setMentionQuery(query);
    setMentionStartPos(atIndex);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    const cursorPos = e.target.selectionStart || 0;
    detectMentionQuery(newContent, cursorPos);
  };

  const handleSelectMention = (item: MentionSuggestionItem) => {
    const before = content.slice(0, mentionStartPos);
    const afterCursor = content.slice(textareaRef.current?.selectionStart || content.length);
    const mentionText = `@${item.label} `;
    const newContent = before + mentionText + afterCursor;
    
    setContent(newContent);
    setMentions((prev) => [...prev, { id: item.id, label: item.label, type: item.type }]);
    setShowSuggestions(false);
    setMentionQuery(null);

    // Focus and set cursor after mention
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = before.length + mentionText.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + suggestions.length - 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handleSelectMention(suggestions[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowSuggestions(false);
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey && !showSuggestions) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!content.trim()) return;
    // Filter mentions to only those still present in text
    const activeMentions = mentions.filter((m) => content.includes(`@${m.label}`));
    onSubmit(content.trim(), activeMentions, replyTo?.id);
    setContent("");
    setMentions([]);
    setIsFocused(false);
  };

  return (
    <div className="relative">
      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-0 right-0 mb-2 z-50"
          >
            <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
              {suggestions.map((item, index) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelectMention(item)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                    index === selectedIndex ? "bg-secondary" : "hover:bg-secondary/50"
                  }`}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={item.avatar || undefined} />
                    <AvatarFallback className="text-[10px] bg-muted">
                      {item.type === "user" ? <User className="w-3 h-3" /> : <Buildings className="w-3 h-3" />}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate flex-1">{item.label}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {item.type === "user" ? "Pessoa" : "Empresa"}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            onChange={handleChange}
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
  );
}
