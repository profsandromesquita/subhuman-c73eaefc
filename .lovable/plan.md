

# Plano de Correção: Logout Robusto

## Problema Identificado

Os logs de autenticação mostram múltiplas tentativas de logout falhando com erro **403 - Session not found**:

```
session id (8dd2515a-0f15-4873-9590-ed90f6ce5951) doesn't exist
```

Isso significa que a sessão já expirou ou foi invalidada no servidor, mas o cliente ainda tenta fazer logout normalmente - e quando recebe o erro 403, mostra "Erro ao sair da conta" ao invés de simplesmente limpar o estado local.

## Causa Raiz

| Situação | Comportamento Atual | Comportamento Esperado |
|----------|---------------------|------------------------|
| Sessão válida | Logout funciona | OK |
| Sessão expirada | Mostra erro 403 | Deveria limpar estado local e redirecionar |
| Token inválido | Mostra erro | Deveria limpar estado local e redirecionar |

## Solução Proposta

### Lógica de Logout Resiliente

Modificar o fluxo de logout para que **SEMPRE** limpe o estado local, independentemente se a chamada ao servidor teve sucesso ou não:

1. Tentar fazer logout no servidor (para invalidar a sessão lá)
2. **Independentemente do resultado**, limpar o localStorage
3. Resetar o estado do React
4. Redirecionar para a página inicial

### Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/hooks/useAuth.ts` | Tornar `signOut` resiliente a erros de sessão |
| `src/pages/Profile.tsx` | Ajustar tratamento de erro no `handleLogout` |

## Implementação Detalhada

### 1. Modificar useAuth.ts

O `signOut` será modificado para usar `scope: 'local'` quando a sessão não existir no servidor, garantindo limpeza do estado local:

```typescript
const signOut = useCallback(async () => {
  try {
    // Tenta logout global primeiro
    const { error } = await supabase.auth.signOut();
    
    // Se a sessão não existir, força limpeza local
    if (error && error.message?.includes('Session not found')) {
      await supabase.auth.signOut({ scope: 'local' });
      return { error: null }; // Considera sucesso pois o objetivo é deslogar
    }
    
    return { error };
  } catch (e) {
    // Em caso de qualquer erro, força limpeza local
    await supabase.auth.signOut({ scope: 'local' });
    return { error: null };
  }
}, []);
```

### 2. Modificar Profile.tsx

Simplificar o `handleLogout` para sempre considerar sucesso após o signOut:

```typescript
const handleLogout = async () => {
  await signOut();
  toast.success("Você saiu da sua conta");
  navigate("/");
};
```

## Fluxo Após Correção

```text
Usuário clica "Sair"
        |
        v
Tenta signOut() no servidor
        |
        +-- Sucesso (204) --> Limpa estado --> Redireciona --> FIM
        |
        +-- Erro 403 (Session not found) --> signOut({ scope: 'local' }) --> Redireciona --> FIM
        |
        +-- Qualquer outro erro --> signOut({ scope: 'local' }) --> Redireciona --> FIM
```

## Seção Técnica

### O que é `scope: 'local'`?

O Supabase oferece duas opções de logout:

- **`scope: 'global'`** (padrão): Invalida a sessão no servidor E limpa localStorage
- **`scope: 'local'`**: Apenas limpa o localStorage sem chamar o servidor

Quando a sessão já não existe no servidor, usar `scope: 'local'` garante que o estado local seja limpo mesmo assim.

### Por que a sessão pode não existir?

1. **Expiração**: Tokens têm validade (geralmente 1 hora para access, 1 semana para refresh)
2. **Logout em outro dispositivo**: Usuário fez logout em outro lugar
3. **Revogação manual**: Admin revogou a sessão
4. **Limpeza automática**: Servidor limpou sessões antigas

### Benefícios da Correção

- Logout **sempre funciona** do ponto de vista do usuário
- Não exibe mensagens de erro confusas
- Estado local fica consistente com o servidor
- Funciona em todos os cenários de sessão inválida

