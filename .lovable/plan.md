

# Plano: sitemap.xml confiável para produção

## Contexto atual

`public/sitemap.xml` hoje é estático e lista apenas 5 URLs institucionais. Isso é correto e seguro como base, mas não cobre **rotas dinâmicas públicas indexáveis** que existem no projeto:

- **Artigos editoriais** (`/spaces/{space-slug}/post/{post-slug}`) — públicos quando `is_premium = false` (paywall via `ContentPaywall` para premium, mas a página/SEO existe).
- **Listagens de espaços** (`/spaces/{space-slug}`).
- **Podcasts** (`/podcasts/{podcast-slug}`) — públicos.
- **Eventos** (`/events/{event-slug}`) — públicos.

O que **NÃO entra** (já alinhado com decisões anteriores):
- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` (noindex).
- `/admin/*`, `/profile/*`, `/messages`, `/notifications`, `/highlights`, `/ai-assistant`, `/search`, `/payment-success`, `/setup-admin` (privadas/sem valor SEO).
- `/channels/*` (fórum da comunidade — conteúdo gerado por usuário, fora do escopo SEO institucional desta fase).
- Rotas com query params, previews, duplicatas.

## Estratégia: sitemap dinâmico via Edge Function + sitemap estático fallback

Como o host serve apenas arquivos estáticos do `dist/`, a forma confiável de manter o sitemap sempre atualizado **sem depender do build** é:

1. **Edge Function `sitemap`** (Supabase) — consulta as tabelas `space_updates` (artigos publicados não-rascunho), `spaces`, `podcasts`, `events` e gera o XML em tempo real com `Content-Type: application/xml`. Cache HTTP de 1 hora (`Cache-Control: public, max-age=3600`).

2. **Cloudflare Worker** (já existe, fora do repo — apenas nota de coordenação) — adiciona uma regra: `GET /sitemap.xml` faz fetch da Edge Function `https://akkbfzfjappludgsrwsw.supabase.co/functions/v1/sitemap` e retorna a resposta. Sandro precisa adicionar essa rota ao Worker.

3. **`public/sitemap.xml`** — mantido como **fallback estático** com as 5 URLs institucionais. Se o Worker não estiver atualizado, o Lovable serve esse arquivo. Se o Worker estiver atualizado, ele intercepta antes.

4. **`public/robots.txt`** — já contém `Sitemap: https://subhumano.ia.br/sitemap.xml`. Sem mudança.

## Por que essa abordagem

- **Atualização automática**: novo artigo/podcast/evento publicado pelo admin aparece no sitemap em até 1h (cache TTL), sem build/deploy.
- **Confiável**: a Edge Function lê do mesmo banco que serve o app — fonte única de verdade.
- **Sem dependência de Cloudflare na fase 1**: enquanto Sandro não atualiza o Worker, o sitemap estático com 5 URLs continua válido (Google já o conhece). Quando Sandro atualizar o Worker, o sitemap dinâmico assume.

## Arquivos

**Novo (1):**
- `supabase/functions/sitemap/index.ts` — Edge Function que:
  - Consulta `space_updates` (filtros: `is_published = true`, `status = 'published'`, traz `slug`, `updated_at`, e join com `spaces.slug`).
  - Consulta `spaces` (todos os ativos).
  - Consulta `podcasts` (publicados).
  - Consulta `events` (publicados, futuros e passados — Google ainda valoriza histórico).
  - Monta XML com `<url><loc>...</loc><lastmod>...</lastmod></url>` por item, usando `updated_at` como `lastmod` (formato `YYYY-MM-DD`). Sem `changefreq` nem `priority` (decisão prévia).
  - Inclui as 5 URLs institucionais fixas no topo.
  - Retorna `200` com `Content-Type: application/xml; charset=utf-8` e `Cache-Control: public, max-age=3600`.
  - `verify_jwt = false` (precisa ser público — adiciona bloco em `supabase/config.toml`).

**Alterado (1):**
- `supabase/config.toml` — adicionar bloco `[functions.sitemap] verify_jwt = false`.

**Sem mudança:**
- `public/sitemap.xml` (fallback estático).
- `public/robots.txt`.
- Cloudflare Worker (mudança fora do repo, comunicada ao Sandro).

## Conteúdo final esperado do sitemap.xml (servido pela Edge Function)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Institucionais -->
  <url><loc>https://subhumano.ia.br/</loc></url>
  <url><loc>https://subhumano.ia.br/plans</loc></url>
  <url><loc>https://subhumano.ia.br/contato</loc></url>
  <url><loc>https://subhumano.ia.br/termos</loc></url>
  <url><loc>https://subhumano.ia.br/privacidade</loc></url>

  <!-- Espaços (listagens) -->
  <url><loc>https://subhumano.ia.br/spaces/produtividade</loc><lastmod>2026-04-10</lastmod></url>
  <url><loc>https://subhumano.ia.br/spaces/marketing</loc><lastmod>2026-04-08</lastmod></url>
  <!-- ...demais espaços ativos... -->

  <!-- Artigos publicados -->
  <url><loc>https://subhumano.ia.br/spaces/programacao/post/claude-3-5-sonnet-vibe-coding</loc><lastmod>2026-04-15</lastmod></url>
  <!-- ...todos os space_updates publicados... -->

  <!-- Podcasts -->
  <url><loc>https://subhumano.ia.br/podcasts/episodio-42-ia-no-brasil</loc><lastmod>2026-04-12</lastmod></url>
  <!-- ...todos os podcasts publicados... -->

  <!-- Eventos -->
  <url><loc>https://subhumano.ia.br/events/workshop-cursor-2026</loc><lastmod>2026-04-01</lastmod></url>
  <!-- ...todos os eventos publicados... -->
</urlset>
```

## Estratégia de atualização contínua

Zero intervenção manual:
- **Novo artigo publicado pelo admin** → aparece no sitemap em ≤1h (próxima request após expiração do cache).
- **Novo podcast/evento** → idem.
- **Conteúdo despublicado/excluído** → desaparece do sitemap em ≤1h.
- **Novas rotas institucionais** (raras) → exigem editar a constante `INSTITUTIONAL_URLS` na Edge Function. Documentado em comentário no topo do arquivo.

Após implementação:
1. Sandro publica o projeto (deploy frontend é automático para Edge Functions).
2. Sandro adiciona rota no Cloudflare Worker para proxy `/sitemap.xml` → Edge Function.
3. Eu valido com `curl https://subhumano.ia.br/sitemap.xml` confirmando XML válido com URLs dinâmicas.
4. Sandro ressubmete o sitemap no Google Search Console (URL inalterada — apenas força reindexação).

## Validação obrigatória pós-deploy

```bash
curl -s https://subhumano.ia.br/sitemap.xml | head -50
curl -sI https://subhumano.ia.br/sitemap.xml | grep -E "content-type|cache-control"
```

Critérios:
- HTTP 200, `Content-Type: application/xml`.
- Contém as 5 URLs institucionais.
- Contém ao menos 1 artigo, 1 podcast, 1 evento (se houver no banco).
- Nenhuma URL `/login`, `/register`, `/admin/*`, `/profile/*`, `/messages`, `/channels/*`.
- Todas as URLs começam com `https://subhumano.ia.br`.
- XML válido (sem caracteres não-escapados em slugs).

## Total

- **1 arquivo novo** (`supabase/functions/sitemap/index.ts`)
- **1 arquivo alterado** (`supabase/config.toml`)
- **Zero novas dependências**
- **Zero migrations**
- **Cloudflare Worker**: 1 regra a adicionar fora do repo (instruções entregues ao Sandro)

