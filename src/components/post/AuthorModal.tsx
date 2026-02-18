import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { InstagramLogo, LinkedinLogo, Globe, PaperPlaneTilt, X } from "@phosphor-icons/react";
import { useUserBadge } from "@/hooks/useUserBadge";
import { PremiumBadge } from "@/components/PremiumBadge";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

const MAX_MESSAGE_LENGTH = 500;

export function AuthorModal({ author, isOpen, onClose }: AuthorModalProps) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  if (!author) return null;

  const hasSocialLinks = author.instagram_url || author.linkedin_url || author.website;
  const badgeType = useUserBadge(author.id);
  const isOwnProfile = user?.id === author.id;
  const canSendMessage = !!user && !isOwnProfile;

  const handleSendMessage = async () => {
    if (!user || !messageText.trim()) return;
    setSending(true);
    try {
      const senderName = profile?.full_name || "Alguém";
      const { error } = await supabase.from("notifications").insert({
        user_id: author.id,
        sender_id: user.id,
        type: "direct_message",
        title: `Mensagem de ${senderName}`,
        message: messageText.trim(),
      });
      if (error) throw error;
      toast.success("Mensagem enviada!");
      setMessageText("");
      setShowMessageForm(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setShowMessageForm(false);
    setMessageText("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
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
            <div className="flex gap-3 flex-wrap justify-center mb-4">
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
            <p className="text-sm text-muted-foreground mb-4">
              Este autor ainda não completou seu perfil.
            </p>
          )}

          {/* Botão de mensagem / Formulário */}
          {canSendMessage && (
            <>
              <Separator className="my-2 w-full" />
              {!showMessageForm ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-2"
                  onClick={() => setShowMessageForm(true)}
                >
                  <PaperPlaneTilt className="w-4 h-4" />
                  Enviar mensagem
                </Button>
              ) : (
                <div className="w-full mt-3 space-y-3 text-left">
                  <Textarea
                    placeholder="Escreva sua mensagem..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                    className="resize-none text-sm"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {messageText.length}/{MAX_MESSAGE_LENGTH}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setShowMessageForm(false); setMessageText(""); }}
                        disabled={sending}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSendMessage}
                        disabled={!messageText.trim() || sending}
                        className="gap-2"
                      >
                        <PaperPlaneTilt className="w-4 h-4" />
                        {sending ? "Enviando..." : "Enviar"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
