

# Modal de detalhes do evento ao clicar no card

## O que será feito

Adicionar um `Dialog` (modal) que abre ao clicar em qualquer card de evento na página `/events`, exibindo a descrição completa e todos os detalhes do evento. Os botões de ação (Assistir, Participar, Acessar, Comprar) continuam funcionando normalmente sem abrir o modal.

## Mudanças

### Arquivo: `src/pages/Events.tsx`

1. **Importar** `Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription` de `@/components/ui/dialog`
2. **Adicionar estado** `selectedEvent` no componente `Events` para controlar qual evento está aberto no modal
3. **Tornar o card clicável**: envolver a área do card (exceto os botões de ação) com `cursor-pointer` e `onClick` que seta o `selectedEvent`
4. **Usar `e.stopPropagation()`** nos botões de ação para evitar que cliques nos botões abram o modal
5. **Renderizar o modal** com:
   - Imagem de capa (se existir)
   - Badges de tipo e modalidade
   - Título do evento
   - Descrição completa (sem `line-clamp`, texto integral)
   - Data/horário das sessões
   - Local
   - Máximo de participantes
   - Preço
   - Botões de ação (mesma lógica atual)

### Detalhes técnicos

- O `EventCard` receberá uma prop `onOpenDetail` callback
- Os botões de ação terão `e.stopPropagation()` para não disparar a abertura do modal
- O modal será responsivo: `max-w-lg` no mobile, `max-w-2xl` no desktop
- A descrição será exibida com `whitespace-pre-line` para respeitar quebras de linha

Nenhuma alteração em lógica de pagamento, checkout ou permissões.

