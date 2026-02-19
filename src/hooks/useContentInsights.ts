import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ContentSuggestion {
  title: string;
  type: 'espaco' | 'canal' | 'podcast' | 'curso';
  priority: 'alta' | 'media' | 'baixa';
  reasoning: string;
  suggested_space?: string;
  source_queries?: string[];
  source_channels?: string[];
}

export interface SourcesSummary {
  total_queries: number;
  total_channel_posts: number;
  total_channel_comments: number;
  queries_without_answer: number;
  top_channels_activity: { name: string; posts: number; comments: number }[];
}

export interface ContentInsight {
  id: string;
  period_start: string;
  period_end: string;
  sources_summary: SourcesSummary;
  suggestions: ContentSuggestion[];
  raw_analysis: string | null;
  status: string;
  created_at: string;
}

export function useContentInsights() {
  const queryClient = useQueryClient();

  const insightsQuery = useQuery({
    queryKey: ['content-insights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_insights')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ContentInsight[];
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('content-intelligence');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Relatório gerado com ${data.suggestions_count} sugestões`);
      queryClient.invalidateQueries({ queryKey: ['content-insights'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao gerar relatório');
    },
  });

  return {
    insights: insightsQuery.data || [],
    isLoading: insightsQuery.isLoading,
    error: insightsQuery.error,
    generate: generateMutation.mutate,
    isGenerating: generateMutation.isPending,
  };
}
