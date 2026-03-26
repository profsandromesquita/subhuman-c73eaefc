import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Spinner } from '@phosphor-icons/react';

interface BackfillResult {
  success: number;
  failed: number;
  errors: string[];
  remaining?: number;
}

export default function TTSBackfill() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<BackfillResult | null>(null);
  const [elapsed, setElapsed] = useState('');
  const [currentBatch, setCurrentBatch] = useState(0);

  const runBackfill = async () => {
    setStatus('running');
    setResult(null);
    setCurrentBatch(0);
    const start = Date.now();

    const timer = setInterval(() => {
      const secs = Math.round((Date.now() - start) / 1000);
      const mins = Math.floor(secs / 60);
      setElapsed(mins > 0 ? `${mins}m ${secs % 60}s` : `${secs}s`);
    }, 1000);

    const accumulated: BackfillResult = { success: 0, failed: 0, errors: [] };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão inválida');

      let remaining = 999;
      let batch = 0;

      while (remaining > 0) {
        batch++;
        setCurrentBatch(batch);

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-backfill`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ limit: 1 }),
          }
        );

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Falha no backfill');
        }

        const data = await response.json();

        accumulated.success += data.success ?? 0;
        accumulated.failed += data.failed ?? 0;
        accumulated.errors.push(...(data.errors ?? []));
        accumulated.remaining = data.remaining ?? 0;
        remaining = data.remaining ?? 0;

        setResult({ ...accumulated });

        if ((data.success + data.failed) === 0) break;
      }

      setStatus('done');
    } catch (err) {
      console.error('Backfill error:', err);
      accumulated.errors.push(err instanceof Error ? err.message : 'Erro desconhecido');
      setResult({ ...accumulated });
      setStatus('error');
    } finally {
      clearInterval(timer);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Geração de Áudio em Massa</h1>
          <p className="text-muted-foreground mt-1">
            Gera áudio TTS para todos os artigos publicados sem áudio.
            Não feche esta página durante o processo.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-sm font-medium text-foreground">Informações do processo:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• 1 artigo processado por vez (evita timeout)</li>
            <li>• Artigos já gerados são ignorados automaticamente</li>
            <li>• Tempo estimado: ~30s por artigo</li>
          </ul>
        </div>

        <Button
          onClick={runBackfill}
          disabled={status === 'running'}
          size="lg"
          className="w-full"
        >
          {status === 'running' ? (
            <>
              <Spinner className="w-4 h-4 animate-spin" />
              Processando lote {currentBatch}... {elapsed}
            </>
          ) : status === 'done' ? (
            'Executar novamente'
          ) : (
            'Iniciar geração em massa'
          )}
        </Button>

        {status === 'running' && result && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-sm text-muted-foreground">⏳ Processando em lotes de 5 artigos...</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-500">{result.success}</p>
                <p className="text-xs text-muted-foreground">Gerados</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">{result.failed}</p>
                <p className="text-xs text-muted-foreground">Falhas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{result.remaining ?? '...'}</p>
                <p className="text-xs text-muted-foreground">Restantes</p>
              </div>
            </div>
          </div>
        )}

        {(status === 'done' || status === 'error') && result && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <p className="text-sm font-medium text-foreground">
              {status === 'done' ? '✅ Concluído' : '❌ Processo encerrado'}
              {elapsed && ` em ${elapsed}`}
            </p>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-green-500">{result.success}</p>
                <p className="text-sm text-muted-foreground">Gerados com sucesso</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-red-500">{result.failed}</p>
                <p className="text-sm text-muted-foreground">Falhas</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Artigos com falha:</p>
                <div className="text-xs text-muted-foreground space-y-1 max-h-40 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <p key={i}>• {e}</p>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Para reprocessar falhas, clique em executar novamente.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
