

# Relatorio de Diagnostico de Performance Web

Auditoria completa do codigo-fonte da aplicacao Subhumano, focando em gargalos que degradam a experiencia em redes moveis (4G/5G).

---

## GARGALO 1: Podcast - Over-fetching com `SELECT *`

**Impacto**: Alto

**Problema**: O hook `usePodcasts()` (linha 36, `src/hooks/usePodcasts.ts`) executa `select("*, spaces(id, name, slug, icon)")` buscando TODOS os campos da tabela `podcasts`, incluindo `description` completa e `audio_url` para cada item da listagem. Em uma lista de 20+ podcasts, isso transfere dados desnecessarios (URLs de audio, descricoes longas) que so sao usados na pagina de detalhe.

**Solucao**: Projetar apenas os campos necessarios para o card:
```sql
select("id, title, slug, cover_url, duration_seconds, tags, published_at, spaces(id, name, slug, icon)")
```
Isso reduz o payload de listagem significativamente, especialmente com descricoes longas.

---

## GARGALO 2: Podcast Player - Sem Preload Inteligente

**Impacto**: Alto

**Problema**: O `PodcastPlayer` (linha 147 de `PodcastPlayer.tsx`) usa `preload="metadata"`, o que e correto para nao baixar o arquivo inteiro. Porem, o streaming depende do servidor de armazenamento (Supabase Storage / bucket `podcast-media`) suportar Range Requests. O bucket e publico e servido via CDN do Supabase, que suporta Range Requests nativamente. O problema real e que nao ha **nenhum preloading** do audio quando o usuario navega para a pagina de detalhe - o download so inicia quando o componente monta. Em redes 4G com alta latencia (~100ms RTT), isso gera um atraso perceptivel no Time to Play.

**Solucao**: Implementar `<link rel="preload" as="fetch">` no componente `PodcastDetail` para iniciar o download dos metadados do audio antes do player montar. Alternativamente, usar `preload="auto"` para episodios curtos (menos de 10min).

---

## GARGALO 3: Cascata de Requisicoes (Waterfall) na Home

**Impacto**: Alto

**Problema**: A pagina Home (`src/pages/Home.tsx`) dispara 3 queries independentes: `useHighlights()`, `useRecentDiscussions()` e `useSubscribedSpaces()`. Embora paralelas no React, cada uma delas internamente tem uma cascata:

- `useHighlights`: Busca subscricoes -> Busca updates -> Busca stats + likes (3 etapas sequenciais)
- `useRecentDiscussions`: Busca posts -> Busca stats + media + likes (2 etapas)
- `useSubscribedSpaces`: Busca subscricoes -> Busca contagem de updates (2 etapas)

Isso cria um total de **7-8 requisicoes sequenciais** ao banco, cada uma com latencia de rede. Em 4G, cada round-trip pode levar 100-200ms, somando 700-1600ms so de latencia.

**Solucao**: Criar uma **database view** ou **RPC function** que consolide os dados da Home em uma unica chamada. Por exemplo, uma funcao `get_home_feed(user_id)` que retorne highlights, discussions e subscribed spaces em um unico round-trip.

---

## GARGALO 4: useSubscribedSpaces - Contagem Ineficiente

**Impacto**: Medio

**Problema**: O hook `useSubscribedSpaces` (linha 121-131, `src/hooks/useSpaces.ts`) busca TODOS os `space_updates` publicados dos espacos inscritos apenas para contar quantos existem por espaco. Se um espaco tem 500 updates, o Supabase retorna 500 linhas so para incrementar um contador.

**Solucao**: Usar `.select("space_id", { count: 'exact', head: true })` agrupado por espaco, ou melhor ainda, criar uma coluna pre-calculada `updates_count` na tabela `spaces` atualizada por trigger, ou usar a view existente `space_update_stats`.

---

## GARGALO 5: Imagens sem Dimensoes Explicitas (CLS)

**Impacto**: Medio

