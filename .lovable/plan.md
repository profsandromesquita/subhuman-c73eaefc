

# Corrigir espaço morto no frame do celular

## Problema

O frame do celular usa `aspect-ratio: 9/19.5` que é mais alto do que as screenshots reais. Isso cria um espaço preto vazio abaixo da barra de navegação inferior das imagens.

## Solução

No arquivo `src/components/landing/PhoneMockupCarousel.tsx` (linha 48):

- Alterar o aspect-ratio de `9/19.5` para `9/18` (proporção mais compatível com telas reais de celular)
- Isso elimina o espaço morto inferior, fazendo a imagem preencher corretamente o frame

## Arquivo alterado

| Arquivo | Mudança |
|---------|---------|
| `src/components/landing/PhoneMockupCarousel.tsx` | `aspectRatio: "9/19.5"` → `aspectRatio: "9/18"` |

