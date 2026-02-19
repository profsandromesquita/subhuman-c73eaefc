import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Lightbulb, Spinner, CaretDown, CaretUp, ArrowLeft, ChatCircle, Microphone, GraduationCap, Article } from '@phosphor-icons/react';
import { useContentInsights, type ContentInsight, type ContentSuggestion } from '@/hooks/useContentInsights';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const typeConfig: Record<string, { label: string; icon: typeof Article; className: string }> = {
  espaco: { label: 'Espaço', icon: Article, className: 'bg-blue-500/20 text-blue-400' },
  canal: { label: 'Canal', icon: ChatCircle, className: 'bg-green-500/20 text-green-400' },
  podcast: { label: 'Podcast', icon: Microphone, className: 'bg-purple-500/20 text-purple-400' },
  curso: { label: 'Curso', icon: GraduationCap, className: 'bg-amber-500/20 text-amber-400' },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  alta: { label: 'Alta', className: 'bg-red-500/20 text-red-400' },
  media: { label: 'Média', className: 'bg-yellow-500/20 text-yellow-400' },
  baixa: { label: 'Baixa', className: 'bg-muted text-muted-foreground' },
};

function SuggestionCard({ suggestion }: { suggestion: ContentSuggestion }) {
  const [open, setOpen] = useState(false);
  const type = typeConfig[suggestion.type] || typeConfig.espaco;
  const priority = priorityConfig[suggestion.priority] || priorityConfig.baixa;
  const TypeIcon = type.icon;

  return (
    <div className="bg-card rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={type.className}>
              <TypeIcon className="w-3 h-3 mr-1" weight="regular" />
              {type.label}
            </Badge>
            <Badge variant="outline" className={priority.className}>
              {priority.label}
            </Badge>
          </div>
          <h4 className="font-semibold text-foreground">{suggestion.title}</h4>
          <p className="text-sm text-muted-foreground">{suggestion.reasoning}</p>
        </div>
      </div>

      {((suggestion.source_queries && suggestion.source_queries.length > 0) ||
        (suggestion.source_channels && suggestion.source_channels.length > 0)) && (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {open ? <CaretUp className="w-3 h-3" /> : <CaretDown className="w-3 h-3" />}
            Fontes de dados
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {suggestion.source_queries && suggestion.source_queries.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Perguntas relacionadas:</p>
                <ul className="space-y-1">
                  {suggestion.source_queries.map((q, i) => (
                    <li key={i} className="text-xs text-muted-foreground bg-background rounded px-2 py-1">
                      "{q}"
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {suggestion.source_channels && suggestion.source_channels.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Canais relacionados:</p>
                <div className="flex gap-1 flex-wrap">
                  {suggestion.source_channels.map((c, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function InsightDetail({ insight, onBack }: { insight: ContentInsight; onBack: () => void }) {
  const summary = insight.sources_summary;
  const suggestions = insight.suggestions || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Relatório {format(new Date(insight.created_at), "dd/MM/yyyy", { locale: ptBR })}
          </h2>
          <p className="text-sm text-muted-foreground">
            Período: {format(new Date(insight.period_start), "dd/MM", { locale: ptBR })} — {format(new Date(insight.period_end), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Sources Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{summary.total_queries}</p>
          <p className="text-xs text-muted-foreground">Perguntas IA</p>
        </div>
        <div className="bg-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{summary.queries_without_answer}</p>
          <p className="text-xs text-muted-foreground">Sem resposta</p>
        </div>
        <div className="bg-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{summary.total_channel_posts}</p>
          <p className="text-xs text-muted-foreground">Posts canais</p>
        </div>
        <div className="bg-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{summary.total_channel_comments}</p>
          <p className="text-xs text-muted-foreground">Comentários</p>
        </div>
      </div>

      {/* Channel Activity */}
      {summary.top_channels_activity && summary.top_channels_activity.length > 0 && (
        <div className="bg-card rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Atividade por Canal</h3>
          <div className="space-y-2">
            {summary.top_channels_activity.map((ch, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{ch.name}</span>
                <span className="text-foreground">{ch.posts} posts · {ch.comments} comentários</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">
          Sugestões de Conteúdo ({suggestions.length})
        </h3>
        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <SuggestionCard key={i} suggestion={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ContentIntelligence() {
  const { insights, isLoading, generate, isGenerating } = useContentInsights();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedInsight = insights.find((i) => i.id === selectedId);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {selectedInsight ? (
          <InsightDetail insight={selectedInsight} onBack={() => setSelectedId(null)} />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Lightbulb className="w-6 h-6" weight="regular" />
                  Inteligência de Conteúdo
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Sugestões de pautas baseadas no engajamento dos usuários
                </p>
              </div>
              <Button
                onClick={() => generate()}
                disabled={isGenerating}
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                {isGenerating ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  'Gerar Relatório Agora'
                )}
              </Button>
            </div>

            {/* Reports List */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : insights.length === 0 ? (
              <div className="text-center py-16">
                <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground mb-4" weight="regular" />
                <h3 className="text-lg font-semibold text-foreground">Nenhum relatório gerado</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Clique em "Gerar Relatório Agora" para criar o primeiro
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {insights.map((insight) => {
                  const summary = insight.sources_summary;
                  const suggestionsCount = (insight.suggestions || []).length;

                  return (
                    <button
                      key={insight.id}
                      onClick={() => setSelectedId(insight.id)}
                      className="w-full bg-card hover:bg-elevated rounded-xl p-5 text-left transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground">
                            Relatório {format(new Date(insight.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(insight.period_start), "dd/MM", { locale: ptBR })} — {format(new Date(insight.period_end), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">{suggestionsCount}</p>
                          <p className="text-xs text-muted-foreground">sugestões</p>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                        <span>{summary.total_queries} perguntas</span>
                        <span>{summary.queries_without_answer} sem resposta</span>
                        <span>{summary.total_channel_posts} posts</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
