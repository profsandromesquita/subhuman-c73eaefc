import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface ContentPaywallProps {
  children: ReactNode;
  maxLines: number;
  type: 'article' | 'channel' | 'podcast' | 'ai';
}

const SUBTEXTS: Record<ContentPaywallProps['type'], string> = {
  article: 'Leia artigos completos e tenha acesso a todo o conteúdo.',
  channel: 'Participe das discussões e veja todas as publicações.',
  podcast: 'Ouça podcasts exclusivos sobre IA e tecnologia.',
  ai: 'Use o assistente de IA para tirar suas dúvidas.',
};

export function ContentPaywall({ children, maxLines, type }: ContentPaywallProps) {
  const navigate = useNavigate();
  const lineHeight = 1.625; // prose line-height ~26px
  const maxHeight = maxLines * lineHeight;

  return (
    <div className="relative">
      <div
        className="overflow-hidden"
        style={{ maxHeight: `${maxHeight}em` }}
      >
        {children}
      </div>

      {/* Gradient overlay */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ height: `${Math.min(maxLines * 0.8, 6)}em` }}
      >
        <div className="w-full h-full bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      {/* CTA Card */}
      <div className="relative -mt-4 flex flex-col items-center text-center py-8 px-4">
        <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-muted-foreground" weight="bold" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          Desbloqueie este conteúdo com seu Passe VIP
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          {SUBTEXTS[type]}
        </p>
        <Button onClick={() => navigate('/plans')} className="px-8">
          Ver planos
        </Button>
      </div>
    </div>
  );
}
