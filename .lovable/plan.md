

# Plano: Corrigir sincronismo de curtidas/comentários no app mobile (PWA)

## Diagnóstico

Após investigação profunda, confirmei que:
- **Banco de dados está correto**: ambas as views (`space_update_stats`, `channel_post_stats`) retornam dados para TODAS as postagens
- **Código de renderização é idêntico** para mobile e desktop — não há branch condicional por dispositivo
- **Sem erros no console**

### Causa raiz identificada: cache do TanStack Query + ciclo de vida da PWA

O `queryClient.ts` global tem duas configurações que causam o problema no contexto de PWA mobile:

1. **`refetchOnWindowFocus: false`** — Quando o usuário reabre o app (PWA) após colocá-lo em background, o TanStack Query NÃO busca dados novos. No desktop, o usuário tende a recarregar a página (F5 / nova aba), o que força um fetch fresco.

2. **`staleTime: 5 minutos`** + **`gcTime: 30 minutos`** — Dados ficam em cache até 30 minutos. No app mobile, a PWA pode sobreviver em memória por horas sem ser fechada, servindo dados obsoletos.

3. **`placeholderData: previousData`** — Enquanto o refetch acontece (se acontecer), a UI mostra os dados antigos. Se o fetch original foi feito quando as views tinham `security_invoker=on`, os contadores ficaram em `0` e permanecem assim no cache.

**Resultado**: No desktop o usuário recarrega e obtém dados frescos; no mobile, o app PWA em background continua mostrando cache antigo sem nunca disparar um refetch.

## Correção

### 1. Habilitar `refetchOnWindowFocus` no queryClient global

Mudar de `false` para `true`. Isso garante que ao reabrir a PWA (evento `visibilitychange`), as queries stale são revalidadas automaticamente.

### 2. Reduzir `staleTime` para queries de engajamento

As queries de Home já sobrescrevem para 2 minutos. Manter o global em 5 minutos, mas garantir que `refetchOnWindowFocus: true` atue corretamente.

### 3. Versionar o Service Worker para forçar atualização

Adicionar uma constante de versão no `sw.js` para garantir que qualquer usuário com PWA instalada receba a versão mais recente do app (e consequentemente o código atualizado do fetch de stats).

### Arquivos impactados

| Arquivo | Alteração |
|---|---|
| `src/lib/queryClient.ts` | Mudar `refetchOnWindowFocus` para `true` |
| `public/sw.js` | Adicionar constante de versão + limpar cache antigo no `activate` |

### Risco
Baixo. Habilitar `refetchOnWindowFocus` aumenta levemente o número de requests mas é o padrão recomendado pelo TanStack Query. A limpeza de cache do SW é segura pois só remove caches antigas.

