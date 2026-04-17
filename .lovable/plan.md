

# Plano: corrigir conflito entre HTML estático pré-renderizado e Helmet no client

## Causa raiz

O Lovable (Cenário B confirmado) serve `dist/index.html` (template da Home) para todas as URLs. Esse arquivo **agora contém** as meta tags SEO da Home (description/canonical/og/twitter da rota `/`), porque o plugin SSG sobrescreveu o template raiz.

Quando o React monta `/plans` ou `/login`, o `<SEO />` via `react-helmet-async` **adiciona** suas próprias tags com mesmo `name`/`property`/`rel`. Mas Helmet só substitui tags que ele mesmo criou (identificadas por `data-rh="true"`). Como as tags da Home foram injetadas estaticamente pelo plugin SSG (sem esse atributo), **elas permanecem no DOM final** e ficam duplicadas/conflitantes com as da rota atual.

Resultado observado: `<title>` substituído (Helmet sempre substitui o único title), mas `description`, `canonical`, `og:*` e `twitter:*` continuam mostrando conteúdo da Home.

Isto também explica por que `/login` e `/register` não exibem `noindex,follow`: a rota `/` não tem robots no SSG, então Helmet adiciona uma nova `<meta name="robots">` que pode estar lá — mas o usuário talvez tenha procurado entre as 2 ou mais tags duplicadas e não viu.

## Solução

Marcar todas as tags SEO injetadas pelo plugin SSG com `data-rh="true"`. Esse é o atributo que `react-helmet-async` usa internamente para reconhecer tags como "suas". Assim, na hidratação client-side, Helmet vê as tags estáticas como próprias e as **substitui** corretamente quando o `<SEO />` da rota correta monta — sem duplicação.

## Mudança

**1 arquivo alterado:** `scripts/vite-plugin-prerender.ts`

Em `buildHeadTags()`, adicionar `data-rh="true"` em cada tag gerada (`<meta name="description" data-rh="true">`, `<link rel="canonical" data-rh="true">`, todas as `og:*`, todas as `twitter:*`, e a `<meta name="robots">`). O `<title>` também recebe `data-rh="true"` em `injectSeoIntoHtml()`.

Exemplo do antes/depois:
```html
<!-- antes -->
<meta name="description" content="Curadoria de IA..." />
<link rel="canonical" href="https://subhumano.ia.br/" />

<!-- depois -->
<meta name="description" content="Curadoria de IA..." data-rh="true" />
<link rel="canonical" href="https://subhumano.ia.br/" data-rh="true" />
```

## O que NÃO muda

- `index.html` template — segue sem description/og/canonical/twitter (apenas favicon, fonts, viewport, pixel, manifest, title genérico fallback).
- `src/components/SEO.tsx` — Helmet continua emitindo as tags com `data-rh` automaticamente.
- `scripts/prerender-routes.ts` — tabela de rotas inalterada.
- `vite.config.ts` — sem mudança.
- `public/sitemap.xml`, `public/robots.txt` — sem mudança.
- Nenhuma página de rota — já passam `path`, `noindex` corretos.

## Validação obrigatória

Após implementação + publicação pelo Sandro:

1. **Inspeção do DOM final** (F12 → Elements → `<head>`) em cada rota navegando direto pela URL: `/`, `/plans`, `/contato`, `/termos`, `/privacidade`, `/login`, `/register`.

2. **Critérios pass/fail por rota** (SEM duplicatas no head):

| Rota | `<title>` | `description` | `canonical` | `og:title`/`og:url` | `robots` |
|---|---|---|---|---|---|
| `/` | "Assuma o Comando..." | curadoria... | `https://subhumano.ia.br/` | matching home | ausente |
| `/plans` | "Planos e Assinatura..." | "Escolha o plano..." | `.../plans` | matching plans | ausente |
| `/contato` | "Contato..." | "Fale com..." | `.../contato` | matching contato | ausente |
| `/termos` | "Termos de Uso..." | "Leia os termos..." | `.../termos` | matching termos | ausente |
| `/privacidade` | "Política de Privacidade..." | "Política..." | `.../privacidade` | matching privacidade | ausente |
| `/login` | "Entrar..." | "Acesse..." | `.../login` | matching login | `noindex,follow` |
| `/register` | "Criar Conta..." | "Crie sua conta..." | `.../register` | matching register | `noindex,follow` |

3. **Curl raw** para `/plans` e `/login` no host publicado, conferindo: como o server serve `dist/index.html` raiz, a resposta inicial conterá as metas da Home com `data-rh="true"` — o crawler que executa JS (Googlebot moderno) hidrata e vê as corretas; o crawler que NÃO executa JS verá as da Home no `/plans`. Para esse último caso, a contingência B1 (Cloudflare Worker servindo o arquivo `dist/{rota}/index.html` correspondente) continua sendo o passo seguinte.

4. Entrego screenshot/output do DOM final por rota como evidência.

## Sequência

1. Editar `scripts/vite-plugin-prerender.ts` (adicionar `data-rh="true"` em 11 tags).
2. Sandro publica.
3. Validação visual do head no DOM final por rota (7 rotas).
4. Se passar → conflito client-side resolvido. Sandro decide se ativa Cloudflare Worker (Cenário B1) para também resolver crawlers sem JS.

## Total

1 arquivo alterado. Zero novas dependências. Zero mudanças de rota/config/secrets.

