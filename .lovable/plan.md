

# Plano: Corrigir Erro de "Muitas Tentativas" no Cadastro e Erro de Token no Assistente IA

## Problema 1: "Muitas tentativas" no cadastro

### Causa raiz
O erro vem do **rate limit do proprio backend de autenticacao** (limite de emails por hora/dia). Quando muitos usuarios tentam se cadastrar em sequencia, o limite global do projeto e atingido e **todos** os novos cadastros passam a receber "rate limit exceeded", mesmo que o usuario nunca tenha tentado antes.

O codigo atual no `Register.tsx` (linha 97) ja trata esse erro, mas a mensagem "Muitas tentativas. Aguarde alguns minutos" e confusa para um usuario que esta tentando pela primeira vez.

### Correcao
1. **Melhorar a mensagem de erro** no `Register.tsx` para explicar que e um limite temporario do sistema, nao do usuario
2. **Adicionar retry com orientacao** — informar que e um limite global e sugerir tentar novamente em 5-10 minutos
3. **Tratar o erro 429 separadamente do rate limit textual** — o Supabase pode retornar ambos

### Arquivo: `src/pages/Register.tsx`
- Linha 97-99: Melhorar mensagem de rate limit para algo como "O sistema está com volume alto de cadastros. Por favor, tente novamente em alguns minutos."
- Adicionar tratamento para `error.status === 429` alem do check por `error.message`

## Problema 2: Erro de token no Assistente IA

### Causa raiz
O `ai-assistant` edge function usa `supabase.auth.getUser()` (linha 430) para validar o token. Quando o token JWT do usuario expira e o refresh token ainda nao foi renovado pelo cliente, a chamada falha com "Token invalido" (linha 432).

O hook `useAIAssistant.ts` obtem o token via `supabase.auth.getSession()` (linha 82), mas **nao forca um refresh** antes de fazer a chamada. Se a sessao expirou (JWT tem vida curta ~1h), o access_token enviado ja esta invalido.

### Correcao
1. **No `useAIAssistant.ts`**: Antes de enviar a requisicao, chamar `supabase.auth.refreshSession()` quando o token estiver proximo de expirar, ou simplesmente usar `supabase.auth.getSession()` que ja faz refresh automatico — mas adicionar um **retry** em caso de 401
2. **Adicionar retry automatico com refresh**: Se a primeira chamada retornar 401, forcar `refreshSession()` e tentar novamente uma vez
3. **Melhorar mensagem de erro**: Em vez de toast generico, informar "Sua sessao expirou. Tente novamente." com acao de retry

### Arquivo: `src/hooks/useAIAssistant.ts`
- Apos linha 82: Adicionar logica de refresh preventivo
- Apos linha 96 (response status check): Adicionar retry com refresh em caso de 401

### Arquivo: `supabase/functions/ai-assistant/index.ts`
- Linha 430: Trocar `getUser()` por `getClaims()` que e mais leve e rapido (nao faz round-trip ao servidor auth), conforme recomendado para edge functions com `verify_jwt = false`

## Resumo dos arquivos impactados

| Arquivo | Alteracao |
|---|---|
| `src/pages/Register.tsx` | Melhorar mensagem de rate limit |
| `src/hooks/useAIAssistant.ts` | Adicionar retry com refresh de sessao em caso de 401 |
| `supabase/functions/ai-assistant/index.ts` | Usar `getClaims()` em vez de `getUser()` |

## Risco
Baixo. Mensagens de erro melhoradas e retry automatico nao alteram logica de negocio. A troca para `getClaims()` e mais performatica e segue as melhores praticas para edge functions.

