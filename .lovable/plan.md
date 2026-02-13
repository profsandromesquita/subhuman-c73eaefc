
# Sprint 4: Sistema de Permissoes com 7 Niveis de Acesso

Este sprint implementa o nucleo do funil de vendas: um hook centralizado de permissoes (`useUserAccess`), um componente de paywall visual (`ContentPaywall`), a refatoracao do `SubscriptionGuard` para permitir acesso freemium, e a aplicacao de restricoes granulares em cada pagina/componente.

---

## Visao Geral das Mudancas

```text
Novos arquivos (3):
  src/hooks/useUserAccess.ts       -- Hook central de permissoes
  src/components/ContentPaywall.tsx -- Componente de blur + CTA upgrade
  src/components/PremiumBadge.tsx   -- Badge visual para yearly/lifetime

Arquivos modificados (10):
  src/components/SubscriptionGuard.tsx  -- Permitir freemium (so bloqueia nao-logado)
  src/pages/PostDetail.tsx              -- Paywall em artigos + esconder comentarios
  src/components/post/PostContent.tsx   -- Blur apos 7 linhas para freemium
  src/pages/ChannelPostDetail.tsx       -- Paywall + esconder interacoes
  src/pages/ChannelDetail.tsx           -- Esconder botao "Nova publicacao"
  src/pages/PodcastDetail.tsx           -- Bloquear player de audio
  src/pages/AIAssistant.tsx             -- Bloquear input + limites diarios
  src/components/post/CommentItem.tsx   -- Esconder curtir/responder
  src/components/post/AuthorModal.tsx   -- Prompt de upgrade para freemium
  src/App.tsx                           -- Remover SubscriptionGuard de /events
```

---

## 1. `src/hooks/useUserAccess.ts` -- Hook Central

Este hook substitui verificacoes espalhadas. Ele combina dados de 4 fontes:

**Fontes de dados:**
- `useSubscription()` -- status e planType da assinatura ativa
- `useAdminAuth()` -- roles do usuario (admin/moderator bypass)
- Query `coupon_redemptions` -- verificar se usuario tem cupom ativo
- Query `event_purchases` -- compras de eventos do usuario

**Interface exportada:**

```typescript
interface UserAccess {
  tier: 'freemium' | 'coupon' | 'student' | 'trial' | 'monthly' | 'yearly' | 'lifetime' | 'admin';
  canReadFullArticles: boolean;
  canReadFullChannelPosts: boolean;
  canComment: boolean;
  canLike: boolean;
  canListenPodcast: boolean;
  canUseAI: boolean;
  aiDailyLimit: number;
  canPostInChannels: boolean;
  canViewMemberCards: boolean;
  canAccessEvent: (eventId: string) => boolean;
  canAccessFreeEvents: boolean;
  canAccessAllOnlineEvents: boolean;
  hasPremiumBadge: 'blue' | 'gold' | null;
  hasAccessToPremiumChannel: boolean;
  loading: boolean;
}
```

**Logica de calculo do tier:**

```text
1. Se admin/moderator -> tier = 'admin' (tudo liberado)
2. Se assinatura active + lifetime -> tier = 'lifetime'
3. Se assinatura active + yearly -> tier = 'yearly'
4. Se assinatura active + monthly -> tier = 'monthly'
5. Se assinatura active + trial -> tier = 'trial'
6. Se tem cupom resgatado com subscricao promo ativa -> tier = 'coupon'
7. Se tem event_purchase ativa (sem assinatura) -> tier = 'student'
8. Senao -> tier = 'freemium'
```

**Mapeamento tier -> permissoes:**

```text
Tier       | Articles | Channels | Comment | Like | Podcast | AI   | AI/dia | Post | Cards | Badge
-----------|----------|----------|---------|------|---------|------|--------|------|-------|------
freemium   | 7 linhas | 1 linha  | Nao     | Nao  | Nao     | Nao  | 0      | Nao  | Nao   | null
coupon     | Full     | Full     | Sim     | Sim  | Sim     | Sim  | 2      | Sim  | Sim   | null
student    | 7 linhas | 1 linha  | Nao     | Nao  | Nao     | Nao  | 0      | Nao  | Nao   | null
trial      | Full     | Full     | Sim     | Sim  | Sim     | Sim  | 2      | Sim  | Sim   | null
monthly    | Full     | Full     | Sim     | Sim  | Sim     | Sim  | 10     | Sim  | Sim   | null
yearly     | Full     | Full     | Sim     | Sim  | Sim     | Sim  | 15     | Sim  | Sim   | blue
lifetime   | Full     | Full     | Sim     | Sim  | Sim     | Sim  | 20     | Sim  | Sim   | gold
admin      | Full     | Full     | Sim     | Sim  | Sim     | Sim  | 999    | Sim  | Sim   | null
```

**canAccessEvent(eventId):** Retorna true se:
- tier >= monthly (assinante tem acesso a eventos inclusos)
- OU usuario tem `event_purchases` com status 'active' para aquele eventId
- OU tier = 'lifetime' (acesso a todos os eventos online)
- OU tier = 'admin'

---

## 2. `src/components/ContentPaywall.tsx` -- Componente de Blur

Componente reutilizavel que recebe conteudo e aplica restricao visual:

**Props:**
- `children`: ReactNode (conteudo a ser restrito)
- `maxLines`: number (7 para artigos, 1 para canais)
- `type`: 'article' | 'channel' | 'podcast' | 'ai' (para mensagem contextual)

**Comportamento:**
- Renderiza os children dentro de um container com `overflow: hidden` e `max-height` calculado
- Aplica gradiente de blur na parte inferior (gradiente de transparente para background)
- Sobrepoe um card centralizado com:
  - Icone de cadeado
  - Texto: "Desbloqueie este conteudo com seu Passe VIP"
  - Subtexto contextual por tipo
  - Botao "Ver planos" -> /plans
