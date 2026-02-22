

# Adicionar Atalho de Mensagens na Home

## O que sera feito

Adicionar um icone de mensagens (ChatCircle ou Envelope) na barra superior da Home, posicionado entre o icone de Salvos (BookmarkSimple) e o de Notificacoes (Bell), seguindo o mesmo padrao visual. O icone mostrara um badge com a contagem de mensagens nao lidas e, ao clicar, direcionara para `/messages`.

## Alteracao

### Arquivo: `src/pages/Home.tsx`

1. Importar o hook `useUnreadMessagesCount` de `@/hooks/useMessages`
2. Importar o icone `Envelope` de `@phosphor-icons/react` (semanticamente mais claro para mensagens diretas, diferenciando do `ChatCircle` ja usado para comentarios)
3. Chamar `useUnreadMessagesCount()` no componente
4. Adicionar o botao entre o BookmarkSimple e o Bell, com o mesmo estilo e badge identico ao das notificacoes

Layout do header ficara assim:

```text
[Salvos] [Mensagens] [Notificacoes]          [Logo]
```

O badge seguira exatamente o mesmo padrao visual do badge de notificacoes (posicao, tamanho, fonte, cores).

## Detalhes tecnicos

- Hook `useUnreadMessagesCount` ja existe em `src/hooks/useMessages.ts` e retorna a contagem de mensagens nao lidas
- O icone usara `weight="fill"` quando houver mensagens nao lidas (mesmo padrao do Bell)
- Nenhuma alteracao de banco de dados necessaria
- Apenas o arquivo `Home.tsx` sera modificado
