import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InstagramLogo, LinkedinLogo, Globe } from "@phosphor-icons/react";
import { useUserBadge } from "@/hooks/useUserBadge";
import { PremiumBadge } from "@/components/PremiumBadge";

interface Author {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  education: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  website?: string | null;
}

interface AuthorModalProps {
  author: Author | null;
  isOpen: boolean;
  onClose: () => void;
}

function getInitials(name: string | null): string {
  if (!name) return "A";
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AuthorModal({ author, isOpen, onClose }: AuthorModalProps) {
  if (!author) return null;

  const hasSocialLinks = author.instagram_url || author.linkedin_url || author.website;
  const badgeType = useUserBadge(author.id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col items-center text-center pt-4">
          {/* Avatar */}
          <Avatar className="w-20 h-20 mb-4">
            <AvatarImage src={author.avatar_url || undefined} />
            <AvatarFallback className="text-2xl bg-secondary">
              {getInitials(author.full_name)}
            </AvatarFallback>
          </Avatar>

          {/* Nome */}
          <h2 className="text-xl font-bold mb-1 flex items-center gap-1.5 justify-center">
            {author.full_name || "Autor"}
            <PremiumBadge type={badgeType} size={18} />
          </h2>

          {/* Formação */}
          {author.education && (
            <p className="text-sm text-muted-foreground mb-4">
              {author.education}
            </p>
          )}

          {/* Biografia */}
          {author.bio && (
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed px-4">
              {author.bio}
            </p>
          )}

          {/* Redes Sociais */}
          {hasSocialLinks && (
            <div className="flex gap-3 flex-wrap justify-center">
              {author.instagram_url && (
                <a 
                  href={author.instagram_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <InstagramLogo className="w-5 h-5" />
                  <span className="text-sm">Instagram</span>
                </a>
              )}
              {author.linkedin_url && (
                <a 
                  href={author.linkedin_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <LinkedinLogo className="w-5 h-5" />
                  <span className="text-sm">LinkedIn</span>
                </a>
              )}
              {author.website && (
                <a 
                  href={author.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <Globe className="w-5 h-5" />
                  <span className="text-sm">Website</span>
                </a>
              )}
            </div>
          )}

          {/* Mensagem quando não há informações */}
          {!author.bio && !author.education && !hasSocialLinks && (
            <p className="text-sm text-muted-foreground">
              Este autor ainda não completou seu perfil.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
