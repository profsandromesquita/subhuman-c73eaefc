
# Tornar links clicáveis nos comentários

## Problema

O componente `MentionText` (usado para renderizar o texto de comentários em Artigos, Podcasts e Canais) atualmente só trata menções (`@Nome`). Qualquer URL colada no comentário é renderizada como texto simples, sem ser clicável.

## Solução

Alterar o componente `MentionText.tsx` para, além de detectar menções, também detectar URLs no texto e renderizá-las como links `<a>` com `target="_blank"` e `rel="noopener noreferrer"`.

## Alteração única

### Arquivo: `src/components/post/MentionText.tsx`

- Atualizar a lógica de parsing na linha 95-112 para usar uma regex combinada que detecta tanto menções (`@Nome`) quanto URLs (`https://...` ou `http://...`)
- URLs detectadas serão renderizadas como:
  ```tsx
  <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">
    {url}
  </a>
  ```
- Menções continuam funcionando exatamente como hoje
- Texto normal permanece como `<span>`

Como o `MentionText` é o componente usado pelo `CommentItem`, que por sua vez é usado nas 3 áreas (Artigos/Espaços, Podcasts e Canais), a correção em um único arquivo resolve todos os contextos.