- Fundo escurecido sutil

---

## 3. `src/components/PremiumBadge.tsx` -- Badge Premium

Componente simples que exibe:
- Badge azul (verificado) para yearly: icone `SealCheck` azul do Phosphor
- Badge dourado para lifetime: icone `Crown` dourado do Phosphor
- null para outros tiers

Sera utilizado nos componentes de comentarios e posts de canais junto ao nome do autor.

---

## 4. `src/components/SubscriptionGuard.tsx` -- Refatoracao

**Comportamento atual:** Redireciona para /plans se status = 'expired' ou 'none'.

**Novo comportamento:**
- Se nao logado: redireciona para /login (mantido)
- Se logado (qualquer status, incluindo 'none' e 'expired'): renderiza children
- Remove o redirecionamento para /plans
- Usuarios freemium agora acessam o app, mas verao restricoes visuais via `useUserAccess`

Isso significa que o guard se torna essencialmente um `AuthGuard` -- so verifica login.

---

## 5. Alteracoes em Paginas e Componentes

### 5.1 `src/components/post/PostContent.tsx`

- Importar `useUserAccess`
- Se `canReadFullArticles === false`: envolver o conteudo HTML em `ContentPaywall` com `maxLines={7}` e `type="article"`
- O titulo, autor, meta e thumbnail continuam visiveis (so o corpo do texto e restrito)

### 5.2 `src/pages/PostDetail.tsx`

- Importar `useUserAccess`
- Se `canComment === false`: esconder `CommentInput` e `CommentSection`
- Se `canLike === false`: desabilitar botao de curtir no `PostEngagement` (ou mostrar AuthPromptDialog com mensagem de upgrade)

### 5.3 `src/pages/ChannelPostDetail.tsx`

- Importar `useUserAccess`
- Se `canReadFullChannelPosts === false`: envolver conteudo em `ContentPaywall` com `maxLines={1}` e `type="channel"`
- Se `canComment === false`: esconder area de comentarios e input
- Se `canLike === false`: desabilitar botao de curtida

### 5.4 `src/pages/ChannelDetail.tsx`

- Importar `useUserAccess`
- Se `canPostInChannels === false`: esconder botao FAB "+" (nova publicacao)
- Se `canLike === false`: desabilitar botoes de curtida nos cards

### 5.5 `src/pages/PodcastDetail.tsx`

- Importar `useUserAccess`
- Se `canListenPodcast === false`: substituir `PodcastPlayer` por `ContentPaywall` com `type="podcast"`
- Se `canComment === false`: esconder `CommentSection` e `CommentInput`

### 5.6 `src/pages/AIAssistant.tsx`

- Importar `useUserAccess`
- Se `canUseAI === false`: desabilitar input e mostrar overlay com CTA de upgrade
- Se `canUseAI === true` e `aiDailyLimit > 0`: contar queries do dia na tabela `rag_query_logs` e bloquear ao atingir limite, mostrando mensagem "Voce atingiu seu limite diario de X interacoes"

### 5.7 `src/components/post/CommentItem.tsx`

- Importar `useUserAccess`
- Se `canLike === false`: esconder botoes de curtir e responder nos comentarios

### 5.8 `src/components/post/AuthorModal.tsx`

- Importar `useUserAccess`
- Se `canViewMemberCards === false`: nao abrir modal, mostrar toast com mensagem de upgrade

### 5.9 `src/App.tsx`

- Remover `SubscriptionGuard` da rota `/events` (eventos sao visiveis para todos os logados, acesso ao conteudo controlado por `canAccessEvent`)

---

## 6. Contagem de Uso Diario de IA

Para limitar interacoes de IA por dia, utilizar a tabela `rag_query_logs` que ja registra cada query com `user_id` e `created_at`:

```typescript
// Dentro de useUserAccess ou useAIAssistant
const today = new Date().toISOString().split('T')[0];
const { count } = await supabase
  .from('rag_query_logs')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', userId)
  .gte('created_at', `${today}T00:00:00`);

const aiUsedToday = count || 0;
const canStillUseAI = aiUsedToday < aiDailyLimit;
```

Essa verificacao sera feita dentro do `useAIAssistant` hook, que ja envia as mensagens. Ao atingir o limite, o hook retorna um erro amigavel em vez de chamar a edge function.

---

## Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| Quebrar acesso de assinantes atuais | O `SubscriptionGuard` so muda para nao redirecionar freemium. Assinantes ativos continuam com `canReadFullArticles: true` etc. |
| Performance com multiplas queries no useUserAccess | Usar `useQuery` com staleTime de 5 min para cada fonte. As queries sao leves (1 row each). |
| Paywall pode ser burlado via DevTools | O blur e apenas visual. Conteudo full ja esta no DOM. Para protecao real, seria necessario truncar no servidor. Como MVP, o blur visual e suficiente para incentivar upgrade. |
| Tier "student" e quase igual a freemium | Correto conforme spec. Aluno so tem acesso aos eventos comprados, sem acesso extra a conteudo. |

---

## Ordem de Implementacao

1. Criar `useUserAccess.ts` (hook puro, sem UI)
2. Criar `ContentPaywall.tsx` (componente visual)
3. Criar `PremiumBadge.tsx` (badge simples)
4. Refatorar `SubscriptionGuard.tsx` (permitir freemium)
5. Aplicar restricoes em cada componente (PostContent, PostDetail, ChannelPostDetail, ChannelDetail, PodcastDetail, AIAssistant, CommentItem, AuthorModal)
6. Atualizar `App.tsx` (remover guard de /events)
