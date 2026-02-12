import { useState } from "react";
import { motion } from "framer-motion";
import { PlayCircle, Clock, User } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { MediaGallery } from "@/components/post/MediaGallery";
import { AuthorModal } from "@/components/post/AuthorModal";

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

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="pt-14"
    >
      {/* Hero Media */}
      {thumbnailUrl && (
        <div className="relative w-full aspect-video bg-muted">
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
          {/* Gradient overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
        </div>
      )}

      {/* Content Container */}
      <div className="max-w-2xl mx-auto px-5 py-6">
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
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-4">
          {title}
        </h1>

        {/* Meta Info */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-8">
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
          </button>
          <span>•</span>
          <span>{publishedAt}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {readTime}
          </span>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-border mb-8" />

        {/* Content - mentions rendered as clickable links via data attributes */}
        <div 
          className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-a:text-primary [&_.mention]:text-primary [&_.mention]:font-medium [&_.mention]:cursor-pointer"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content || '', { ADD_ATTR: ['data-mention-type', 'data-mention-id'] }) }}
        />

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
    </motion.article>
  );
}
