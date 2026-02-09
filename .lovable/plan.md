

# Melhorias Visuais e CTAs na Landing Page

## Resumo

Adicionar elementos visuais, carrossel de mockups, CTAs distribuidos, barra sticky e decoracoes ao longo da landing page existente. Nenhuma copy existente sera alterada, nenhuma funcionalidade fora da landing sera modificada.

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/landing/PhoneMockupCarousel.tsx` | Carrossel de screenshots da plataforma dentro de frame de celular |
| `src/components/landing/StickyBottomCTA.tsx` | Barra sticky no bottom com CTA que aparece apos o hero e some antes do CTA final |
| `src/components/landing/LandingSocialProof.tsx` | Barra de prova social entre Hero e Problema |
| `src/components/landing/GradientOrbs.tsx` | Componente decorativo de orbs com blur |

## Arquivos a Editar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/landing/LandingHero.tsx` | Adicionar PhoneMockupCarousel abaixo dos botoes |
| `src/components/landing/LandingSpaces.tsx` | Icones com circulo gradiente + CTA apos grid |
| `src/components/landing/LandingFeatures.tsx` | Elementos visuais decorativos por bloco + CTA apos secao |
| `src/components/landing/LandingMethod.tsx` | Animacao de highlight nos passos + CTA apos timeline |
| `src/components/landing/LandingAuthor.tsx` | Foto do Prof. Sandro + badges institucionais + CTA |
| `src/pages/Landing.tsx` | Adicionar StickyBottomCTA, LandingSocialProof e GradientOrbs |

## Imagens a Copiar para o Projeto

As 10 imagens fornecidas serao copiadas para `src/assets/landing/`:
- `image-48.png` a `image-53.png` (6 screenshots da plataforma para o carrossel)
- `imagem-7.png` (foto do Prof. Sandro)
- `image-54.png` (logo Fiocruz)
- `imagem-9.png` (logo CESAR School)
- `imagem-10.png` (logo IFCE)

---

## Detalhes por Secao

### 1. Hero - Carrossel de Mockups (PhoneMockupCarousel.tsx)

- Componente usando `embla-carousel-react` (ja instalado) com autoplay
- Frame de celular: `rounded-[2.5rem]` com borda `border-4 border-border`, aspect-ratio 9:19.5
- Perspectiva CSS no desktop: `perspective(1000px) rotateX(5deg)`
- No mobile: sem perspectiva, `max-w-[280px] mx-auto`
- Gradiente de fade na base: `bg-gradient-to-t from-background`
- Sombra glow: `shadow-[0_0_60px_rgba(255,255,255,0.08)]`
- 6 imagens em loop automatico com dots indicadores

### 2. Barra de Prova Social (LandingSocialProof.tsx)

- Entre Hero e Problema
- 3 metricas horizontais: "+500 profissionais", "5 Espacos tematicos", "Curadoria diaria"
- Layout: `flex justify-center gap-8` com separadores verticais
- Estilo sutil: texto muted, numeros em foreground bold

### 3. Espacos - Icones com Gradiente (LandingSpaces.tsx)

- Substituir o `div bg-secondary` do icone por circulo `w-16 h-16 rounded-full` com `bg-gradient-to-br from-foreground/20 to-foreground/5`
- Icone centralizado `w-7 h-7 text-foreground`
- Adicionar `hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]` nos cards
- Manter icones ja mapeados: Code2, Target, TrendingUp, Video, Heart
- CTA apos grid: texto muted + botao glow para `/register`

### 4. Ferramentas - Elementos Decorativos (LandingFeatures.tsx)

- Bloco IA: div relative com 3 icones em posicoes absolutas (Bot, Sparkles, MessageSquare) com `opacity-[0.08]`, tamanhos variados (w-12 a w-20), animacao CSS `animate-float` (keyframes translateY)
- Bloco Podcast: SVG de barras sonoras (4 retangulos verticais com alturas diferentes, cor foreground opacity 0.15, animacao pulse)
- Bloco Comunidade: 6 circulos pequenos (w-8 h-8) com gradientes variados representando avatares
- CTA apos secao: texto muted + botao glow para `/register`

### 5. Metodo MPS - Highlight Animado (LandingMethod.tsx)

- Adicionar `whileInView` animation no circulo do numero: scale de 0.8 para 1 com leve glow
- A linha vertical ja existe no componente atual
- CTA apos timeline: texto muted + botao outline para `/register`

### 6. Autor - Foto e Badges (LandingAuthor.tsx)

- Adicionar imagem do Prof. Sandro (`imagem-7.png`) em circulo `w-40 h-40 rounded-full` com borda gradiente (`ring-2 ring-foreground/20`)
- Posicionar acima dos 3 pilares, centralizado
- Badges horizontais abaixo da foto: 3 pills com logos das instituicoes (Fiocruz, CESAR, IFCE) como imagens `w-5 h-5` + texto, mais um badge "6 Livros Publicados"
- CTA apos blockquote: botao glow para `/register`

### 7. Sticky Bottom CTA (StickyBottomCTA.tsx)

- `fixed bottom-0 left-0 right-0 z-50`
- `bg-background/90 backdrop-blur-lg border-t border-border`
- Aparece apos scroll > 100vh (IntersectionObserver no hero)
- Desaparece quando secao CTA final entra no viewport
- Animacao slide-up com framer-motion
- Desktop: texto esquerda + botao direita em `flex justify-between`
- Mobile: `flex-col` com texto acima e botao full-width
- Botao X para fechar (dismiss permanente na sessao com useState)

### 8. Gradient Orbs Decorativos (GradientOrbs.tsx)

- 3 circulos desfocados em posicoes absolutas na pagina:
  - Atras do hero: topo central
  - Entre secoes 3-4: lateral esquerda
  - Antes do CTA final: lateral direita
- `w-[500px] h-[500px] bg-foreground/[0.04] blur-[120px] rounded-full absolute`
- Posicionados com `pointer-events-none` para nao afetar interacao
- CSS puro, zero impacto em performance

### 9. Landing.tsx - Composicao Final

Adicionar os novos componentes na composicao sem alterar ordem das secoes:

```
<GradientOrbs />
<LandingHero />        (com carrossel interno)
<LandingSocialProof />  (novo, entre hero e problema)
<LandingProblem />
<LandingSpaces />       (com CTA interno)
<LandingFeatures />     (com CTA interno)
<LandingMethod />       (com CTA interno)
<LandingAuthor />       (com foto + badges + CTA interno)
<LandingFAQ />
<LandingCTA />
<LandingFooter />
<StickyBottomCTA />     (novo, fixed)
```

---

## CSS Adicional

Adicionar no `src/index.css` a animacao `float` para os icones decorativos:

```css
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}
.animate-float {
  animation: float 3s ease-in-out infinite;
}
```

---

## Checklist

- [ ] Nenhuma copy existente alterada
- [ ] Nenhuma ordem de secao alterada
- [ ] Nenhum arquivo fora da landing modificado
- [ ] 6 screenshots no carrossel do hero
- [ ] 4 CTAs distribuidos (apos secoes 3, 4, 5, 6)
- [ ] Sticky CTA funcional com show/hide baseado em scroll
- [ ] Foto + badges na secao do autor
- [ ] Icones com gradiente nos espacos
- [ ] Elementos decorativos nas ferramentas
- [ ] Gradient orbs como decoracao global
- [ ] Barra de prova social entre hero e problema

