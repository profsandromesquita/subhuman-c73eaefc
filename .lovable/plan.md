
# Correção da Edge Function `send-user-notification`

## Diagnóstico Preciso

### Erro nos logs
```
TypeError: anonClient.auth.getClaims is not a function
  at index.ts:38
```

### Causa raiz
A função `getClaims(token)` **não existe** na API do cliente Supabase JS v2. Foi uma API planejada ou de versão anterior que nunca chegou ao pacote `@supabase/supabase-js@2.49.1` usado neste projeto.

O método correto para validar o JWT de um usuário autenticado em Edge Functions é `supabase.auth.getUser()` — sem passar o token como argumento. O cliente já lê o token do header `Authorization` configurado no momento da criação via `global: { headers: { Authorization: authHeader } }`.

### Evidência: padrão das outras Edge Functions do projeto

Todas as 4 outras funções do projeto usam o padrão correto:

| Função | Linha | Método |
|---|---|---|
| `ai-assistant/index.ts` | 304 | `await supabase.auth.getUser()` |
| `generate-chunks/index.ts` | 176 | `await supabase.auth.getUser()` |
| `ingest-document/index.ts` | 183 | `await supabase.auth.getUser()` |
| `search-chunks/index.ts` | 40 | `await supabase.auth.getUser()` |

---

## Correção — Um único arquivo

### `supabase/functions/send-user-notification/index.ts`

**Mudança**: Substituir o bloco de autenticação com `getClaims` pelo padrão correto com `getUser()`.

**ANTES (quebrado — linhas 27 a 41):**
```typescript
// Validate caller is admin/moderator
const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
  global: { headers: { Authorization: authHeader } },
});

const token = authHeader.replace('Bearer ', '');
const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
if (claimsError || !claimsData?.claims) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const callerId = claimsData.claims.sub;
```

**DEPOIS (correto — padrão do projeto):**
```typescript
// Validate caller using getUser() — padrão de todas as edge functions do projeto
const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
  global: { headers: { Authorization: authHeader } },
});

const { data: { user }, error: userError } = await anonClient.auth.getUser();
if (userError || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const callerId = user.id;
```

O restante da função (verificação de role, insert da notificação, envio de email) permanece **intacto e sem alterações**.

---

## Impacto da Correção

| Item | Status após correção |
|---|---|
| Edge Function retorna 500 | Resolvido — `getUser()` existe e funciona |
| Validação de admin/moderador | Mantida — `callerId` passa para o check de `user_roles` |
| Envio de notificação in-app | Funcional — insert via service role não é afetado |
| Envio de email via Resend | Funcional — lógica não é alterada |
| Fluxo de mensagem direta (AuthorModal) | Não afetado — usa insert direto no banco, sem esta função |

## Arquivo alterado

- `supabase/functions/send-user-notification/index.ts` — apenas o bloco de autenticação (linhas 27-41)
