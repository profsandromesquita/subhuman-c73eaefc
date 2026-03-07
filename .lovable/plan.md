

# Correção: Erro 500 no Assistente de IA — `getClaims is not a function`

## Causa raiz

Os logs mostram claramente: `TypeError: supabase.auth.getClaims is not a function`. O método `getClaims()` não existe no cliente Supabase disponível nas Edge Functions. A mudança anterior introduziu esse bug ao tentar otimizar a validação de token.

## Correção

Reverter para `supabase.auth.getUser()` que funciona corretamente no runtime das Edge Functions.

### Arquivo: `supabase/functions/ai-assistant/index.ts` (linhas 430-435)

Substituir:
```typescript
const token = authHeader.replace("Bearer ", "");
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
if (claimsError || !claimsData?.claims?.sub) {
  return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
const user = { id: claimsData.claims.sub as string };
```

Por:
```typescript
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
  return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
```

Isso remove a variável `token` não utilizada e restaura a validação funcional via `getUser()`.

