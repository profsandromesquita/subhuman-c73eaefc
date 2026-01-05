import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowLeft, BookmarkSimple, ShareNetwork } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface PostHeaderProps {
  isSaved: boolean;
  onSaveToggle: () => void;
  title: string;
}

export function PostHeader({ isSaved, onSaveToggle, title }: PostHeaderProps) {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  
  const headerBg = useTransform(
    scrollY,
    [0, 100],
    ["hsl(0 0% 0% / 0)", "hsl(0 0% 0% / 0.95)"]
  );
  
  const headerBorder = useTransform(
    scrollY,
    [0, 100],
    ["hsl(0 0% 18% / 0)", "hsl(0 0% 18% / 1)"]
  );

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: title,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copiado!",
          description: "O link foi copiado para a área de transferência",
        });
      }
    } catch (error) {
      // User cancelled share
    }
  };

  return (
    <motion.header
      style={{ 
        backgroundColor: headerBg,
        borderBottomColor: headerBorder,
      }}
      className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md"
    >
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
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
    </motion.header>
  );
}
