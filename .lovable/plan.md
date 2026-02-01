

# Plano de Correção: Banner de Notificações Reaparecendo

## Diagnóstico do Bug

### Causa Raiz Identificada

O banner de notificações push continua aparecendo após ativação devido a **dois problemas principais**:

| Problema | Arquivo | Descrição |
|----------|---------|-----------|
| Query retorna erro com múltiplos registros | `usePushNotifications.ts` | `.maybeSingle()` falha quando usuário tem múltiplas subscriptions (diferentes dispositivos) |
| Banner aparece antes da verificação completar | `PushPermissionBanner.tsx` | Não aguarda o estado `loading` do hook antes de avaliar visibilidade |

### Dados do Banco de Dados

O usuário possui **2 registros** na tabela `push_subscriptions` (mesmo user_id, endpoints diferentes):

| endpoint | created_at |
|----------|------------|
| web.push.apple.com/QJodp... | 2026-02-01 19:05:47 |
| web.push.apple.com/QCwi5... | 2026-02-01 20:27:11 |

Quando `.maybeSingle()` encontra múltiplos registros, retorna erro em vez de dados, fazendo `existingSub` ser `null`.

### Fluxo Atual (Com Bug)

```text
1. Página carrega
   └─> usePushNotifications() inicia com loading=true, isSubscribed=false

2. Query ao banco com .maybeSingle()
   └─> Múltiplos registros existem
   └─> Supabase retorna erro (expected 0-1 rows, got 2)
   └─> existingSub = null
   └─> isSubscribed = false

3. PushPermissionBanner avalia condições
   └─> permission='granted', isSubscribed=false
   └─> Condição (permission === 'granted' && isSubscribed) é FALSE
   └─> Banner aparece mesmo com permissão concedida
```

## Correção Proposta

### Solução 1: Corrigir Query no Hook

Modificar `usePushNotifications.ts` para usar `.select().limit(1).maybeSingle()` ou simplesmente verificar se existe algum registro:

```typescript
// Antes (problema com múltiplos registros)
const { data: existingSub } = await supabase
  .from('push_subscriptions')
  .select('id')
  .eq('user_id', user.id)
  .maybeSingle();  // ❌ Falha se > 1 registro

// Depois (funciona com qualquer quantidade)
const { data: existingSubs } = await supabase
  .from('push_subscriptions')
  .select('id')
  .eq('user_id', user.id)
  .limit(1);

const hasSubscription = existingSubs && existingSubs.length > 0;
```

### Solução 2: Banner Aguardar Loading

Modificar `PushPermissionBanner.tsx` para não avaliar visibilidade enquanto `loading` for `true`:

```typescript
useEffect(() => {
  // Aguardar carregamento do estado do hook
  if (loading) {
    return;
  }
  
  // ... resto da lógica de visibilidade
}, [user, isSupported, permission, isSubscribed, loading]);
```

### Solução 3: Persistência Local como Fallback

Adicionar cache local no `usePushNotifications.ts` para evitar dependência total do banco:

