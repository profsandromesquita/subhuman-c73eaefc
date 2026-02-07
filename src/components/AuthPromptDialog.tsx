import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { UserPlus, SignIn } from "@phosphor-icons/react";

interface AuthPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthPromptDialog({ open, onOpenChange }: AuthPromptDialogProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = encodeURIComponent(location.pathname);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle>Entre para interagir</DialogTitle>
          <DialogDescription>
            Para curtir, comentar e salvar conteúdos, você precisa ter uma conta no Subhumano.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-2">
          <Button
            className="w-full"
            onClick={() => navigate(`/register?redirectTo=${redirectTo}`)}
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Criar conta
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(`/login?redirectTo=${redirectTo}`)}
          >
            <SignIn className="w-5 h-5 mr-2" />
            Já tenho conta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
