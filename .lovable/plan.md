
# Plano de Correção: Erro `supabase.auth.getClaims is not a function`

## Diagnóstico

### Causa do Erro
O erro ocorre porque as edge functions estão usando um método que **não existe** no cliente Supabase JavaScript:

```typescript
// ❌ INCORRETO - Este método não existe
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
```

O método `getClaims()` não faz parte da API do `@supabase/supabase-js`. O método correto para validar um token e obter informações do usuário é `getUser()`.

### Funções Afetadas
1. `supabase/functions/ingest-document/index.ts` (linha 270)
2. `supabase/functions/ai-assistant/index.ts` (linha 140)
3. `supabase/functions/search-chunks/index.ts` (linha 71)

### Função que Funciona Corretamente
- `supabase/functions/redeem-coupon/index.ts` usa o método correto:
```typescript
// ✅ CORRETO
const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
```

---

## Correção Técnica

### Padrão Correto de Autenticação

```typescript
// Antes (ERRADO):
const token = authHeader.replace("Bearer ", "");
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
if (claimsError || !claimsData?.claims) { /* ... */ }
const userId = claimsData.claims.sub;

// Depois (CORRETO):
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) { /* ... */ }
const userId = user.id;
```

---

## Arquivos a Modificar

### 1. `supabase/functions/ingest-document/index.ts`

**Linhas 268-278** - Substituir validação de token:

```typescript
// ANTES:
const token = authHeader.replace("Bearer ", "");
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
if (claimsError || !claimsData?.claims) {
  return new Response(
    JSON.stringify({ error: "Token inválido" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
const userId = claimsData.claims.sub;

// DEPOIS:
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
  return new Response(
    JSON.stringify({ error: "Token inválido" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
const userId = user.id;
```

### 2. `supabase/functions/ai-assistant/index.ts`

**Linhas 139-143** - Substituir validação de token:

```typescript
// ANTES:
const token = authHeader.replace("Bearer ", "");
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
if (claimsError || !claimsData?.claims) {
  return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// DEPOIS:
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
  return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
```

### 3. `supabase/functions/search-chunks/index.ts`

**Linhas 70-77** - Substituir validação de token:

```typescript
// ANTES:
const token = authHeader.replace("Bearer ", "");
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
if (claimsError || !claimsData?.claims) {
  return new Response(
    JSON.stringify({ error: "Token inválido" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// DEPOIS:
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
  return new Response(
    JSON.stringify({ error: "Token inválido" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

---

## Resumo das Mudanças

| Arquivo | Linha | Mudança |
|---------|-------|---------|
| `ingest-document/index.ts` | 269-278 | Trocar `getClaims(token)` por `getUser()` |
| `ai-assistant/index.ts` | 139-143 | Trocar `getClaims(token)` por `getUser()` |
| `search-chunks/index.ts` | 70-77 | Trocar `getClaims(token)` por `getUser()` |

---

## Resultado Esperado

Após as correções:
1. A página de adicionar documentos RAG funcionará sem erro
2. O assistente IA funcionará corretamente
3. A busca de chunks no admin funcionará corretamente
4. A validação de autenticação seguirá o mesmo padrão de `redeem-coupon` (que já funciona)

---

## Verificação Pós-Deploy

1. Acessar `/admin/rag/documents`
2. Inserir o documento Constituição novamente
3. Verificar que não aparece mais o erro `getClaims is not a function`
4. Verificar que o documento foi indexado e chunks foram criados
5. Testar o assistente IA em `/ai-assistant`
