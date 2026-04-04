import { useState, useEffect } from "react";
import { ArrowLeft, BookmarkSimple, ShareNetwork } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface PostHeaderProps {
  isSaved: boolean;
  onSaveToggle: () => void;
  title: string;
  isGuest?: boolean;
  spaceSlug?: string;
}

export function PostHeader({ isSaved, onSaveToggle, title, isGuest, spaceSlug }: PostHeaderProps) {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copiado!");
      }
    } catch {
      // User cancelled share
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 w-full z-50 border-b backdrop-blur-md pt-safe transition-colors duration-200 ${
        scrolled
          ? "bg-background/95 border-border"
          : "bg-transparent border-transparent"
      }`}
    >
      <div className="px-4 h-14 flex items-center justify-between lg:px-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => isGuest ? navigate("/") : navigate(-1)}
          className="text-foreground hover:bg-secondary"
        >
          <ArrowLeft className="w-5 h-5" weight="bold" />
        </Button>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onSaveToggle}
            className={`transition-colors ${isSaved ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <BookmarkSimple 
              className="w-5 h-5" 
              weight={isSaved ? "fill" : "regular"} 
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="text-muted-foreground hover:text-foreground"
          >
            <ShareNetwork className="w-5 h-5" weight="bold" />
          </Button>
        </div>
      </div>
    </header>
  );
}
