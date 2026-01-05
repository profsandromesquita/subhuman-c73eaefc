import { useState } from 'react';
import {
  Brain,
  Megaphone,
  Code,
  FilmStrip,
  Heart,
  Rocket,
  Lightning,
  Star,
  Fire,
  Target,
  Trophy,
  Lightbulb,
  BookOpen,
  Wallet,
  ChartLine,
  Globe,
  Users,
  ChatCircle,
  Camera,
  Palette,
  MusicNote,
  GameController,
  Airplane,
  ShoppingCart,
  House,
  Briefcase,
  GraduationCap,
  FirstAid,
  Leaf,
  Barbell,
  Coffee,
  PuzzlePiece,
  Atom,
  Robot,
  Sparkle,
  IconProps
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ForwardRefExoticComponent, RefAttributes } from 'react';

type PhosphorIcon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

export const AVAILABLE_ICONS: Record<string, PhosphorIcon> = {
  Brain,
  Megaphone,
  Code,
  FilmStrip,
  Heart,
  Rocket,
  Lightning,
  Star,
  Fire,
  Target,
  Trophy,
  Lightbulb,
  BookOpen,
  Wallet,
  ChartLine,
  Globe,
  Users,
  ChatCircle,
  Camera,
  Palette,
  MusicNote,
  GameController,
  Airplane,
  ShoppingCart,
  House,
  Briefcase,
  GraduationCap,
  FirstAid,
  Leaf,
  Barbell,
  Coffee,
  PuzzlePiece,
  Atom,
  Robot,
  Sparkle,
};

export function getIconComponent(iconName: string | null): PhosphorIcon {
  if (!iconName || !AVAILABLE_ICONS[iconName]) {
    return Rocket;
  }
  return AVAILABLE_ICONS[iconName];
}

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const SelectedIcon = getIconComponent(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-12"
        >
          <div className="p-1.5 bg-secondary rounded-lg">
            <SelectedIcon className="w-5 h-5" weight="bold" />
          </div>
          <span className="text-muted-foreground">
            {value || 'Selecionar ícone'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="grid grid-cols-6 gap-2">
          {Object.entries(AVAILABLE_ICONS).map(([name, Icon]) => (
            <button
              key={name}
              onClick={() => {
                onChange(name);
                setOpen(false);
              }}
              className={cn(
                'p-2.5 rounded-lg transition-colors hover:bg-secondary',
                value === name && 'bg-foreground text-background hover:bg-foreground'
              )}
              title={name}
            >
              <Icon className="w-5 h-5" weight="bold" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
