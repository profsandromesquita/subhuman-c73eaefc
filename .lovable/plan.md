

# Plano de Correção: Modal de Onboarding Reaparecendo

## Diagnóstico do Bug

### Causa Raiz Identificada

O modal de onboarding continua aparecendo mesmo após o usuário inscrever-se em espaços devido a **dois problemas distintos**:

| Problema | Arquivo | Descrição |
|----------|---------|-----------|
| Cache desatualizado | `Spaces.tsx` | A página de Espaços **não invalida** o cache do React Query após alterar inscrições |
| staleTime alto | `queryClient.ts` | O cache é considerado "fresh" por 5 minutos, então dados antigos são usados |

### Fluxo Atual (Com Bug)

```text
1. Usuário abre /home
   └─> useSubscribedSpaces() retorna [] (vazio)
   └─> Modal aparece ✓

2. Usuário navega para /spaces
   └─> toggleSubscription() insere no banco ✓
   └─> Atualiza estado LOCAL do Spaces.tsx ✓
   └─> NÃO invalida cache do React Query ✗

3. Usuário volta para /home
   └─> useSubscribedSpaces() retorna cache antigo (ainda [])
   └─> Modal aparece novamente ✗ ← BUG
```

### O Que Acontece Tecnicamente

1. **Em `Spaces.tsx`** (linha 78-127):
   - A função `toggleSubscription()` atualiza o banco de dados corretamente
   - Mas apenas atualiza o estado local (`setSubscriptions`)
   - **Não chama** `queryClient.invalidateQueries()` para limpar o cache

2. **Em `queryClient.ts`** (linha 7):
   - `staleTime: 1000 * 60 * 5` (5 minutos)
   - O cache antigo é considerado "fresco" e não é recarregado

3. **Em `Home.tsx`** (linha 29):
   - `useSubscribedSpaces()` retorna dados do cache
   - Como o cache tem dados antigos (array vazio), o modal reaparece

## Correção Proposta

### Solução Principal: Invalidar Cache ao Alterar Inscrições

Modificar `Spaces.tsx` para invalidar a query `subscribed-spaces` após cada toggle de inscrição:

```typescript
// Em Spaces.tsx
import { useQueryClient } from "@tanstack/react-query";

// Dentro do componente
const queryClient = useQueryClient();

// Dentro de toggleSubscription, após sucesso
queryClient.invalidateQueries({ queryKey: ["subscribed-spaces"] });
```

Isso garante que ao voltar para `/home`, a query será reexecutada com os dados atualizados.

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/Spaces.tsx` | Modificar | Adicionar invalidação de cache após alternar inscrição |

## Implementação Detalhada

### Modificação em `Spaces.tsx`

Adicionar import do `useQueryClient` e invalidar o cache após operações bem-sucedidas:

```typescript
// Linha 8: Adicionar import
import { useQueryClient } from "@tanstack/react-query";

// Dentro do componente (após linha 28):
const queryClient = useQueryClient();

// Dentro de toggleSubscription, após cada sucesso (linhas 103 e 114):
// Após "toast.success" em ambos os casos:
queryClient.invalidateQueries({ queryKey: ["subscribed-spaces"] });

// Também invalidar highlights que dependem dos espaços inscritos:
queryClient.invalidateQueries({ queryKey: ["highlights"] });
```

### Código Modificado da Função `toggleSubscription`

```typescript
const toggleSubscription = async (spaceId: string) => {
  if (!user) {
    toast.error("Faça login para se inscrever nos espaços");
    return;
  }

  if (processingIds.has(spaceId)) return;
  setProcessingIds(prev => new Set(prev).add(spaceId));

  const isCurrentlySubscribed = subscriptions[spaceId] || false;

  // Optimistic update
  setSubscriptions(prev => ({ ...prev, [spaceId]: !isCurrentlySubscribed }));

  try {
    if (isCurrentlySubscribed) {
      const { error } = await supabase
        .from('user_space_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('space_id', spaceId);

      if (error) throw error;
      toast.success("Inscrição removida");
    } else {
      const { error } = await supabase
        .from('user_space_subscriptions')
        .insert({
          user_id: user.id,
          space_id: spaceId
        });

      if (error) throw error;
      toast.success("Inscrito com sucesso!");
    }
    
    // ✅ CORREÇÃO: Invalidar cache após sucesso
    queryClient.invalidateQueries({ queryKey: ["subscribed-spaces"] });
    queryClient.invalidateQueries({ queryKey: ["highlights"] });
    
  } catch (error) {
    console.error('Error toggling subscription:', error);
    setSubscriptions(prev => ({ ...prev, [spaceId]: isCurrentlySubscribed }));
    toast.error("Erro ao atualizar inscrição");
  } finally {
    setProcessingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(spaceId);
      return newSet;
    });
  }
};
```

## Fluxo Corrigido

```text
1. Usuário abre /home
   └─> useSubscribedSpaces() retorna [] (vazio)
   └─> Modal aparece ✓

2. Usuário navega para /spaces
   └─> toggleSubscription() insere no banco ✓
   └─> Atualiza estado LOCAL do Spaces.tsx ✓
   └─> queryClient.invalidateQueries(["subscribed-spaces"]) ✓

3. Usuário volta para /home
   └─> useSubscribedSpaces() detecta cache inválido
   └─> Refaz query ao banco → retorna [espaço inscrito]
   └─> Modal NÃO aparece ✓
```

## Seção Técnica

### Por que o Bug Aconteceu?

O `Spaces.tsx` usa **gerenciamento de estado local** (`useState`) em vez de utilizar o mesmo hook `useSubscribedSpaces()` que o `Home.tsx` usa. Isso cria duas fontes de verdade:

- `Spaces.tsx`: estado local (`subscriptions`)
- `Home.tsx`: cache do React Query (`useSubscribedSpaces`)

Quando o usuário altera inscrições em `Spaces.tsx`, apenas o estado local é atualizado. O cache do React Query permanece com dados antigos.

### Alternativa Considerada (Mais Robusta)

Refatorar `Spaces.tsx` para usar `useSubscribedSpaces()` e mutations do React Query em vez de estado local. Isso garantiria uma única fonte de verdade. Porém, a correção proposta é mais simples e resolve o problema imediato.

### Queries Relacionadas a Invalidar

| Query Key | Motivo |
|-----------|--------|
| `["subscribed-spaces"]` | Lista de espaços inscritos |
| `["highlights"]` | Destaques filtrados por espaços inscritos |

## Resultado Esperado

Após a correção:

1. O modal de onboarding aparece apenas quando o usuário não tem espaços inscritos
2. Ao inscrever-se em pelo menos 1 espaço e voltar para Home, o modal não reaparece
3. Os destaques e outras seções da Home refletem imediatamente os espaços escolhidos

