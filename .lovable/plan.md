
# Plano: Corrigir Redirecionamento de Usuários com Subscription Ativa

## Diagnóstico

O usuário `sandro.mesquita@itia.org.br` tem uma subscription mensal ativa no banco de dados (`plan_type: 'monthly'`, `status: 'active'`), mas está sendo redirecionado para `/plans` ao fazer login.

### Problema Identificado

Existe uma **condição de corrida (race condition)** no fluxo de redirecionamento da Landing Page. O problema ocorre porque:

1. O hook `useSubscription` inicializa com `loading: true` e `status: 'none'`
2. Quando `authLoading` termina, o `useSubscription` faz a query ao banco
3. **MAS** durante esse período curto, há um momento em que:
   - `authLoading = false`
   - `subLoading = false` (estado inicial antes do setLoading(true) ser chamado)
   - `status = 'none'` (estado inicial)
4. O `useEffect` da Landing page pode disparar nesse momento e redirecionar para `/plans`

```text
Timeline do problema:

authLoading: [true]--->[false]--------------------------->
subLoading:  [true]-------------------------------------->
                            ^
                            | Momento problemático:
                            | authLoading=false, subLoading aparenta false
                            | status='none' → Redireciona para /plans
```

## Solução Proposta

### 1. Ajustar o hook `useSubscription` para sincronizar melhor com auth

**Arquivo**: `src/hooks/useSubscription.ts`

Garantir que `loading` permaneça `true` enquanto a verificação não for completada:

```typescript
export function useSubscription(): SubscriptionStatus {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [status, setStatus] = useState<'active' | 'trial' | 'expired' | 'none'>('none');
  const [planType, setPlanType] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [hasChecked, setHasChecked] = useState(false); // NOVO: Flag para indicar se já verificou

  const checkSubscription = useCallback(async () => {
    if (authLoading) {
      return { status: 'none', planType: null };
    }

    if (!userId) {
      setStatus('none');
      setPlanType(null);
      setExpiresAt(null);
      setDaysRemaining(null);
      setHasChecked(true); // Marcamos como verificado
      return { status: 'none', planType: null };
    }

    try {
      // ... query existente ...
      
      // Após processar resultado
      setHasChecked(true); // Marcamos como verificado
      return { status: resultStatus, planType: subscriptionPlanType };
    } catch (error) {
      setHasChecked(true); // Marcamos como verificado mesmo em erro
      // ...
    }
  }, [userId, authLoading]);

  // Loading é true enquanto auth carrega OU enquanto não verificou subscription
  const effectiveLoading = authLoading || !hasChecked;

  return { 
    status, 
    planType, 
    expiresAt, 
    daysRemaining, 
    loading: effectiveLoading, // Usa effectiveLoading
    refetch: checkSubscription 
  };
}
```

### 2. Manter Landing page inalterada

A Landing page já verifica `subLoading` corretamente:

```javascript
if (authLoading || subLoading) return; // Não redireciona enquanto carrega
```

Com a correção do hook, o `subLoading` permanecerá `true` até que a verificação seja de fato completada.

### 3. Manter SubscriptionGuard inalterado

O SubscriptionGuard também usa `subLoading`, então a correção no hook resolve o problema em todos os lugares.

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useSubscription.ts` | Adicionar flag `hasChecked` para controlar loading corretamente |

## Resultado Esperado

```text
Timeline corrigida:

authLoading: [true]--->[false]--------------------------->
hasChecked:  [false]---------------------------------->[true]
effectiveLoading: [true]------------------------------>[false]
                                                         ^
                                                         | Só redireciona agora
                                                         | com status correto = 'active'
```

1. Usuário faz login (email/senha ou Google OAuth)
2. Retorna para Landing page
3. `loading` permanece `true` até subscription ser verificada
4. Subscription retorna `status: 'active'` 
5. Redireciona para `/home` corretamente