```typescript
const SUBSCRIBED_CACHE_KEY = 'push-subscribed';

// No subscribe() após sucesso:
localStorage.setItem(SUBSCRIBED_CACHE_KEY, 'true');

// Na verificação inicial:
const localSubscribed = localStorage.getItem(SUBSCRIBED_CACHE_KEY) === 'true';
if (localSubscribed && currentPermission === 'granted') {
  setState({
    permission: currentPermission,
    isSubscribed: true,  // Confia no cache local
    ...
  });
  return;
}
```

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/hooks/usePushNotifications.ts` | Corrigir query e adicionar cache local |
| `src/components/PushPermissionBanner.tsx` | Aguardar loading antes de avaliar visibilidade |

## Implementação Detalhada

### 1. Modificar `usePushNotifications.ts`

**Adicionar constante para cache:**
```typescript
const SUBSCRIBED_CACHE_KEY = 'push-subscription-active';
```

**Corrigir função `checkSubscription`:**
```typescript
const checkSubscription = useCallback(async () => {
  if (!isSupported || !user) {
    setState(prev => ({ ...prev, loading: false, isSupported }));
    return;
  }

  try {
    setState(prev => ({ ...prev, loading: true }));

    // Pré-carregar a VAPID key
    if (!vapidKeyRef.current) {
      vapidKeyRef.current = await getVapidPublicKey();
    }

    // Verificar permissão atual
    const currentPermission = Notification.permission;
    
    // Verificar cache local primeiro (fallback rápido)
    const cachedSubscribed = localStorage.getItem(SUBSCRIBED_CACHE_KEY) === 'true';
    if (cachedSubscribed && currentPermission === 'granted') {
      setState({
        permission: currentPermission,
        isSubscribed: true,
        isSupported: true,
        loading: false,
        error: null
      });
      return;
    }

    // Verificar se existe subscription no banco (usando limit em vez de maybeSingle)
    const { data: existingSubs, error } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    const hasSubscription = !error && existingSubs && existingSubs.length > 0;
    
    // Atualizar cache local
    if (hasSubscription && currentPermission === 'granted') {
      localStorage.setItem(SUBSCRIBED_CACHE_KEY, 'true');
    }

    setState({
      permission: currentPermission,
      isSubscribed: hasSubscription && currentPermission === 'granted',
      isSupported: true,
      loading: false,
      error: null
    });
  } catch (error) {
    console.error('Erro ao verificar subscription:', error);
    setState(prev => ({ 
      ...prev, 
      loading: false, 
      error: 'Erro ao verificar status' 
    }));
  }
}, [user, isSupported]);
```

**Na função `subscribe`, após sucesso, atualizar cache:**
```typescript
// Após setState com isSubscribed: true
localStorage.setItem(SUBSCRIBED_CACHE_KEY, 'true');
```

**Na função `unsubscribe`, limpar cache:**
```typescript
// Após setState com isSubscribed: false
localStorage.removeItem(SUBSCRIBED_CACHE_KEY);
```

### 2. Modificar `PushPermissionBanner.tsx`

**Adicionar `loading` às dependências e aguardar:**
```typescript
const { permission, isSubscribed, isSupported, subscribe, loading, error } = usePushNotifications();

useEffect(() => {
  // Não avaliar visibilidade enquanto está carregando
  if (loading) {
    return;
  }

  if (!user || !isSupported) {
    setIsVisible(false);
    return;
  }

  // Se já tem permissão concedida e está inscrito, não mostra
  if (permission === 'granted' && isSubscribed) {
    setIsVisible(false);
    return;
  }

  // ... resto do código permanece igual
}, [user, isSupported, permission, isSubscribed, loading]);  // ← Adicionar loading
```

## Fluxo Corrigido

```text
1. Página carrega
   └─> usePushNotifications() inicia com loading=true

2. Banner verifica estado
   └─> loading=true → não avalia, aguarda

3. Hook verifica cache local
   └─> SUBSCRIBED_CACHE_KEY='true' existe
   └─> permission='granted'
   └─> isSubscribed=true (do cache)
   └─> loading=false

4. Banner reavalia
   └─> permission='granted' && isSubscribed=true
   └─> Banner NÃO aparece ✓
```

## Seção Técnica

### Por que o Bug Aconteceu?

1. **`.maybeSingle()` do Supabase**: Este método espera 0 ou 1 resultado. Quando há 2+ registros com o mesmo `user_id` (diferentes dispositivos/endpoints), ele retorna erro em vez de dados.

2. **Race condition**: O banner avaliava visibilidade antes do hook completar a verificação, usando o estado inicial `isSubscribed: false`.

### Múltiplos Dispositivos

Um usuário pode ter múltiplas subscriptions ativas (ex: Safari desktop + Safari mobile). A correção garante que qualquer subscription válida seja reconhecida.

### Cache Local como Otimização

O cache evita:
- Latência da query ao banco a cada refresh
- Falhas temporárias de rede
- Race conditions no carregamento

O cache é invalidado quando:
- O usuário faz unsubscribe manualmente
- A permissão do navegador é revogada (verificada em runtime)

## Resultado Esperado

Após a correção:

1. O banner não aparece se o usuário já ativou notificações
2. O estado é lembrado mesmo com múltiplos dispositivos
3. O carregamento é mais rápido (cache local)
4. Sem race conditions no carregamento da página

