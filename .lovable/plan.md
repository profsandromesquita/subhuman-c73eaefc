

# Plano: Índice completo de conteúdo no contexto da IA

## Resumo

1 arquivo alterado: `supabase/functions/ai-assistant/index.ts`. Adicionar função `fetchContentIndex` + `buildContentIndex` para injetar um índice compacto de TODOS os artigos e podcasts publicados no system message, com cache de 10 minutos e limite de 8000 caracteres.

---

## Mudança 1 — Novo fetcher com cache (após linha 97)

```typescript
interface IndexArticle { title: string; slug: string; created_at: string; spaces: { name: string; slug: string }; }
interface IndexPodcast { title: string; slug: string; created_at: string; }

async function fetchContentIndex(db: any): Promise<{ articles: IndexArticle[]; podcasts: IndexPodcast[] }> {
  return cached("content_index", 10 * 60_000, async () => {
    const [artRes, podRes] = await Promise.all([
      db.from("space_updates")
        .select("title, slug, created_at, spaces!inner(name, slug)")
        .eq("is_published", true)
        .order("created_at", { ascending: false }),
      db.from("podcasts")
        .select("title, slug, created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false }),
    ]);
    return {
      articles: (artRes.data || []) as IndexArticle[],
      podcasts: (podRes.data || []) as IndexPodcast[],
    };
  });
}
```

## Mudança 2 — Builder compacto (após fetcher)

```typescript
function buildContentIndex(articles: IndexArticle[], podcasts: IndexPodcast[]): string {
  const MAX_CHARS = 8000;
  const truncTitle = (t: string) => t.length > 60 ? t.substring(0, 57) + "..." : t;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

  let ctx = `\n[ÍNDICE COMPLETO DE CONTEÚDO DA PLATAFORMA]\nArtigos publicados (${articles.length} artigos):\n`;

  let truncatedArticles = 0;
  for (const a of articles) {
    const line = `- ${a.spaces?.name || "Geral"} | ${truncTitle(a.title)} | ${fmtDate(a.created_at)} | /spaces/${a.spaces?.slug || "geral"}/post/${a.slug}\n`;
    if (ctx.length + line.length > MAX_CHARS - 500) { // reserva 500 chars para podcasts
      truncatedArticles = articles.length - articles.indexOf(a);
      ctx += `... e mais ${truncatedArticles} artigos. Consulte os espaços da plataforma para ver todos.\n`;
      break;
    }
    ctx += line;
  }

  ctx += `\nPodcasts publicados (${podcasts.length} episódios):\n`;

  let truncatedPodcasts = 0;
  for (const p of podcasts) {
    const line = `- ${truncTitle(p.title)} | ${fmtDate(p.created_at)} | /podcasts/${p.slug}\n`;
    if (ctx.length + line.length > MAX_CHARS) {
      truncatedPodcasts = podcasts.length - podcasts.indexOf(p);
      ctx += `... e mais ${truncatedPodcasts} podcasts. Consulte a seção de podcasts para ver todos.\n`;
      break;
    }
    ctx += line;
  }

  return ctx + "\n";
}
```

## Mudança 3 — Adicionar fetch ao Promise.all (linha 493)

Adicionar `fetchContentIndex(db)` ao array de promises paralelas:

```typescript
const [rawRagChunks, recentPosts, channelPosts, channels, podcasts, userProfile, constitutionChunks, contentIndex] = await Promise.all([
  searchRAGChunks(searchQuery, db, ragCfg),
  fetchRecentPosts(db),
  fetchRecentChannelPosts(db),
  fetchChannelsCatalog(db),
  fetchRecentPodcasts(db),
  fetchUserProfile(db, user.id),
  needsConstitution ? fetchConstitutionChunks(db) : Promise.resolve([]),
  fetchContentIndex(db),  // NOVO
]);
```

## Mudança 4 — Inserir no system message (entre linha 567-568)

Inserir o bloco do índice ANTES de `buildChannelsContext`:

```typescript
sysMsg += buildContentIndex(contentIndex.articles, contentIndex.podcasts);
sysMsg += buildChannelsContext(channels);
```

## Mudança 5 — Log atualizado (linha 538)

Adicionar contagem do índice no console.log:

```
..., index: ${contentIndex.articles.length}a/${contentIndex.podcasts.length}p, ...
```

---

## Resultado no system message

```
... [IDENTIDADE E DIRETRIZES] ...
... [BASE DE CONHECIMENTO] ...

[ÍNDICE COMPLETO DE CONTEÚDO DA PLATAFORMA]
Artigos publicados (83 artigos):
- Produtividade | Como o Claude 3.5 mudou o Vibe-Coding | 25/03/2026 | /spaces/produtividade/post/claude-35-vibe-coding
- Marketing | Automação com IA para leads | 20/03/2026 | /spaces/marketing/post/automacao-ia-leads
...

Podcasts publicados (24 episódios):
- O futuro do trabalho com IA | 22/03/2026 | /podcasts/futuro-trabalho-ia
...

[CANAIS DA PLATAFORMA]
...
[PODCASTS RECENTES — últimos 8 episódios...]
[ARTIGOS RECENTES — últimos 5 artigos...]
```

## Arquivo alterado

`supabase/functions/ai-assistant/index.ts` — 5 edits (2 funções novas, Promise.all, sysMsg, log)

