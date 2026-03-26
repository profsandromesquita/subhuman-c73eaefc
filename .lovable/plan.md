

# Plano: Fix NotAllowedError no TTS

## Problema

`audio.play()` é chamado após múltiplos `await` (getSession, fetch TTS), perdendo o contexto de gesto do usuário. Safari e Chrome bloqueiam com `NotAllowedError`.

## Correção 1 — Desbloquear AudioContext no clique (linhas 219-230)

Na função `play()`, após as limpezas e antes de `await generateAndPlayChunk(0)`, inserir bloco síncrono que cria `AudioContext`, toca buffer silencioso e fecha após 500ms. Isso "desbloqueia" o áudio no contexto do gesto do usuário.

```typescript
// Após setErrorMessage(null) e antes de await generateAndPlayChunk(0):
try {
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (AC) {
    const ctx = new AC();
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    setTimeout(() => ctx.close(), 500);
  }
} catch { /* falha silenciosa */ }
```

## Correção 2 — Não awaitar audio.play() (linhas 199-200)

Em `generateAndPlayChunk`, substituir `await audio.play()` por `.catch()`:

```typescript
audio.play().catch(err => {
  if (isCancelledRef.current) return;
  console.error('audio.play() failed:', err);
  setStatus('error');
  setErrorMessage('Não foi possível reproduzir o áudio.');
});
if (chunkIndex === 0) setStatus('playing');
```

## Arquivo alterado

`src/hooks/useArticleTTS.ts` — 2 edits (play + generateAndPlayChunk)

