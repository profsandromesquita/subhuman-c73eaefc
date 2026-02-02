import { motion } from "framer-motion";
import { PlayCircle, Clock, User } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { MediaGallery } from "@/components/post/MediaGallery";

interface MediaItem {
  id: string;
  file_url: string;
  file_type: string;
  file_name: string | null;
  youtube_id: string | null;
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
}: PostContentProps) {
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-4 h-4" weight="bold" />
            </div>
            <span className="font-medium text-foreground">{authorName}</span>
          </div>
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

        {/* Content */}
        <div 
          className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-a:text-primary"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content || '') }}
        />

        {/* Media Gallery */}
        {media && media.length > 0 && (
          <div className="mt-8">
            <MediaGallery media={media} />
          </div>
        )}
      </div>
    </motion.article>
  );
}
