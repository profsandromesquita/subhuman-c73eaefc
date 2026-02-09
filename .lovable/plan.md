

# Ajustes na Landing Page — 3 Correções

---

## 1. Carrossel do celular — imagem desproporcional

**Problema**: As imagens usam `object-cover object-top` dentro de um container com `aspect-ratio: 9/19.5`, cortando lateralmente o conteúdo das telas (texto escondido nas bordas).

**Correção no `PhoneMockupCarousel.tsx`**:
- Trocar `object-cover` por `object-contain` nas imagens para que a tela inteira fique visível dentro do frame
- Adicionar `bg-black` no slide para preencher espaço vazio ao redor caso a proporção não bata exatamente
- Manter `object-top` para alinhar pelo topo

**Arquivo**: `src/components/landing/PhoneMockupCarousel.tsx` (linha 53)

---

## 2. Foto do Prof. Sandro — de circular para retangular

**Problema**: Atualmente usa `rounded-full` (circular). O pedido é formato retangular seguindo o estilo da plataforma.

**Correção no `LandingAuthor.tsx`** (linhas 50-57):
- Trocar `w-40 h-40 rounded-full` por `w-48 h-56 rounded-xl` (retangular com cantos arredondados no padrão da plataforma)
- Manter `ring-2 ring-foreground/20` e `overflow-hidden`
- Adicionar transição hover sutil (`transition-transform duration-300 hover:scale-105`)

---

## 3. Substituir logos das instituições

**Ação**: Copiar as 3 novas imagens enviadas para `src/assets/landing/`, substituindo as existentes:
- `user-uploads://logo-fiocruz.png` → `src/assets/landing/logo-fiocruz.png`
- `user-uploads://logo-cesar-school.png` → `src/assets/landing/logo-cesar.png`
- `user-uploads://logo-ifce.png` → `src/assets/landing/logo-ifce.png`

Os imports no `LandingAuthor.tsx` já apontam para esses caminhos, então basta sobrescrever os arquivos.

---

## Resumo de Mudanças

| Arquivo | Ação |
|---------|------|
| `src/components/landing/PhoneMockupCarousel.tsx` | `object-cover` → `object-contain` + `bg-black` |
| `src/components/landing/LandingAuthor.tsx` | `rounded-full` → `rounded-xl`, dimensões retangulares |
| `src/assets/landing/logo-fiocruz.png` | Sobrescrever com nova imagem |
| `src/assets/landing/logo-cesar.png` | Sobrescrever com nova imagem |
| `src/assets/landing/logo-ifce.png` | Sobrescrever com nova imagem |

