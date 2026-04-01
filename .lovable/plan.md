
## Auditoria completa (resultado)

### Escopo auditado
- `supabase/functions/og-meta/index.ts` (fluxo completo de geração OG)
- `public/robots.txt`
- `index.html` (fallback OG da home)
- Banco (`space_updates`, `spaces`, `storage.objects`, `storage.buckets`)
- Logs da função `og-meta`
- Testes de resposta da função com UAs `facebookexternalhit` e `meta-externalagent` para os 2 artigos do print.

### Evidências objetivas coletadas
1. **Os dois artigos existem e estão publicados**, com `thumbnail_url` preenchida.
2. **Para os dois slugs**, a `og-meta` retorna `og:title`, `og:description`, `og:image`, `og:url` corretamente.
3. **Bug real de classificação de bot**:
   - `isBot(meta-externalagent) = false` (log real)
   - resultado: HTML inclui `<script>window.location.href=...` para `meta-externalagent`.
4. `robots.txt` já permite `meta-externalagent` e `WhatsApp`.
5. A URL `render/image` usada para WhatsApp responde 200; porém em testes de fetch binário apareceu payload `WEBP` em parte dos acessos (conversão para JPEG não ficou determinística no nosso ambiente de teste).
6. Durante o seu teste original (print), **não encontramos log do slug “figma...”** no intervalo disponível, enquanto há múltiplos logs de “vazamento...”, sugerindo possível inconsistência de roteamento/chamada upstream.

### Candidatos a causa raiz (do mais provável ao menos provável)

1. **[Muito provável] `meta-externalagent` não é tratado como bot em `isBot`**  
   Impacto: injeta redirect JS para crawler do WhatsApp/Meta, podendo interromper ou degradar parsing OG (especialmente título/descrição).

2. **[Muito provável] Inconsistência no roteamento externo para `og-meta` (camada de borda/proxy)**  
   Evidência: ausência de logs para um dos links no teste real + inconsistência entre links “nunca usados”.  
   Impacto: crawler recebe HTML SPA/fallback em vez de OG dinâmico.

3. **[Provável] Conversão WebP→JPEG não determinística no endpoint `render/image`**  
   Impacto: título pode aparecer, mas imagem pode falhar no WhatsApp (comportamento visto no print do primeiro link).

4. **[Médio] `Content-Type` da resposta observado como `text/plain` em chamadas diretas da função**  
   Impacto: alguns crawlers podem ter parsing mais rígido.

5. **[Médio/baixo] Cache agressivo (`max-age=3600`) em OG para conteúdo recém-publicado**  
   Impacto: preview inconsistente entre links novos por janela de cache.

## Plano de correção em fases (sequencial com rollback de hipótese)

### Fase 1 — Corrigir classificação de crawler (candidato #1)
**Mudança alvo:** `og-meta/index.ts`
- Incluir `meta-externalagent` em `BOT_PATTERNS` (ou ajustar condição de redirect para excluir WhatsApp/Meta explicitamente).
- Garantir que bot nunca receba script de redirect.
- Manter `isWhatsApp` como está.

**Critério de sucesso**
- `curl -A 'meta-externalagent/1.1' .../og-meta?...` retorna OG sem `<script>`.
- Ambos os slugs com `og:title` e `og:image` corretos.
- Novo teste no WhatsApp: os 2 links exibem ao menos título/descrição consistentemente.

**Se falhar:** avançar para Fase 2.

### Fase 2 — Tornar imagem WhatsApp determinística (candidato #3)
**Mudança alvo:** `og-meta/index.ts` (e, se necessário, pipeline de mídia)
- Estratégia A (rápida): para WhatsApp, usar **imagem fallback PNG/JPEG fixa** para garantir render imediato.
- Estratégia B (definitiva): gerar e persistir thumbnail JPEG em publish/upload (URL dedicada), e usar essa URL para WhatsApp.
- Não depender de negociação implícita de formato.

**Critério de sucesso**
- `curl -I` na `og:image` WhatsApp retorna `Content-Type` consistente (`image/jpeg` ou `image/png`) e 200.
- Preview com imagem aparece em ambos os links no WhatsApp.

**Se falhar:** avançar para Fase 3.

### Fase 3 — Auditoria/correção de roteamento externo (candidato #2)
**Mudança alvo:** camada externa de roteamento para `og-meta` (proxy/edge fora deste repositório)
- Validar regex de rota para `/spaces/{space}/post/{post}` em todos os slugs.
- Garantir encaminhamento para `og-meta` para UAs `facebookexternalhit`, `meta-externalagent`, `WhatsApp`.
- Adicionar log de decisão de roteamento por UA+path.

**Critério de sucesso**
- Para ambos os slugs, todo request desses UAs gera log na `og-meta`.
- Sem casos de fallback SPA para crawler.

**Se falhar:** avançar para Fase 4.

### Fase 4 — Hardening de compatibilidade/caching (candidatos #4 e #5)
- Forçar `Content-Type: text/html; charset=utf-8` observável na rota pública.
- Reduzir TTL para conteúdo recém-publicado (ex.: 300s) + política de invalidação.
- Adicionar `og:image:secure_url` e `og:image:alt` (robustez cross-crawler).

**Critério de sucesso**
- Re-scrape consistente em WhatsApp/Facebook para links novos.
- Sem variação de título entre links do mesmo lote de publicação.

## Matriz de validação final (obrigatória em cada fase)
- UAs: `facebookexternalhit`, `meta-externalagent`, `WhatsApp`
- URLs: os 2 artigos do print + 1 artigo antigo de controle
- Verificações:
  1) presença de `og:title`, `og:description`, `og:image`, `og:url`
  2) ausência de redirect script para bots
  3) imagem 200 com tipo suportado
  4) logs da `og-meta` para **todos** os testes

## Conclusão da auditoria
O candidato mais forte é **erro de classificação de `meta-externalagent` como não-bot**, seguido por **inconsistência de roteamento externo** e **não determinismo de formato da imagem para WhatsApp**. O plano acima foi ordenado para atacar primeiro as causas com maior relação direta com o sintoma observado no print e menor custo de correção.
