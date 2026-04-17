

# Plano final: SEO canônico por rota + sitemap + padronização de URLs

## Ajustes aplicados (vs versão anterior)

1. **`sitemap.xml`**: removidos `changefreq` e `priority`. Mantenho apenas `<loc>`. Não incluo `lastmod` nesta fase porque as rotas listadas (Home, Plans, Contato, Termos, Privacidade) são páginas de marketing/institucionais sem fonte de dado confiável e versionada para data de modificação. Em fase futura, quando o sitemap for dinâmico (artigos/podcasts), `lastmod` vem de `updated_at` do banco.
2. **`public/robots.txt`**: linha em texto puro, sem markdown:
   ```
   Sitemap: https://subhumano.ia.br/sitemap.xml
   ```

## Confirmações solicitadas

### 3. Conteúdo visivelmente distinto nas páginas públicas indexáveis

**Confirmado.** As 5 rotas públicas indexáveis já possuem conteúdo único e substancialmente distinto na renderização (não apenas nos metadados). Verificação por arquivo:

| Rota | Componente | Conteúdo único renderizado |
|---|---|---|
| `/` | `src/pages/Landing.tsx` | Hero, LandingProblem, LandingMethod, LandingFeatures, LandingSpaces, LandingEvents, LandingAuthor, LandingSocialProof, LandingFAQ, LandingCTA, LandingFooter — landing page completa |
| `/plans` | `src/pages/Plans.tsx` | Tabela de planos, preços, benefícios, CTAs de checkout Ticto |
| `/contato` | `src/pages/Contact.tsx` | Formulário de contato + informações institucionais |
| `/termos` | `src/pages/TermsOfUse.tsx` | Texto legal completo dos termos de uso |
| `/privacidade` | `src/pages/PrivacyPolicy.tsx` | Política de privacidade LGPD completa |

Cada página tem H1 próprio, copy original e estrutura de seções diferente. Não há risco de "thin content" ou conteúdo duplicado entre elas. O Google verá 5 páginas semanticamente independentes, cada uma com seu próprio canonical autorreferente.

### 4. Sitemap e isolamento de rotas com noindex

**Confirmado em duas dimensões:**

**a) Nenhuma rota `noindex` entra no sitemap.xml.** O sitemap contém estritamente as 5 URLs marcadas como `index,follow` na tabela de rotas. Auth (`/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`), utilitárias (`/payment-success`, `/setup-admin`), autenticadas (`/home`, `/spaces`, `/podcasts`, etc.) e admin (`/admin/*`) ficam **fora** do sitemap.

**b) Rotas privadas/admin/auth não recebem links públicos fortes.**
- **Landing page (única página pública com navegação primária)**: revisei `LandingHero`, `LandingFooter`, `LandingCTA`, `LandingMethod`, `StickyBottomCTA`, `LoginHero`. Os CTAs externos apontam para `/register` e `/login` — ambas marcadas `noindex,follow`, então o sinal de link não é amplificado, e como `follow` ainda é respeitado, a equity passa adiante sem indexar a auth em si. Isso é o padrão recomendado.
- **Footer**: contém apenas links para `/termos`, `/privacidade`, `/contato`, `/plans` (todas indexáveis) — nenhum link direto para área autenticada ou admin.
- **Admin (`/admin/*`)**: marcado `noindex,nofollow`. Não há links de páginas públicas apontando para `/admin`.
- **Robots.txt**: continua com `Allow: /` global (necessário para crawlers das redes sociais lerem OG tags). A proteção contra indexação de áreas privadas é feita via `<meta name="robots" content="noindex,...">` por rota — abordagem correta para SPAs, já que o Google executa JS e respeita meta robots renderizada.

---

## Arquivos NOVOS (4)

### 1. `src/lib/constants/site.ts`
```ts
export const SITE_URL = "https://subhumano.ia.br";
export const SITE_NAME = "Subhumano";
export const SITE_DESCRIPTION = "Curadoria de inteligência artificial validada por especialistas. Notícias, ferramentas, comunidade e podcast para profissionais que precisam de foco, não de ruído.";
export const SITE_OG_IMAGE = "https://akkbfzfjappludgsrwsw.supabase.co/storage/v1/object/public/email-assets/ecossistema-subhumano-inteligencia-artificial-prof-sandro-mesquita.webp";
```

### 2. `supabase/functions/_shared/site.ts`
```ts
export const SITE_URL = "https://subhumano.ia.br";
export const SITE_NAME = "Subhumano";
export const SITE_FROM_EMAIL = "Subhumano <noreply@subhumano.ia.br>";
export const SITE_CONTACT_EMAIL = "contato@subhumano.ia.br";
```

### 3. `src/components/SEO.tsx`
Wrapper sobre `react-helmet-async`. Props: `title`, `description`, `path`, `noindex?`, `nofollow?`, `ogImage?`. Renderiza `<title>`, `<meta name="description">`, `<link rel="canonical" href="${SITE_URL}${path}">`, `<meta name="robots">` (apenas quando `noindex` ou `nofollow`), `og:url|title|description|image`, `twitter:title|description|image`.

