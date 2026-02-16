

# Otimizar velocidade de carregamento da Landing Page para campanhas Meta

## Diagnostico

A taxa de visualizacao (56 de 89 cliques = 63%) indica que ~37% dos usuarios abandonam antes da pagina renderizar. O problema esta no tempo entre o clique no anuncio e o primeiro conteudo visivel (First Contentful Paint). Analisei o codigo e identifiquei os seguintes gargalos:

### Gargalos identificados

1. **Landing Page e lazy-loaded**: Mesmo sendo a rota principal, ela requer download de um chunk JS separado antes de renderizar qualquer coisa. O usuario ve apenas "Carregando..." (o fallback do Suspense) enquanto espera.

2. **Waterfall de rede na inicializacao**: O fluxo atual e sequencial:
   - Baixar HTML -> Baixar JS principal -> Baixar chunk da Landing -> Inicializar AuthContext (chamada ao backend) -> Verificar subscription (outra chamada ao backend) -> So entao renderizar a landing

3. **Google Fonts bloqueando renderizacao**: A fonte DM Sans e carregada via `<link rel="stylesheet">` que pode bloquear a renderizacao do texto ate carregar.

4. **6 imagens PNG importadas estaticamente**: As imagens do carrossel de mockup (screen-1.png a screen-6.png) sao importadas diretamente no bundle, aumentando o tamanho do chunk.

5. **Framer Motion na renderizacao inicial**: Toda animacao do hero usa framer-motion, que adiciona ~30-40KB ao bundle critico.

6. **Consulta ao banco de dados (eventos)**: O componente `LandingEvents` faz query no banco para buscar eventos futuros, adicionando latencia.

---

## Plano de otimizacao (por impacto)

### 1. Carregar a Landing Page de forma sincrona (ALTO IMPACTO)

Remover o `lazy()` da Landing page. Como e a pagina de entrada para campanhas, ela deve estar no bundle principal.

**Arquivo**: `src/App.tsx`

```typescript
// ANTES:
const Landing = lazy(() => import("./pages/Landing"));

// DEPOIS:
import Landing from "./pages/Landing";
```

Isso elimina o download de chunk extra e renderiza imediatamente.

### 2. Adicionar skeleton HTML inline no index.html (ALTO IMPACTO)

Adicionar conteudo visivel diretamente no `<div id="root">` para que o usuario veja algo ANTES do JS carregar. Isso elimina a tela branca.

**Arquivo**: `index.html`

Inserir dentro do `<div id="root">` um skeleton com fundo preto, logo e placeholder do titulo, usando CSS inline puro (zero JS). O React substituira automaticamente quando montar.

### 3. Otimizar carregamento da fonte (MEDIO IMPACTO)

Trocar a estrategia de carregamento da fonte para nao bloquear a renderizacao.

**Arquivo**: `index.html`

```html
<!-- ANTES -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans..." />

<!-- DEPOIS -->
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=DM+Sans...&display=swap" 
      onload="this.onload=null;this.rel='stylesheet'" />
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans...&display=swap" /></noscript>
```

Isso carrega a fonte de forma assincrona, mostrando a fonte do sistema enquanto a DM Sans baixa.

### 4. Eliminar waterfall de auth na Landing Page (MEDIO IMPACTO)

Na pagina Landing, o componente atual espera `authLoading` resolver para decidir se mostra o conteudo ou redireciona. Para usuarios novos (100% do trafego de campanhas), isso adiciona latencia desnecessaria.

**Arquivo**: `src/pages/Landing.tsx`

Renderizar o conteudo da landing IMEDIATAMENTE enquanto o auth carrega em paralelo. Se o usuario estiver logado, o redirect acontece apos sem bloquear a renderizacao visual.

```typescript
// ANTES: mostra "Carregando..." enquanto verifica auth
if (authLoading || (user && subLoading)) {
  return <div>Carregando...</div>;
}

// DEPOIS: renderiza a landing imediatamente, redirect em background
// Remover o early return de loading
```

### 5. Lazy load do carrossel de imagens (MEDIO IMPACTO)

As 6 imagens de mockup sao importadas estaticamente. Trocar para carregamento dinâmico.

**Arquivo**: `src/components/landing/PhoneMockupCarousel.tsx`

Usar `loading="lazy"` (ja esta) mas tambem evitar importacao estatica, usando caminhos publicos ou imports dinamicos.

### 6. Prefetch de recursos criticos (BAIXO IMPACTO)

Adicionar `<link rel="modulepreload">` para os chunks mais importantes.

**Arquivo**: `index.html`

```html
<link rel="preconnect" href="https://akkbfzfjappludgsrwsw.supabase.co" />
```

Isso inicia a conexao TLS com o backend antes do JS precisar.

---

## Resumo de arquivos a alterar

| Arquivo | Alteracao | Impacto |
|---|---|---|
| `src/App.tsx` | Import sincrono da Landing | Alto |
| `index.html` | Skeleton inline + font async + preconnect backend | Alto |
| `src/pages/Landing.tsx` | Renderizar conteudo sem esperar auth | Medio |
| `src/components/landing/PhoneMockupCarousel.tsx` | Otimizar imports de imagens | Medio |

## Resultado esperado

- **Antes**: Tela branca/loading por 2-4s em 4G
- **Depois**: Conteudo visivel em menos de 1s, interativo em ~2s
- **Meta esperada**: Subir a taxa de visualizacao de 63% para 85%+

