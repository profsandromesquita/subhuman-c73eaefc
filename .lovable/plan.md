

# Plano: Correção de UX — Cards e página de detalhe de eventos

## Mudança 1: Cards da listagem (`src/pages/Events.tsx`)

**Remover do EventCard (linhas 81-86):**
- `EventActionButtons` e o wrapper `div` com `space-y-3`
- Import de `EventActionButtons` e `useEventActions` (linha 6)
- A prop `isPurchased` do `EventCard` (não é mais necessária)
- O hook `useUserEventPurchases` e `purchasedIds` (linhas 100-102) — só eram usados para alimentar os cards

**Substituir o rodapé do card por:**
```text
┌─────────────────────────────────┐
│ [Badge status]     Preço texto  │
└─────────────────────────────────┘
```

- Badge de status:
  - Sessions futuras → badge verde "Em breve"
  - Todas sessions passadas → badge cinza "Encerrado"
  - Sem sessions → nada
- Indicador de preço (texto, não botão):
  - `is_free` → "Gratuito" (texto verde)
  - `price > 0` → "R$ X,XX"
  - Senão → "Incluso no plano"

**Remover badge "Encerrado" duplicada** que já aparece na seção de badges (linha 59) — mover essa lógica para o rodapé apenas.

## Mudança 2: Página de detalhe (`src/pages/EventDetail.tsx`)

**Substituir bloco "Price + Actions" (linhas 181-187)** por lógica contextual direta:

1. Indicador de preço (manter como está)
2. Botões contextuais (sem usar `EventActionButtons`):
   - `meet_url` preenchido + NÃO encerrado → botão verde "Acessar ao Vivo" (ícone VideoCamera)
   - `youtube_url` preenchido + encerrado → botão outline "Assistir Gravação" (ícone Play)
   - `access_url` preenchido → botão "Acessar" (ícone ArrowSquareOut), verde se único, outline se há outros
   - Nenhum URL + encerrado → texto "Este evento foi encerrado"
   - Nenhum URL + não encerrado → texto "Aguarde informações de acesso"
3. Botões empilhados verticalmente, `w-full`, tamanho `default`

**Remover imports:** `EventActionButtons`, `useUserEventPurchases`, `isPurchased`

**Manter intacto:** MaterialCard, seção de materiais, skeleton, erro, metadata

## Arquivos alterados

- `src/pages/Events.tsx` — simplificar card
- `src/pages/EventDetail.tsx` — botões contextuais inline
- `src/components/events/EventActionButtons.tsx` — NÃO deletar, NÃO alterar

