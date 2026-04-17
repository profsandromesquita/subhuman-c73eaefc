

# Plano: SSG leve + validação obrigatória em produção

## Estratégia (inalterada)

Plugin Vite custom no hook `closeBundle` gera `dist/{rota}/index.html` para 7 rotas com `<title>`, `<meta description>`, `<link rel="canonical">`, `<meta robots>`, `og:*` e `twitter:*` injetados no `<head>`. Body permanece o shell SPA. Zero dependências novas.

## Arquivos

**Novos (2):**
- `scripts/prerender-routes.ts` — tabela única (path, title, description, robots, ogType) para 7 rotas: `/`, `/plans`, `/contato`, `/termos`, `/privacidade`, `/login`, `/register`.
- `scripts/vite-plugin-prerender.ts` — plugin que lê `dist/index.html`, clona e injeta head específico por rota, escreve `dist{path}/index.html`.

**Alterado (1):**
- `vite.config.ts` — registra o plugin.

## Validação obrigatória em produção (parte do plano, não opcional)

Após implementação e publicação, executo via `code--exec` com `curl -A "Googlebot/2.1"` contra a URL publicada (`https://subhuman.lovable.app` enquanto o domínio canônico não está conectado, e depois `https://subhumano.ia.br` quando o Cloudflare Worker apontar).

**Matriz de testes (7 URLs × 4 verificações):**

```
para cada rota em [/, /plans, /contato, /termos, /privacidade, /login, /register]:
  curl -sA "Googlebot/2.1" https://<host><rota> | grep -E '<title>|name="description"|rel="canonical"|name="robots"'
```

Critério de aprovação por rota:

| Rota | Title esperado contém | Canonical esperado | Robots esperado |
|---|---|---|---|
| `/` | "Assuma o Comando da IA" | `https://subhumano.ia.br/` | (ausente = index,follow) |
| `/plans` | "Planos e Assinatura" | `https://subhumano.ia.br/plans` | (ausente) |
| `/contato` | "Contato" | `https://subhumano.ia.br/contato` | (ausente) |
| `/termos` | "Termos de Uso" | `https://subhumano.ia.br/termos` | (ausente) |
| `/privacidade` | "Política de Privacidade" | `https://subhumano.ia.br/privacidade` | (ausente) |
| `/login` | "Entrar" | `https://subhumano.ia.br/login` | `noindex,follow` |
| `/register` | "Criar Conta" | `https://subhumano.ia.br/register` | `noindex,follow` |

Entrego o relatório bruto (output do curl) das 7 rotas como evidência.

## Cenários possíveis e plano de contingência

**Cenário A — Lovable serve `dist/{rota}/index.html` corretamente (esperado).**
SPA fallback do Lovable é descrito na doc como "checks whether the path maps to a real file. If no file is found... serves index.html". Como o build gera `dist/plans/index.html` real, a infraestrutura serve esse arquivo antes do fallback. Validação confirma → plano aprovado, encerro.

**Cenário B — Lovable serve sempre `dist/index.html` raiz (ignora subpastas).**
Validação mostra todas as rotas com mesmo `<title>Subhumano</title>`. Neste caso, ativo a contingência:

- **B1 (preferida)**: Solicitar ao Sandro alteração no Cloudflare Worker (fora deste repo) para detectar User-Agent de bots (`Googlebot|bingbot|Slackbot|facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|TelegramBot`) e fazer fetch interno de `/{rota}/index.html` do origin Lovable, retornando esse HTML. Usuários comuns continuam recebendo SPA. Esta é a abordagem "ambos defensivo" originalmente aprovada.
- **B2 (fallback)**: Migrar pré-renderização para uma Edge Function Supabase nova (`prerender`) que serve HTML por rota; Worker roteia bots para essa função. Maior complexidade, só se B1 não for viável.

**Cenário C — Lovable serve HTML mas remove/reescreve tags do head.**
Improvável (host estático normal não toca em HTML), mas a validação detecta. Reporto e adapto.

## Sequência de execução

1. Criar `scripts/prerender-routes.ts` e `scripts/vite-plugin-prerender.ts`.
2. Editar `vite.config.ts`.
3. Sandro publica via botão Publish do Lovable.
4. Eu rodo a matriz de validação com curl contra `https://subhuman.lovable.app/{rota}` (host publicado atual).
5. Entrego output bruto + tabela de pass/fail por rota.
6. Se Cenário A → encerro. Se Cenário B → aciono contingência B1.

## O que NÃO muda

- `src/components/SEO.tsx`, `react-helmet-async`, `public/sitemap.xml` (5 URLs), `public/robots.txt`.
- Nenhuma rota dinâmica pré-renderizada (artigos/podcasts/eventos seguem com Edge Function `og-meta` para crawlers sociais).
- Sem novas dependências npm.

## Total

2 arquivos novos + 1 alterado + ciclo obrigatório de validação em produção com evidência curl antes de considerar aprovado.

