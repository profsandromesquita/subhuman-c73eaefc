

# Auditoria da rota /admin/tts-backfill

## 1. Import no App.tsx (linha 78)
```typescript
const TTSBackfill = lazy(() => import("./pages/admin/TTSBackfill"));
```
✅ Correto.

## 2. Rota no App.tsx (linha 159)
```typescript
<Route path="/admin/tts-backfill" element={<AdminGuard requireAdmin><TTSBackfill /></AdminGuard>} />
```
✅ Correto. Está antes do catch-all `*` (linha 162).

## 3. BrowserRouter e catch-all
- Sim, usa `BrowserRouter` (linha 87).
- O catch-all `<Route path="*">` está na última posição (linha 162) — não intercepta rotas anteriores.
- Não há redirecionamento que bloqueie `/admin/tts-backfill`.

## 4. Arquivo do componente existe
`src/pages/admin/TTSBackfill.tsx` está listado no projeto. ✅

## 5. Diagnóstico do 404 em produção

O código está correto no codebase. O problema é quase certamente um dos seguintes:

### Causa mais provável: SPA fallback no servidor de produção
O domínio `subhumano.ia.br` provavelmente aponta para um servidor (Cloudflare, Vercel, Nginx, etc.) que **não está configurado para redirecionar todas as rotas para `index.html`**. Em SPAs com BrowserRouter, acessar qualquer rota diretamente (não via navegação interna) requer que o servidor retorne `index.html` para qualquer path — caso contrário, o servidor retorna 404 antes do React Router resolver a rota.

### Como confirmar
- **Preview do Lovable**: Acessar `https://id-preview--38842661-2f61-4b6f-a6f3-f9c69c0c74fd.lovable.app/admin/tts-backfill` deve funcionar (o Lovable configura o fallback automaticamente).
- **Produção**: Se `subhumano.ia.br/admin/qualquer-outra-rota` também dá 404 no acesso direto (refresh da página), confirma que é o fallback do servidor.

### Causa alternativa: deploy desatualizado
Se o frontend não foi republicado após a adição da rota, o bundle em produção não contém o componente. Clicar em **Publish → Update** no Lovable resolve isso.

## Recomendação

1. Testar no preview do Lovable primeiro — se funcionar lá, o código está correto
2. Verificar se o frontend foi publicado após a última alteração
3. Se o domínio customizado usa proxy (Cloudflare, Nginx), configurar a regra de SPA fallback para retornar `index.html` em qualquer rota que não seja um arquivo estático

