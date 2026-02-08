

# Nova Landing Page - Subhumano (9 Secoes)

## Escopo

Substituir o conteudo visual do `Landing.tsx` atual por uma landing page completa de alta conversao com 9 secoes, mantendo intacta a logica de redirecionamento para usuarios autenticados. Criar componentes isolados em `src/components/landing/`.

**Nenhum arquivo existente sera alterado**, exceto:
- `src/pages/Landing.tsx` — substituir o JSX (manter logica de auth)
- `index.html` — atualizar meta tags SEO

---

## Arquitetura de Componentes

Todos os novos componentes ficam em `src/components/landing/`:

```text
src/components/landing/
  LandingHero.tsx          -- Secao 1: Hero fullscreen
  LandingProblem.tsx       -- Secao 2: O problema / ruido
  LandingSpaces.tsx        -- Secao 3: 5 espacos tematicos
  LandingFeatures.tsx      -- Secao 4: Ferramentas (IA, Podcast, Canais)
  LandingMethod.tsx        -- Secao 5: Metodo Piloto (timeline)
  LandingAuthor.tsx        -- Secao 6: Arquiteto do sistema
  LandingFAQ.tsx           -- Secao 7: FAQ accordion
  LandingCTA.tsx           -- Secao 8: CTA final + garantia
  LandingFooter.tsx        -- Secao 9: Footer
  ScrollReveal.tsx         -- Wrapper de animacao (IntersectionObserver)
```

## Detalhes Tecnicos

### Animacoes de Scroll
Criar um componente `ScrollReveal` que usa `framer-motion` (ja instalado) com `whileInView` para fade-in/slide-up ao rolar. Cada secao sera envolvida por ele.

### Responsividade
- Mobile-first com breakpoints `sm`, `md`, `lg`
- Hero: `min-h-screen` com conteudo centralizado
- Grid dos espacos: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Feature blocks em zigzag: `flex-col md:flex-row` alternando `md:flex-row-reverse`
- Timeline vertical sempre em coluna
- Container: `max-w-5xl mx-auto px-6`

### Icones
Usar Lucide React (ja instalado) para todos os icones das secoes conforme especificado.

### Accordion do FAQ
Usar o componente `Accordion` ja existente em `src/components/ui/accordion.tsx` (Radix UI).

### SEO (index.html)
Atualizar title e meta description:
- Title: "Subhumano — Assuma o Comando da IA Sem Perder Seu Tempo"
- Description: "Curadoria de inteligencia artificial validada por especialistas. Noticias, ferramentas, comunidade e podcast para profissionais que precisam de foco, nao de ruido."

### Landing.tsx
Manter toda a logica de auth/redirect existente (linhas 30-58). Substituir apenas o JSX de retorno (linhas 60-152) pela composicao dos novos componentes:

```tsx
return (
  <div className="min-h-screen bg-background overflow-x-hidden">
    <LandingHero />
    <LandingProblem />
    <LandingSpaces />
    <LandingFeatures />
    <LandingMethod />
    <LandingAuthor />
    <LandingFAQ />
    <LandingCTA />
    <LandingFooter />
  </div>
);
```

### Secoes — Resumo Visual

| Secao | Layout | Elementos-chave |
|-------|--------|-----------------|
| 1. Hero | Centralizado, 100vh, gradiente radial | Logo, headline, 2 CTAs, seta bounce |
| 2. Problema | 60/40 texto+icones, empilha mobile | Titulo, paragrafos, composicao de icones |
| 3. Espacos | Grid 3/2/1 colunas | 5 cards com icone, nome, descricao, hover glow |
| 4. Ferramentas | Zigzag (icone alterna lado) | 3 blocos com bullets visuais (Check icon) |
| 5. Metodo | Timeline vertical com 6 passos | Numero circular + icone + titulo + descricao |
| 6. Autor | bg-elevated, avatar + texto | 3 cards de credibilidade + blockquote |
| 7. FAQ | Accordion centralizado | 5 perguntas com Radix Accordion |
| 8. CTA Final | Gradiente sutil, centralizado | Blockquote garantia, badge Shield, botao CTA |
| 9. Footer | Minimo, centralizado | Logo, links, copyright |

### Paleta e Tokens Utilizados
- Backgrounds: `bg-background`, `bg-card`, `bg-secondary`, `surface-elevated`
- Texto: `text-foreground`, `text-muted-foreground`
- Bordas: `border-border`
- Botoes: variantes `glow` e `outline` ja existentes
- Sem cores novas — tudo via tokens existentes

