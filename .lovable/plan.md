

# Plano: Corrigir permissoes de leitura/comentario em canais abertos

## Diagnostico

A causa raiz esta em `src/pages/ChannelPostDetail.tsx`. O componente usa `useUserAccess()` para decidir se mostra o conteudo completo ou o paywall, **sem considerar o tipo de acesso do canal**.

**Fluxo atual com problema:**

1. Canal "Geral" esta configurado como `access_type = 'open'` no admin
2. `ChannelDetail.tsx` (lista de posts) funciona — usa `useChannelAccess` e permite entrada no canal
3. Mas ao clicar num post, `ChannelPostDetail.tsx` verifica apenas `canReadFullChannelPosts` (linha 458) e `canComment` (linha 505) do `useUserAccess()`
4. Para freemium, `canReadFullChannelPosts = false` e `canComment = false`
5. Resultado: paywall exibido mesmo em canal aberto

**Codigo problematico (linhas 458-472, 505):**
```typescript
// Linha 458 — sempre usa permissao global, ignora access_type do canal
{canReadFullChannelPosts ? (
  <div ...content... />
) : (
  <ContentPaywall maxLines={1} type="channel">...</ContentPaywall>
)}

// Linha 505 — esconde comentarios para freemium mesmo em canal aberto
{canComment && ( ... )}
```

## Solucao

Adicionar `useChannelAccess(channelId)` em `ChannelPostDetail.tsx` e usar o `accessType` do canal para sobrescrever as permissoes quando o canal e aberto.

**Logica corrigida:**
```typescript
const { accessType } = useChannelAccess(channelId);
const isOpenChannel = accessType === 'open';

// Leitura: liberar se canal aberto OU se tem permissao por tier
const canReadContent = isOpenChannel || canReadFullChannelPosts;

// Comentario: liberar se canal aberto (e logado) OU se tem permissao por tier  
const canCommentHere = (isOpenChannel && !!user) || canComment;

// Curtida: ja esta liberada para freemium (alteracao anterior)
```

## Arquivo impactado

| Arquivo | Mudanca |
|---|---|
| `src/pages/ChannelPostDetail.tsx` | Importar `useChannelAccess`, criar variaveis `canReadContent` e `canCommentHere`, substituir nos condicionais das linhas 458 e 505 |

**Nenhum outro arquivo precisa ser alterado.** O hook `useChannelAccess` ja existe e funciona corretamente. As RLS policies ja permitem insert de comentarios/likes para qualquer usuario autenticado.

## Risco

Baixo. A mudanca e isolada a um unico componente e apenas adiciona uma condicao extra aos checks existentes. Canais com `access_type = 'subscribers'` ou `'premium'` continuam protegidos normalmente pelo `useChannelAccess` que ja bloqueia o acesso na pagina `ChannelDetail.tsx`.

