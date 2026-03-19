

# Diagnóstico: LiveStatsSection mostrando zeros

## Causa raiz identificada

Os dados estão corretos no banco:
- `total_likes: 1232`, `total_comments: 137`, `total_saves: 302`, `total_members: 66`, `total_articles: 76`, `total_podcasts: 8`, `total_posts: 43`

A edge function `get-platform-stats` também retorna os dados corretamente.

O problema está no **timing da primeira carga**: os primeiros requests da landing (21:49:38) retornaram zeros porque a migration criou a linha com defaults zero e o cron ainda não tinha rodado. O refresh só executou às 21:50:03. Durante esses ~3.5 minutos, o componente recebeu zeros.

O `useCountUp` tem a condição `target === 0 → return`, que ignora valores zero. Quando o poll seguinte trouxe dados reais, o hook deveria animar — mas se o usuário carregou a página durante a janela de zeros e não recarregou, pode ter ficado preso nos zeros.

Além disso, os logs do console mostram: **"Function components cannot be given refs"** em `ScrollReveal` dentro de `LiveStatsSection`, o que é um warning mas não causa zeros.

## Plano de correção

### 1. Remover dependência de timing — popular dados na migration

Ao invés de inserir uma linha com zeros e esperar o cron, executar o `refresh-platform-stats` imediatamente via insert tool para garantir que os dados estejam sempre populados. (Isso já foi feito e os dados já estão corretos.)

### 2. Corrigir o componente para lidar com carga inicial de zeros

No `useCountUp`, remover a condição `target === 0` que impede a animação. Quando o target muda de 0 para um valor real no próximo poll, a animação deve iniciar normalmente:

**Arquivo:** `src/components/landing/LiveStatsSection.tsx`, linha 38

Trocar:
```ts
if (!shouldStart || hasAnimated.current || target === 0) return;
```
Por:
```ts
if (!shouldStart || hasAnimated.current) return;
```

Isso garante que mesmo que o primeiro fetch retorne zeros, quando o poll seguinte trouxer dados reais, a animação aconteça.

### 3. Não renderizar a seção enquanto todos os valores forem zero

Adicionar uma verificação antes do render: se TODOS os contadores forem zero, retornar `null`. Isso evita mostrar uma seção vazia caso o refresh ainda não tenha rodado:

```ts
const allZero = displayStats && Object.entries(displayStats)
  .filter(([k]) => k !== 'updated_at')
  .every(([, v]) => v === 0);
if (!displayStats || allZero) return null;
```

Essas duas mudanças resolvem o problema: a seção só aparece com dados reais, e a animação funciona corretamente mesmo que a primeira resposta tenha sido zeros.