**Problema**: As imagens de thumbnails nos cards da Home (linhas 186-192) e nos PodcastCards (linhas 29-34) usam `loading="lazy"` corretamente, porem nao possuem atributos `width` e `height` explicitos. Isso causa **Cumulative Layout Shift (CLS)** - o layout "pula" quando a imagem carrega, degradando a percepcao de velocidade.

**Solucao**: Adicionar `width` e `height` fixos nos elementos `<img>` ou usar containers com `aspect-ratio` definido via CSS (os cards ja usam classes fixas como `w-20 h-20`, entao o impacto e reduzido nesses casos, mas o cover do podcast `aspect-video` nao tem fallback de altura).

---

## GARGALO 6: Framer Motion em Todos os Cards da Home

**Impacto**: Medio

**Problema**: Cada card na Home e envolvido em `<motion.div>` com animacoes de `opacity` e `y` (linhas 149-153, 246-250). Em dispositivos moveis de baixo desempenho, animar multiplos elementos simultaneamente durante o carregamento inicial causa **jank** (queda de FPS), piorando a percepcao de velocidade.

**Solucao**: Limitar as animacoes de entrada apenas ao primeiro carregamento (usando `initial={false}` apos o primeiro render) ou substituir por CSS transitions simples (`@starting-style` ou classes de transicao), que sao mais leves que JS-driven animations do Framer Motion. A constante `MAX_STAGGER_ITEMS = 4` ja limita parcialmente, mas os items alem do 4o ainda animam com o mesmo delay.

---

## GARGALO 7: Podcast Cover sem Lazy Loading

**Impacto**: Baixo

**Problema**: Na pagina `PodcastDetail.tsx`, a imagem de capa do podcast (renderizada dentro do `PodcastPlayer`, linha 147-152) nao usa `loading="lazy"` pois esta above-the-fold. Isso e correto. Porem, no `PodcastCard.tsx` (linha 31), as imagens de capa na listagem tambem **nao** usam `loading="lazy"`, o que significa que todas as capas sao carregadas de uma vez, mesmo as que estao fora da viewport.

**Solucao**: Adicionar `loading="lazy"` nas imagens do `PodcastCard`.

---

## GARGALO 8: Formato de Imagem (WebP/AVIF)

**Impacto**: Baixo (limitacao de infraestrutura)

**Problema**: As imagens sao servidas pelo Supabase Storage no formato original de upload (provavelmente JPEG/PNG). Nao ha transformacao automatica para formatos modernos como WebP ou AVIF.

**Solucao**: Isso e uma limitacao do Supabase Storage que nao oferece transformacao de imagem automatica no plano gratuito. A solucao seria: (1) fazer upload ja em formato WebP pelo admin, ou (2) usar um CDN com transformacao de imagem (Cloudflare Images, imgproxy) na frente do Supabase Storage.

---

## Resumo de Prioridades

| Prioridade | Gargalo | Impacto | Esforco |
|---|---|---|---|
| 1 | Cascata de requisicoes na Home | Alto | Alto (criar RPC) |
| 2 | Over-fetching no usePodcasts | Alto | Baixo (ajustar select) |
| 3 | Preload do audio do podcast | Alto | Baixo (adicionar preload) |
| 4 | Contagem ineficiente useSubscribedSpaces | Medio | Medio (refatorar query) |
| 5 | Lazy loading no PodcastCard | Baixo | Baixo (1 atributo) |
| 6 | Animacoes Framer Motion | Medio | Medio (refatorar) |
| 7 | CLS em imagens | Medio | Baixo |
| 8 | Formato de imagem | Baixo | Alto (infra) |

## Recomendacao de Acao Imediata

Os gargalos 2 (over-fetching podcasts) e 5 (lazy loading PodcastCard) podem ser corrigidos em menos de 10 minutos com alteracoes de 1-2 linhas cada. O gargalo 3 (preload audio) requer adicionar um `<link>` no PodcastDetail. Esses 3 juntos ja trazem melhoria significativa para redes moveis.

O gargalo 1 (cascata na Home) e o de maior impacto absoluto mas requer criar uma funcao RPC no banco, sendo um esforco maior.