### 4. `public/sitemap.xml`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://subhumano.ia.br/</loc></url>
  <url><loc>https://subhumano.ia.br/plans</loc></url>
  <url><loc>https://subhumano.ia.br/contato</loc></url>
  <url><loc>https://subhumano.ia.br/termos</loc></url>
  <url><loc>https://subhumano.ia.br/privacidade</loc></url>
</urlset>
```

---

## Arquivos ALTERADOS

### Estruturais
| Arquivo | Alteração |
|---|---|
| `package.json` | Adicionar `react-helmet-async` |
| `src/main.tsx` | Envolver `<App />` em `<HelmetProvider>` |
| `index.html` | Remover `<title>`, `<meta name="description">`, `<meta property="og:*">`, `<meta name="twitter:*">`. Manter apenas: charset, viewport, theme-color, apple-*, favicon, manifest, preconnects, fonts, facebook-domain-verification, Meta Pixel, fallback `<noscript>`. **Não** adicionar canonical global. |
| `public/robots.txt` | Adicionar linha: `Sitemap: https://subhumano.ia.br/sitemap.xml` |

### Páginas com `<SEO />`
- **Públicas indexáveis (5)**: `Landing`, `Plans`, `Contact`, `TermsOfUse`, `PrivacyPolicy`.
- **Públicas noindex (7)**: `Login`, `Register`, `VerifyEmail`, `ForgotPassword`, `ResetPassword`, `PaymentSuccess`, `SetupAdmin`.
- **Autenticadas noindex,follow (~20)**: `Home`, `Highlights`, `Spaces`, `SpaceDetail`, `PostDetail`, `Podcasts`, `PodcastDetail`, `Channels`, `ChannelDetail`, `ChannelPostDetail`, `Notifications`, `Profile` + subrotas, `Search`, `AIAssistant`, `Events`, `EventDetail`, `Messages`, `ConversationDetail`, `CompanyProfile`.
- **Admin noindex,nofollow**: aplicar no `AdminLayout` para cobrir todas as subrotas de uma vez.

### Tabela final de rotas indexáveis (title, description, canonical, robots)

| Rota | Title | Description | Canonical | Robots |
|---|---|---|---|---|
| `/` | Subhumano — Assuma o Comando da IA Sem Perder Seu Tempo | Curadoria de inteligência artificial validada por especialistas. Notícias, ferramentas, comunidade e podcast para profissionais que precisam de foco, não de ruído. | `https://subhumano.ia.br/` | `index,follow` |
| `/plans` | Planos e Assinatura — Subhumano | Escolha o plano ideal para acessar conteúdos premium, mentorias e a comunidade Subhumano. | `https://subhumano.ia.br/plans` | `index,follow` |
| `/contato` | Contato — Subhumano | Fale com o time do Subhumano. Suporte, parcerias e dúvidas sobre nosso ecossistema de inteligência artificial. | `https://subhumano.ia.br/contato` | `index,follow` |
| `/termos` | Termos de Uso — Subhumano | Leia os termos de uso da plataforma Subhumano, mantida pelo ITIA. | `https://subhumano.ia.br/termos` | `index,follow` |
| `/privacidade` | Política de Privacidade — Subhumano | Política de privacidade do Subhumano em conformidade com a LGPD. | `https://subhumano.ia.br/privacidade` | `index,follow` |

### Hardcodes substituídos (mantido das fases anteriores)
| Arquivo | Alteração |
|---|---|
| `src/hooks/useAuth.ts` | 4 strings → `SITE_URL` |
| `src/pages/Plans.tsx` | `window.location.origin` → `SITE_URL` (3x) |
| `src/components/landing/LandingEvents.tsx` | `window.location.origin` → `SITE_URL` |
| `src/pages/admin/settings/Payments.tsx` | `webhookUrl` informativo → `${SITE_URL}/api/webhooks` |
| `public/manifest.json` | Shortcuts `/espacos`→`/spaces`, `/canais`→`/channels` |
| `supabase/functions/og-meta/index.ts` | Usar `_shared/site.ts` |
| `supabase/functions/send-user-notification/index.ts` | Usar `SITE_URL` + `SITE_FROM_EMAIL` |
| `supabase/functions/send-bulk-email/index.ts` | Idem |
| `supabase/functions/send-daily-digest/index.ts` | Idem |
| `supabase/functions/send-push-notification/index.ts` | `mailto:` → `SITE_CONTACT_EMAIL` |
| `supabase/functions/auth-email-hook/index.ts` | Usar shared (mantém `SAMPLE_PROJECT_URL` placeholder) |

---

## Não muda
- Nenhum redirect de infra (http/https, www) — Cloudflare cuida.
- Nenhuma migration, tabela, webhook ou Edge Function nova.
- Sitemap dinâmico para artigos/podcasts/eventos — fase posterior (vai exigir Edge Function que consulta `posts`/`podcasts` e gera XML).
- Structured data (JSON-LD) — fase posterior.
- `robots.txt` mantém `Allow: /` global (necessário para OG crawlers).

