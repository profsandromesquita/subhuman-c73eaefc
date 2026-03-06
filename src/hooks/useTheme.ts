import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ThemeSlug =
  | 'default'
  | 'outubro_rosa'
  | 'setembro_amarelo'
  | 'novembro_azul'
  | 'mes_mulheres'
  | 'natal';

type ThemePalette = Record<string, string>;

const THEME_PALETTES: Record<Exclude<ThemeSlug, 'default'>, ThemePalette> = {
  outubro_rosa: {
    '--background': '330 8% 4%',
    '--foreground': '330 5% 98%',
    '--card': '330 6% 8%',
    '--card-foreground': '330 5% 98%',
    '--popover': '330 6% 10%',
    '--popover-foreground': '330 5% 98%',
    '--primary': '330 70% 60%',
    '--primary-foreground': '330 10% 5%',
    '--secondary': '330 8% 14%',
    '--secondary-foreground': '330 5% 98%',
    '--muted': '330 6% 17%',
    '--muted-foreground': '330 5% 60%',
    '--accent': '330 10% 20%',
    '--accent-foreground': '330 5% 98%',
    '--border': '330 6% 20%',
    '--input': '330 6% 17%',
    '--ring': '330 70% 60%',
    '--surface-elevated': '330 6% 12%',
    '--surface-hover': '330 6% 16%',
  },
  setembro_amarelo: {
    '--background': '45 10% 4%',
    '--foreground': '45 5% 98%',
    '--card': '45 8% 8%',
    '--card-foreground': '45 5% 98%',
    '--popover': '45 8% 10%',
    '--popover-foreground': '45 5% 98%',
    '--primary': '45 80% 55%',
    '--primary-foreground': '45 10% 5%',
    '--secondary': '45 8% 14%',
    '--secondary-foreground': '45 5% 98%',
    '--muted': '45 6% 17%',
    '--muted-foreground': '45 5% 60%',
    '--accent': '45 10% 20%',
    '--accent-foreground': '45 5% 98%',
    '--border': '45 6% 20%',
    '--input': '45 6% 17%',
    '--ring': '45 80% 55%',
    '--surface-elevated': '45 6% 12%',
    '--surface-hover': '45 6% 16%',
  },
  novembro_azul: {
    '--background': '210 10% 4%',
    '--foreground': '210 5% 98%',
    '--card': '210 8% 8%',
    '--card-foreground': '210 5% 98%',
    '--popover': '210 8% 10%',
    '--popover-foreground': '210 5% 98%',
    '--primary': '210 70% 55%',
    '--primary-foreground': '210 10% 5%',
    '--secondary': '210 8% 14%',
    '--secondary-foreground': '210 5% 98%',
    '--muted': '210 6% 17%',
    '--muted-foreground': '210 5% 60%',
    '--accent': '210 10% 20%',
    '--accent-foreground': '210 5% 98%',
    '--border': '210 6% 20%',
    '--input': '210 6% 17%',
    '--ring': '210 70% 55%',
    '--surface-elevated': '210 6% 12%',
    '--surface-hover': '210 6% 16%',
  },
  mes_mulheres: {
    '--background': '340 8% 4%',
    '--foreground': '340 5% 98%',
    '--card': '340 6% 8%',
    '--card-foreground': '340 5% 98%',
    '--popover': '340 6% 10%',
    '--popover-foreground': '340 5% 98%',
    '--primary': '340 65% 60%',
    '--primary-foreground': '340 10% 5%',
    '--secondary': '340 8% 14%',
    '--secondary-foreground': '340 5% 98%',
    '--muted': '340 6% 17%',
    '--muted-foreground': '340 5% 60%',
    '--accent': '340 10% 20%',
    '--accent-foreground': '340 5% 98%',
    '--border': '340 6% 20%',
    '--input': '340 6% 17%',
    '--ring': '340 65% 60%',
    '--surface-elevated': '340 6% 12%',
    '--surface-hover': '340 6% 16%',
  },
  natal: {
    '--background': '140 8% 4%',
    '--foreground': '140 5% 98%',
    '--card': '140 6% 8%',
    '--card-foreground': '140 5% 98%',
    '--popover': '140 6% 10%',
    '--popover-foreground': '140 5% 98%',
    '--primary': '140 60% 45%',
    '--primary-foreground': '140 10% 5%',
    '--secondary': '140 8% 14%',
    '--secondary-foreground': '140 5% 98%',
    '--muted': '140 6% 17%',
    '--muted-foreground': '140 5% 60%',
    '--accent': '0 50% 20%',
    '--accent-foreground': '0 5% 98%',
    '--border': '140 6% 20%',
    '--input': '140 6% 17%',
    '--ring': '140 60% 45%',
    '--surface-elevated': '140 6% 12%',
    '--surface-hover': '140 6% 16%',
  },
};

const CSS_VARS = Object.keys(THEME_PALETTES.outubro_rosa);

export function useTheme() {
  const { data: themeSlug } = useQuery({
    queryKey: ['app-theme'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'active_theme')
        .maybeSingle();

      const val = data?.value;
      if (typeof val === 'string') return val as ThemeSlug;
      return 'default' as ThemeSlug;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    const root = document.documentElement;

    if (!themeSlug || themeSlug === 'default') {
      CSS_VARS.forEach((v) => root.style.removeProperty(v));
      return;
    }

    const palette = THEME_PALETTES[themeSlug];
    if (!palette) {
      CSS_VARS.forEach((v) => root.style.removeProperty(v));
      return;
    }

    Object.entries(palette).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    return () => {
      CSS_VARS.forEach((v) => root.style.removeProperty(v));
    };
  }, [themeSlug]);

  return themeSlug ?? 'default';
}

export const THEME_OPTIONS: { value: ThemeSlug; label: string; accent: string }[] = [
  { value: 'default', label: 'Padrão (Original)', accent: '#ffffff' },
  { value: 'outubro_rosa', label: 'Outubro Rosa', accent: 'hsl(330, 70%, 60%)' },
  { value: 'setembro_amarelo', label: 'Setembro Amarelo', accent: 'hsl(45, 80%, 55%)' },
  { value: 'novembro_azul', label: 'Novembro Azul', accent: 'hsl(210, 70%, 55%)' },
  { value: 'mes_mulheres', label: 'Mês das Mulheres', accent: 'hsl(340, 65%, 60%)' },
  { value: 'natal', label: 'Natal', accent: 'hsl(140, 60%, 45%)' },
];
