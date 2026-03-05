import { useState, useRef, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { motion } from "framer-motion";
import { PlayCircle, Clock, User } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { MediaGallery } from "@/components/post/MediaGallery";
import { AuthorModal } from "@/components/post/AuthorModal";
import { ContentPaywall } from "@/components/ContentPaywall";
import { CodeBlockCopyButton } from "@/components/post/CodeBlockCopyButton";
import { useUserAccess } from "@/hooks/useUserAccess";
import { useUserBadge } from "@/hooks/useUserBadge";
import { PremiumBadge } from "@/components/PremiumBadge";
import { supabase } from "@/integrations/supabase/client";

interface MediaItem {
  id: string;
  file_url: string;
  file_type: string;
  file_name: string | null;
  youtube_id: string | null;
}

interface Author {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  education: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
}

interface PostContentProps {
  title: string;
  content: string;
  thumbnailUrl: string | null;
  mediaType: string | null;
  spaceName: string;
  spaceSlug: string;
  authorName: string;
  publishedAt: string;
  readTime: string;
  media?: MediaItem[];
  author?: Author | null;
}

export function PostContent({
  title,
  content,
  thumbnailUrl,
  mediaType,
  spaceName,
  spaceSlug,
  authorName,
  publishedAt,
  readTime,
  media,
  author,
}: PostContentProps) {
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [mentionAuthor, setMentionAuthor] = useState<Author | null>(null);
  const [showMentionModal, setShowMentionModal] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const { canReadFullArticles } = useUserAccess();
  const badgeType = useUserBadge(author?.id);

  const handleMentionClick = useCallback(async (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const mentionEl = target.closest('.mention') as HTMLElement | null;
    if (!mentionEl) return;

    e.preventDefault();
    e.stopPropagation();

    const mentionId = mentionEl.getAttribute('data-mention-id');
    const mentionType = mentionEl.getAttribute('data-mention-type');
    if (!mentionId) return;

    try {
      if (mentionType === 'company') {
        const { data } = await supabase
          .from('companies')
          .select('id, name, logo_url, description, instagram_url, linkedin_url, website, industry')
          .eq('id', mentionId)
          .single();
        if (data) {
          setMentionAuthor({
            id: data.id,
            full_name: data.name,
            avatar_url: data.logo_url,
            bio: data.description,
            education: data.industry,
            instagram_url: data.instagram_url,
            linkedin_url: data.linkedin_url,
          });
          setShowMentionModal(true);
        }
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio, education, instagram_url, linkedin_url')
          .eq('id', mentionId)
          .single();
        if (data) {
          setMentionAuthor(data);
          setShowMentionModal(true);
        }
      }
    } catch (err) {
      console.error('Error fetching mention profile:', err);
    }
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.addEventListener('click', handleMentionClick);
    return () => el.removeEventListener('click', handleMentionClick);
  }, [handleMentionClick, content]);

  // Inject copy buttons into code blocks
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const roots: ReturnType<typeof createRoot>[] = [];

    // Aguarda o DOM estabilizar após o dangerouslySetInnerHTML
    const timer = setTimeout(() => {
      // Remover botões antigos antes de re-injetar (evita duplicatas)
      el.querySelectorAll('.code-copy-btn').forEach((btn) => btn.remove());

      const preBlocks = el.querySelectorAll('pre');
      preBlocks.forEach((pre) => {
        pre.style.position = 'relative';
        const container = document.createElement('div');
        container.className = 'code-copy-btn';
        pre.appendChild(container);

        const codeText = pre.querySelector('code')?.textContent || pre.textContent || '';
        const root = createRoot(container);
        root.render(<CodeBlockCopyButton code={codeText} />);
        roots.push(root);
      });
    }, 50);

    return () => {
      clearTimeout(timer);
      roots.forEach((root) => root.unmount());
    };
  }, [content, canReadFullArticles]);

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="pt-14"
    >
      {/* Hero Media */}
      {thumbnailUrl && (
        <div className="relative w-full aspect-video bg-muted lg:max-h-[480px] lg:overflow-hidden">
          <img
            src={thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
          />
          {mediaType === "video" && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/40">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="w-16 h-16 rounded-full bg-background/90 flex items-center justify-center cursor-pointer"
              >
                <PlayCircle className="w-10 h-10 text-foreground" weight="fill" />
              </motion.div>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
        </div>
      )}

      {/* Content Container */}
      <div className="max-w-2xl mx-auto px-5 py-6 lg:px-10 lg:py-8">
        {/* Space Badge */}
        <Link to={`/spaces/${spaceSlug}`}>
          <Badge 
            variant="secondary" 
            className="mb-4 hover:bg-accent transition-colors cursor-pointer"
          >
            {spaceName}
          </Badge>
        </Link>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-4 lg:text-[2.25rem] lg:leading-[1.2] lg:tracking-tight">
          {title}
        </h1>

        {/* Meta Info */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-8 flex-wrap">
          <button 
            onClick={() => author && setShowAuthorModal(true)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            disabled={!author}
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={author?.avatar_url || undefined} />
              <AvatarFallback className="bg-secondary">
                <User className="w-4 h-4" weight="bold" />
              </AvatarFallback>
            </Avatar>
            <span className={`font-medium text-foreground ${author ? 'hover:underline cursor-pointer' : ''}`}>
              {authorName}
            </span>
            <PremiumBadge type={badgeType} size={16} />
          </button>
          <span className="text-border">·</span>
          <span>{publishedAt}</span>
          <span className="text-border">·</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {readTime}
          </span>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-border/60 mb-8" />

        {/* Content */}
        {canReadFullArticles ? (
          <div 
            ref={contentRef}
            className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-a:text-primary [&_.mention]:text-primary [&_.mention]:font-medium [&_.mention]:cursor-pointer lg:prose-base lg:leading-[1.85] lg:[&_p]:text-[17px] lg:[&_li]:text-[17px]"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content || '', { ADD_ATTR: ['data-mention-type', 'data-mention-id'] }) }}
          />
        ) : (
          <ContentPaywall maxLines={7} type="article">
            <div 
              ref={contentRef}
              className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-a:text-primary [&_.mention]:text-primary [&_.mention]:font-medium [&_.mention]:cursor-pointer lg:prose-base lg:leading-[1.85] lg:[&_p]:text-[17px] lg:[&_li]:text-[17px]"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content || '', { ADD_ATTR: ['data-mention-type', 'data-mention-id'] }) }}
            />
          </ContentPaywall>
        )}

        {/* Media Gallery */}
        {media && media.length > 0 && (
          <div className="mt-8">
            <MediaGallery media={media} />
          </div>
        )}
      </div>

      {/* Author Modal */}
      <AuthorModal 
        author={author || null} 
        isOpen={showAuthorModal} 
        onClose={() => setShowAuthorModal(false)} 
      />

      {/* Mention Modal */}
      <AuthorModal 
        author={mentionAuthor} 
        isOpen={showMentionModal} 
        onClose={() => setShowMentionModal(false)} 
      />
    </motion.article>
  );
}
