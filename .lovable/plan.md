

# Plano: Centralizar página de artigo no desktop

## Diagnóstico

Na linha 269 do `PostDetail.tsx`, o container desktop usa `lg:flex lg:px-10 lg:gap-12` mas não tem `max-width` nem `margin: auto`, fazendo o conteúdo ficar colado à esquerda em telas largas. Além disso, o `AppLayout` adiciona `lg:ml-56` para compensar a sidebar, mas o conteúdo do artigo não se centraliza dentro do espaço restante.

## Correção

Adicionar `lg:max-w-6xl lg:mx-auto` ao container flex principal (linha 269) para centralizar o layout de 3 colunas no espaço disponível. Isso alinha o artigo + sidebar direita ao centro da viewport.

### Arquivo impactado

| Arquivo | Alteração |
|---|---|
| `src/pages/PostDetail.tsx` | Adicionar `lg:max-w-6xl lg:mx-auto` na div container (linha 269) |

